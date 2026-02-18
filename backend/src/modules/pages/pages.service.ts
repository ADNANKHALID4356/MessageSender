import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FacebookApiService } from '../facebook/facebook-api.service';
import { EncryptionService } from '../../common/encryption.service';
import { UpdatePageDto, PageStatsDto } from './dto';

@Injectable()
export class PagesService {
  private readonly logger = new Logger(PagesService.name);

  constructor(
    private prisma: PrismaService,
    private fbApi: FacebookApiService,
    private encryption: EncryptionService,
  ) {}

  /**
   * Get all pages for a workspace
   */
  async findByWorkspace(workspaceId: string) {
    return this.prisma.page.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get page by ID
   */
  async findById(id: string) {
    const page = await this.prisma.page.findUnique({
      where: { id },
    });

    if (!page) {
      throw new NotFoundException(`Page with ID ${id} not found`);
    }

    return page;
  }

  /**
   * Get page by Facebook Page ID
   */
  async findByPageId(pageId: string) {
    return this.prisma.page.findFirst({
      where: { fbPageId: pageId },
    });
  }

  /**
   * Update page settings
   */
  async update(id: string, workspaceId: string, dto: UpdatePageDto) {
    const page = await this.prisma.page.findFirst({
      where: { id, workspaceId },
    });

    if (!page) {
      throw new NotFoundException(`Page not found in this workspace`);
    }

    return this.prisma.page.update({
      where: { id },
      data: {
        welcomeMessage: dto.welcomeMessage,
        awayMessage: dto.awayMessage,
        isActive: dto.isActive,
        settings: dto.settings ? JSON.stringify(dto.settings) : undefined,
      },
    });
  }

  /**
   * Deactivate a page (soft delete)
   */
  async deactivate(id: string, workspaceId: string) {
    const page = await this.prisma.page.findFirst({
      where: { id, workspaceId },
    });

    if (!page) {
      throw new NotFoundException(`Page not found in this workspace`);
    }

    // Unsubscribe from webhook
    try {
      await this.fbApi.unsubscribePageFromWebhook(page.fbPageId, this.encryption.decryptIfNeeded(page.accessToken));
    } catch (error) {
      this.logger.warn(`Failed to unsubscribe page ${page.fbPageId} from webhook:`, error);
    }

    return this.prisma.page.update({
      where: { id },
      data: { isActive: false, webhookSubscribed: false },
    });
  }

  /**
   * Reactivate a page
   */
  async reactivate(id: string, workspaceId: string) {
    const page = await this.prisma.page.findFirst({
      where: { id, workspaceId, isActive: false },
    });

    if (!page) {
      throw new NotFoundException(`Inactive page not found in this workspace`);
    }

    // Re-subscribe to webhook
    let webhookActive = false;
    try {
      webhookActive = await this.fbApi.subscribePageToWebhook(
        page.fbPageId,
        this.encryption.decryptIfNeeded(page.accessToken)
      );
    } catch (error) {
      this.logger.warn(`Failed to subscribe page ${page.fbPageId} to webhook:`, error);
    }

    return this.prisma.page.update({
      where: { id },
      data: { isActive: true, webhookSubscribed: webhookActive },
    });
  }
  /**
   * Get page statistics
   */
  async getStats(id: string, workspaceId: string): Promise<PageStatsDto> {
    const page = await this.prisma.page.findFirst({
      where: { id, workspaceId },
    });

    if (!page) {
      throw new NotFoundException(`Page not found in this workspace`);
    }

    const [
      totalConversations,
      activeConversations,
      messageStats,
      totalContacts,
    ] = await Promise.all([
      this.prisma.conversation.count({
        where: { pageId: page.id },
      }),
      this.prisma.conversation.count({
        where: { pageId: page.id, status: 'OPEN' },
      }),
      this.prisma.message.groupBy({
        by: ['direction'],
        where: {
          conversation: { pageId: page.id },
        },
        _count: true,
      }),
      this.prisma.contact.count({
        where: {
          conversations: {
            some: { pageId: page.id },
          },
        },
      }),
    ]);

    const inbound = messageStats.find((s: { direction: string; _count: number }) => s.direction === 'INBOUND')?._count || 0;
    const outbound = messageStats.find((s: { direction: string; _count: number }) => s.direction === 'OUTBOUND')?._count || 0;

    return {
      totalConversations,
      activeConversations,
      totalMessages: inbound + outbound,
      inboundMessages: inbound,
      outboundMessages: outbound,
      totalContacts,
    };
  }

  /**
   * Check webhook status and resubscribe if needed
   */
  async checkAndFixWebhook(id: string): Promise<{ fixed: boolean; status: boolean }> {
    const page = await this.prisma.page.findUnique({
      where: { id },
    });

    if (!page) {
      throw new NotFoundException(`Page not found`);
    }

    // Try to subscribe
    const subscribed = await this.fbApi.subscribePageToWebhook(
      page.fbPageId,
      this.encryption.decryptIfNeeded(page.accessToken)
    );

    if (subscribed !== page.webhookSubscribed) {
      await this.prisma.page.update({
        where: { id },
        data: { webhookSubscribed: subscribed },
      });
    }

    return {
      fixed: subscribed !== page.webhookSubscribed,
      status: subscribed,
    };
  }

  /**
   * Get page with full details
   */
  async getPageWithDetails(id: string) {
    const page = await this.prisma.page.findUnique({
      where: { id },
      include: {
        facebookAccount: {
          select: {
            id: true,
            fbUserId: true,
            fbUserName: true,
          },
        },
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            conversations: true,
          },
        },
      },
    });

    if (!page) {
      throw new NotFoundException(`Page not found`);
    }

    return page;
  }

  /**
   * Validate page access token
   */
  async validateToken(id: string): Promise<{
    valid: boolean;
    expiresAt?: number;
    scopes?: string[];
  }> {
    const page = await this.prisma.page.findUnique({
      where: { id },
    });

    if (!page) {
      throw new NotFoundException(`Page not found`);
    }

    const tokenInfo = await this.fbApi.debugToken(this.encryption.decryptIfNeeded(page.accessToken));

    return {
      valid: tokenInfo.is_valid,
      expiresAt: tokenInfo.expires_at,
      scopes: tokenInfo.scopes,
    };
  }

  /**
   * Sync page info from Facebook
   */
  async syncPageInfo(id: string) {
    const page = await this.prisma.page.findUnique({
      where: { id },
    });

    if (!page) {
      throw new NotFoundException(`Page not found`);
    }

    const pageInfo = await this.fbApi.getPageInfo(page.fbPageId, this.encryption.decryptIfNeeded(page.accessToken));

    return this.prisma.page.update({
      where: { id },
      data: {
        name: pageInfo.name,
        category: pageInfo.category,
        profilePictureUrl: pageInfo.picture?.data?.url,
      },
    });
  }
}
