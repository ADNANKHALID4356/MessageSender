import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FacebookService } from './facebook.service';
import { FacebookApiService } from './facebook-api.service';
import { FacebookConfigService } from './facebook-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { EncryptionService } from '../../common/encryption.service';

describe('FacebookService', () => {
  let service: FacebookService;
  let fbApi: FacebookApiService;
  let redis: RedisService;

  const mockWorkspace = {
    id: 'workspace-1',
    name: 'Test Workspace',
    isActive: true,
  };

  const mockFacebookAccount = {
    id: 'fb-account-1',
    workspaceId: 'workspace-1',
    facebookUserId: 'fb-user-123',
    accessToken: 'mock-token',
    tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    name: 'Test User',
    email: 'test@example.com',
    pages: [],
  };

  const mockPage = {
    id: 'page-1',
    workspaceId: 'workspace-1',
    facebookAccountId: 'fb-account-1',
    pageId: 'fb-page-123',
    pageName: 'Test Page',
    pageAccessToken: 'page-token',
    isActive: true,
    isWebhookActive: true,
  };

  const mockPrismaService = {
    workspace: {
      findUnique: jest.fn(),
    },
    facebookAccount: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    page: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockFbApiService = {
    exchangeCodeForToken: jest.fn(),
    getLongLivedToken: jest.fn(),
    getUserInfo: jest.fn(),
    getUserPages: jest.fn(),
    getPageAccessToken: jest.fn(),
    subscribePageToWebhook: jest.fn(),
    unsubscribePageFromWebhook: jest.fn(),
    getPageInfo: jest.fn(),
    debugToken: jest.fn(),
  };

  const mockFbConfigService = {
    appId: 'test-app-id',
    appSecret: 'test-app-secret',
    apiVersion: 'v18.0',
    scopes: ['pages_messaging', 'pages_manage_metadata'],
    buildAuthUrl: jest.fn().mockReturnValue('https://facebook.com/oauth'),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3001'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FacebookService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: FacebookApiService, useValue: mockFbApiService },
        { provide: FacebookConfigService, useValue: mockFbConfigService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EncryptionService, useValue: { encrypt: jest.fn((v) => v), decrypt: jest.fn((v) => v), encryptIfNeeded: jest.fn((v) => v), decryptIfNeeded: jest.fn((v) => v) } },
      ],
    }).compile();

    service = module.get<FacebookService>(FacebookService);
    fbApi = module.get<FacebookApiService>(FacebookApiService);
    redis = module.get<RedisService>(RedisService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initiateOAuth', () => {
    it('should return authorization URL', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(mockWorkspace);
      mockPrismaService.facebookAccount.findFirst.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(true);

      const result = await service.initiateOAuth(
        { workspaceId: 'workspace-1' },
        'user-1'
      );

      expect(result).toBe('https://facebook.com/oauth');
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should throw error if workspace not found', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(null);

      await expect(
        service.initiateOAuth({ workspaceId: 'invalid' }, 'user-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if workspace already has Facebook account', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(mockWorkspace);
      mockPrismaService.facebookAccount.findFirst.mockResolvedValue(mockFacebookAccount);

      await expect(
        service.initiateOAuth({ workspaceId: 'workspace-1' }, 'user-1')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleCallback', () => {
    it('should process OAuth callback and create Facebook account', async () => {
      const mockState = JSON.stringify({
        workspaceId: 'workspace-1',
        userId: 'user-1',
        createdAt: Date.now(),
      });

      mockRedisService.get.mockResolvedValue(mockState);
      mockFbApiService.exchangeCodeForToken.mockResolvedValue({
        access_token: 'short-token',
      });
      mockFbApiService.getLongLivedToken.mockResolvedValue({
        access_token: 'long-token',
        expires_in: 5184000,
      });
      mockFbApiService.getUserInfo.mockResolvedValue({
        id: 'fb-user-123',
        name: 'Test User',
        email: 'test@example.com',
      });
      mockFbApiService.getUserPages.mockResolvedValue([
        { id: 'page-1', name: 'Page 1' },
      ]);
      mockPrismaService.facebookAccount.create.mockResolvedValue({
        id: 'fb-account-1',
        facebookUserId: 'fb-user-123',
      });

      const result = await service.handleCallback('auth-code', 'state-token');

      expect(result.success).toBe(true);
      expect(result.workspaceId).toBe('workspace-1');
      expect(mockRedisService.del).toHaveBeenCalled();
    });

    it('should throw error for invalid state', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(
        service.handleCallback('auth-code', 'invalid-state')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAvailablePages', () => {
    it('should return available pages', async () => {
      mockPrismaService.facebookAccount.findUnique.mockResolvedValue(mockFacebookAccount);
      mockFbApiService.getUserPages.mockResolvedValue([
        { id: 'page-1', name: 'Page 1', category: 'Business' },
        { id: 'page-2', name: 'Page 2', category: 'Brand' },
      ]);
      mockPrismaService.page.findMany.mockResolvedValue([
        { fbPageId: 'page-1' },
      ]);

      const result = await service.getAvailablePages('fb-account-1');

      expect(result).toHaveLength(2);
      expect(result[0].isConnected).toBe(true);
      expect(result[1].isConnected).toBe(false);
    });

    it('should throw error if account not found', async () => {
      mockPrismaService.facebookAccount.findUnique.mockResolvedValue(null);

      await expect(
        service.getAvailablePages('invalid-id')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('connectPage', () => {
    it('should connect a page to workspace', async () => {
      mockPrismaService.facebookAccount.findUnique.mockResolvedValue({
        ...mockFacebookAccount,
        workspaceId: 'workspace-1',
      });
      mockPrismaService.page.findFirst.mockResolvedValue(null);
      mockFbApiService.getPageAccessToken.mockResolvedValue('page-token');
      mockFbApiService.subscribePageToWebhook.mockResolvedValue(true);
      mockFbApiService.getPageInfo.mockResolvedValue({
        category: 'Business',
        picture: { data: { url: 'http://example.com/pic.jpg' } },
      });
      mockPrismaService.page.create.mockResolvedValue(mockPage);

      const result = await service.connectPage('workspace-1', {
        facebookAccountId: 'fb-account-1',
        pageId: 'fb-page-123',
        pageName: 'Test Page',
      });

      expect(result).toEqual(mockPage);
    });

    it('should throw error if page already connected', async () => {
      mockPrismaService.facebookAccount.findUnique.mockResolvedValue({
        ...mockFacebookAccount,
        workspaceId: 'workspace-1',
      });
      mockPrismaService.page.findFirst.mockResolvedValue(mockPage);

      await expect(
        service.connectPage('workspace-1', {
          facebookAccountId: 'fb-account-1',
          pageId: 'fb-page-123',
          pageName: 'Test Page',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('disconnectPage', () => {
    it('should disconnect a page', async () => {
      mockPrismaService.page.findFirst.mockResolvedValue(mockPage);
      mockFbApiService.unsubscribePageFromWebhook.mockResolvedValue(true);
      mockPrismaService.page.update.mockResolvedValue({ ...mockPage, isActive: false });

      const result = await service.disconnectPage('workspace-1', 'page-1');

      expect(result.success).toBe(true);
    });

    it('should throw error if page not found', async () => {
      mockPrismaService.page.findFirst.mockResolvedValue(null);

      await expect(
        service.disconnectPage('workspace-1', 'invalid-page')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connection status for connected workspace', async () => {
      mockPrismaService.facebookAccount.findFirst.mockResolvedValue({
        ...mockFacebookAccount,
        pages: [mockPage],
      });
      mockFbApiService.debugToken.mockResolvedValue({ is_valid: true });

      const result = await service.getConnectionStatus('workspace-1');

      expect(result.connected).toBe(true);
      expect(result.account).not.toBeNull();
      expect(result.pages).toHaveLength(1);
    });

    it('should return not connected status', async () => {
      mockPrismaService.facebookAccount.findFirst.mockResolvedValue(null);

      const result = await service.getConnectionStatus('workspace-1');

      expect(result.connected).toBe(false);
      expect(result.account).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should refresh token', async () => {
      mockPrismaService.facebookAccount.findUnique.mockResolvedValue(mockFacebookAccount);
      mockFbApiService.debugToken.mockResolvedValue({ is_valid: true });
      mockFbApiService.getLongLivedToken.mockResolvedValue({
        access_token: 'new-token',
        expires_in: 5184000,
      });
      mockPrismaService.facebookAccount.update.mockResolvedValue({});

      const result = await service.refreshToken('fb-account-1');

      expect(result.success).toBe(true);
    });

    it('should throw error if token invalid', async () => {
      mockPrismaService.facebookAccount.findUnique.mockResolvedValue(mockFacebookAccount);
      mockFbApiService.debugToken.mockResolvedValue({ is_valid: false });

      await expect(
        service.refreshToken('fb-account-1')
      ).rejects.toThrow(BadRequestException);
    });
  });
});
