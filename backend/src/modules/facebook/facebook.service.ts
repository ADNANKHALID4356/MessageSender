import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { FacebookApiService } from './facebook-api.service';
import { FacebookConfigService } from './facebook-config.service';
import { InitiateOAuthDto, ConnectPageDto } from './dto';
import { EncryptionService } from '../../common/encryption.service';
import { v4 as uuidv4 } from 'uuid';

const OAUTH_STATE_PREFIX = 'fb_oauth:';
const OAUTH_STATE_TTL = 600; // 10 minutes

interface OAuthState {
  workspaceId: string;
  userId: string;
  redirectUrl?: string;
  createdAt: number;
}

@Injectable()
export class FacebookService {
  private readonly logger = new Logger(FacebookService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private fbApi: FacebookApiService,
    private fbConfig: FacebookConfigService,
    private configService: ConfigService,
    private encryption: EncryptionService
  ) {}

  /**
   * Initiate OAuth flow - generate authorization URL
   */
  async initiateOAuth(dto: InitiateOAuthDto, userId: string): Promise<string> {
    // Verify workspace exists
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: dto.workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace ${dto.workspaceId} not found`);
    }

    // Check if workspace already has a Facebook account
    const existingAccount = await this.prisma.facebookAccount.findFirst({
      where: { workspaceId: dto.workspaceId },
    });

    if (existingAccount) {
      throw new BadRequestException(
        'Workspace already has a connected Facebook account. Disconnect first.'
      );
    }

    // Generate state token
    const stateToken = uuidv4();
    const state: OAuthState = {
      workspaceId: dto.workspaceId,
      userId,
      redirectUrl: dto.redirectUrl,
      createdAt: Date.now(),
    };

    // Store state in Redis
    await this.redis.set(
      `${OAUTH_STATE_PREFIX}${stateToken}`,
      JSON.stringify(state),
      OAUTH_STATE_TTL
    );

    // Build authorization URL
    const redirectUri = this.getOAuthRedirectUri();
    const authUrl = this.fbConfig.buildAuthUrl(redirectUri, stateToken);

    return authUrl;
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(code: string, state: string): Promise<{
    success: boolean;
    workspaceId: string;
    redirectUrl?: string;
    facebookAccountId?: string;
    pages?: { id: string; name: string }[];
  }> {
    // Verify state
    const stateKey = `${OAUTH_STATE_PREFIX}${state}`;
    const stateJson = await this.redis.get(stateKey);

    if (!stateJson) {
      throw new BadRequestException('Invalid or expired OAuth state');
    }

    const oauthState: OAuthState = JSON.parse(stateJson);

    // Delete state from Redis
    await this.redis.del(stateKey);

    const redirectUri = this.getOAuthRedirectUri();

    // Exchange code for token
    const tokenResponse = await this.fbApi.exchangeCodeForToken(code, redirectUri);

    // Get long-lived token
    const longLivedToken = await this.fbApi.getLongLivedToken(tokenResponse.access_token);

    // Get user info
    const userInfo = await this.fbApi.getUserInfo(longLivedToken.access_token);

    // Get managed pages
    const pages = await this.fbApi.getUserPages(longLivedToken.access_token);

    // Calculate token expiry (usually 60 days for long-lived tokens)
    const expiresAt = longLivedToken.expires_in
      ? new Date(Date.now() + longLivedToken.expires_in * 1000)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // Default 60 days

    // Store Facebook account
    const facebookAccount = await this.prisma.facebookAccount.create({
      data: {
        workspaceId: oauthState.workspaceId,
        fbUserId: userInfo.id,
        fbUserName: userInfo.name,
        accessToken: this.encryption.encrypt(longLivedToken.access_token),
        tokenExpiresAt: expiresAt,
      },
    });

    this.logger.log(
      `Facebook account ${userInfo.id} connected to workspace ${oauthState.workspaceId}`
    );

    return {
      success: true,
      workspaceId: oauthState.workspaceId,
      redirectUrl: oauthState.redirectUrl,
      facebookAccountId: facebookAccount.id,
      pages: pages.map((p) => ({ id: p.id, name: p.name })),
    };
  }

  /**
   * Get available pages for a Facebook account
   */
  async getAvailablePages(facebookAccountId: string) {
    const account = await this.prisma.facebookAccount.findUnique({
      where: { id: facebookAccountId },
    });

    if (!account) {
      throw new NotFoundException('Facebook account not found');
    }

    const pages = await this.fbApi.getUserPages(this.encryption.decryptIfNeeded(account.accessToken));

    // Get already connected page IDs
    const connectedPages = await this.prisma.page.findMany({
      where: { facebookAccountId },
      select: { fbPageId: true },
    });

    const connectedPageIds = new Set(connectedPages.map((p) => p.fbPageId));

    return pages.map((page) => ({
      id: page.id,
      name: page.name,
      category: page.category,
      picture: page.picture?.data?.url,
      isConnected: connectedPageIds.has(page.id),
    }));
  }

  /**
   * Connect a Facebook page to the workspace
   */
  async connectPage(workspaceId: string, dto: ConnectPageDto) {
    const account = await this.prisma.facebookAccount.findUnique({
      where: { id: dto.facebookAccountId },
    });

    if (!account || account.workspaceId !== workspaceId) {
      throw new NotFoundException('Facebook account not found in this workspace');
    }

    // Check if page is already connected
    const existingPage = await this.prisma.page.findFirst({
      where: { fbPageId: dto.pageId },
    });

    if (existingPage) {
      throw new BadRequestException('Page is already connected');
    }

    // Get page access token (never expires)
    const pageAccessToken = await this.fbApi.getPageAccessToken(
      dto.pageId,
      this.encryption.decryptIfNeeded(account.accessToken)
    );

    // Subscribe page to webhook
    const subscribed = await this.fbApi.subscribePageToWebhook(
      dto.pageId,
      pageAccessToken
    );

    if (!subscribed) {
      this.logger.warn(
        `Failed to subscribe page ${dto.pageId} to webhook. Messages may not be received.`
      );
    }

    // Get additional page info
    const pageInfo = await this.fbApi.getPageInfo(dto.pageId, pageAccessToken);

    // Create page record
    const page = await this.prisma.page.create({
      data: {
        workspaceId,
        facebookAccountId: dto.facebookAccountId,
        fbPageId: dto.pageId,
        name: dto.pageName,
        accessToken: this.encryption.encrypt(pageAccessToken),
        category: pageInfo.category,
        profilePictureUrl: pageInfo.picture?.data?.url,
        webhookSubscribed: subscribed,
      },
    });

    this.logger.log(`Page ${dto.pageName} (${dto.pageId}) connected to workspace ${workspaceId}`);

    return page;
  }

  /**
   * Disconnect a Facebook page
   */
  async disconnectPage(workspaceId: string, pageId: string) {
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, workspaceId },
    });

    if (!page) {
      throw new NotFoundException('Page not found in this workspace');
    }

    // Unsubscribe from webhook
    await this.fbApi.unsubscribePageFromWebhook(page.fbPageId, this.encryption.decryptIfNeeded(page.accessToken));

    // Soft delete - deactivate the page
    await this.prisma.page.update({
      where: { id: pageId },
      data: { isActive: false },
    });

    this.logger.log(`Page ${page.name} disconnected from workspace ${workspaceId}`);

    return { success: true };
  }

  /**
   * Disconnect Facebook account from workspace
   */
  async disconnectAccount(workspaceId: string) {
    const account = await this.prisma.facebookAccount.findFirst({
      where: { workspaceId },
    });

    if (!account) {
      throw new NotFoundException('No Facebook account connected to this workspace');
    }

    // Unsubscribe all pages from webhook
    const pages = await this.prisma.page.findMany({
      where: { facebookAccountId: account.id, isActive: true },
    });

    for (const page of pages) {
      await this.fbApi.unsubscribePageFromWebhook(page.fbPageId, this.encryption.decryptIfNeeded(page.accessToken));
    }

    // Delete account (cascades to pages)
    await this.prisma.facebookAccount.delete({
      where: { id: account.id },
    });

    this.logger.log(`Facebook account disconnected from workspace ${workspaceId}`);

    return { success: true };
  }

  /**
   * Refresh token for a Facebook account
   */
  async refreshToken(facebookAccountId: string) {
    const account = await this.prisma.facebookAccount.findUnique({
      where: { id: facebookAccountId },
    });

    if (!account) {
      throw new NotFoundException('Facebook account not found');
    }

    // Check if token is still valid
    const decryptedToken = this.encryption.decryptIfNeeded(account.accessToken);
    const tokenInfo = await this.fbApi.debugToken(decryptedToken);

    if (!tokenInfo.is_valid) {
      throw new BadRequestException(
        'Token is no longer valid. User needs to re-authenticate.'
      );
    }

    // Try to get a new long-lived token
    const newToken = await this.fbApi.getLongLivedToken(decryptedToken);

    const expiresAt = newToken.expires_in
      ? new Date(Date.now() + newToken.expires_in * 1000)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    await this.prisma.facebookAccount.update({
      where: { id: facebookAccountId },
      data: {
        accessToken: this.encryption.encrypt(newToken.access_token),
        tokenExpiresAt: expiresAt,
      },
    });

    this.logger.log(`Token refreshed for Facebook account ${facebookAccountId}`);

    return { success: true, expiresAt };
  }

  /**
   * Get workspace Facebook connection status
   */
  async getConnectionStatus(workspaceId: string) {
    const account = await this.prisma.facebookAccount.findFirst({
      where: { workspaceId },
      include: {
        pages: {
          where: { isActive: true },
        },
      },
    });

    if (!account) {
      return {
        connected: false,
        account: null,
        pages: [],
      };
    }

    // Check token validity
    const tokenInfo = await this.fbApi.debugToken(this.encryption.decryptIfNeeded(account.accessToken));

    return {
      connected: true,
      account: {
        id: account.id,
        facebookUserId: account.fbUserId,
        name: account.fbUserName,
        tokenValid: tokenInfo.is_valid,
        tokenExpiresAt: account.tokenExpiresAt,
      },
      pages: account.pages.map((p) => ({
        id: p.id,
        pageId: p.fbPageId,
        name: p.name,
        picture: p.profilePictureUrl,
        isWebhookActive: p.webhookSubscribed,
      })),
    };
  }

  /**
   * Get OAuth redirect URI based on environment
   */
  private getOAuthRedirectUri(): string {
    const baseUrl = this.configService.get<string>(
      'API_BASE_URL',
      'http://localhost:4000'
    );
    return `${baseUrl}/api/v1/facebook/callback`;
  }

  /**
   * [DEV ONLY] Create a mock Facebook connection for testing
   */
  async createMockConnection(workspaceId: string, userId: string) {
    this.logger.log(`Creating mock Facebook connection for workspace ${workspaceId}`);

    // Check if workspace exists
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace ${workspaceId} not found`);
    }

    // Check if already connected
    const existing = await this.prisma.facebookAccount.findFirst({
      where: { workspaceId },
    });

    if (existing) {
      throw new BadRequestException('Workspace already has a Facebook connection');
    }

    // Create mock Facebook account
    const mockAccount = await this.prisma.facebookAccount.create({
      data: {
        workspaceId,
        fbUserId: `mock_user_${Date.now()}`,
        fbUserName: 'Mock Facebook User',
        accessToken: 'mock_access_token_' + Math.random().toString(36),
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      },
    });

    // Create mock pages
    const mockPages = [
      { name: 'Mock Page 1', pageId: `mock_page_1_${Date.now()}`, category: 'Business' },
      { name: 'Mock Page 2', pageId: `mock_page_2_${Date.now()}`, category: 'Community' },
      { name: 'Mock Page 3', pageId: `mock_page_3_${Date.now()}`, category: 'Brand' },
    ];

    const createdPages = [];
    for (const mockPage of mockPages) {
      const page = await this.prisma.page.create({
        data: {
          workspaceId,
          facebookAccountId: mockAccount.id,
          fbPageId: mockPage.pageId,
          name: mockPage.name,
          category: mockPage.category,
          accessToken: 'mock_page_token_' + Math.random().toString(36),
          tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
      });
      createdPages.push(page);
    }

    this.logger.log(`Created mock account with ${createdPages.length} pages`);

    return {
      success: true,
      facebookAccountId: mockAccount.id,
      account: {
        id: mockAccount.id,
        facebookUserId: mockAccount.fbUserId,
        name: mockAccount.fbUserName,
        tokenExpiresAt: mockAccount.tokenExpiresAt,
      },
      pages: createdPages.map(p => ({
        id: p.id,
        pageId: p.fbPageId,
        name: p.name,
        category: p.category,
      })),
    };
  }
}
