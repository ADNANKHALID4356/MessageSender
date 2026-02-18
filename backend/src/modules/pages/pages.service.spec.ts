import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PagesService } from './pages.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FacebookApiService } from '../facebook/facebook-api.service';
import { EncryptionService } from '../../common/encryption.service';

describe('PagesService', () => {
  let service: PagesService;

  const mockPage = {
    id: 'page-1',
    workspaceId: 'workspace-1',
    facebookAccountId: 'fb-account-1',
    pageId: 'fb-page-123',
    pageName: 'Test Page',
    pageAccessToken: 'page-token',
    category: 'Business',
    picture: 'http://example.com/pic.jpg',
    welcomeMessage: 'Welcome!',
    awayMessage: 'We are away',
    isActive: true,
    isWebhookActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    page: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    conversation: {
      count: jest.fn(),
    },
    contact: {
      count: jest.fn(),
    },
    message: {
      groupBy: jest.fn(),
    },
  };

  const mockFbApiService = {
    subscribePageToWebhook: jest.fn(),
    unsubscribePageFromWebhook: jest.fn(),
    debugToken: jest.fn(),
    getPageInfo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: FacebookApiService, useValue: mockFbApiService },
        { provide: EncryptionService, useValue: { encrypt: jest.fn((v) => v), decrypt: jest.fn((v) => v), encryptIfNeeded: jest.fn((v) => v), decryptIfNeeded: jest.fn((v) => v) } },
      ],
    }).compile();

    service = module.get<PagesService>(PagesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByWorkspace', () => {
    it('should return pages for workspace', async () => {
      mockPrismaService.page.findMany.mockResolvedValue([mockPage]);

      const result = await service.findByWorkspace('workspace-1');

      expect(result).toEqual([mockPage]);
      expect(mockPrismaService.page.findMany).toHaveBeenCalledWith({
        where: { workspaceId: 'workspace-1', isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findById', () => {
    it('should return page by id', async () => {
      mockPrismaService.page.findUnique.mockResolvedValue(mockPage);

      const result = await service.findById('page-1');

      expect(result).toEqual(mockPage);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.page.findUnique.mockResolvedValue(null);

      await expect(service.findById('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByPageId', () => {
    it('should return page by Facebook page id', async () => {
      mockPrismaService.page.findFirst.mockResolvedValue(mockPage);

      const result = await service.findByPageId('fb-page-123');

      expect(result).toEqual(mockPage);
    });
  });

  describe('update', () => {
    it('should update page settings', async () => {
      mockPrismaService.page.findFirst.mockResolvedValue(mockPage);
      mockPrismaService.page.update.mockResolvedValue({
        ...mockPage,
        welcomeMessage: 'New Welcome!',
      });

      const result = await service.update('page-1', 'workspace-1', {
        welcomeMessage: 'New Welcome!',
      });

      expect(result.welcomeMessage).toBe('New Welcome!');
    });

    it('should throw if page not in workspace', async () => {
      mockPrismaService.page.findFirst.mockResolvedValue(null);

      await expect(
        service.update('page-1', 'wrong-workspace', {})
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('should deactivate page', async () => {
      mockPrismaService.page.findFirst.mockResolvedValue(mockPage);
      mockFbApiService.unsubscribePageFromWebhook.mockResolvedValue(true);
      mockPrismaService.page.update.mockResolvedValue({
        ...mockPage,
        isActive: false,
        isWebhookActive: false,
      });

      const result = await service.deactivate('page-1', 'workspace-1');

      expect(result.isActive).toBe(false);
      expect(mockFbApiService.unsubscribePageFromWebhook).toHaveBeenCalled();
    });
  });

  describe('reactivate', () => {
    it('should reactivate page', async () => {
      mockPrismaService.page.findFirst.mockResolvedValue({
        ...mockPage,
        isActive: false,
      });
      mockFbApiService.subscribePageToWebhook.mockResolvedValue(true);
      mockPrismaService.page.update.mockResolvedValue({
        ...mockPage,
        isActive: true,
        isWebhookActive: true,
      });

      const result = await service.reactivate('page-1', 'workspace-1');

      expect(result.isActive).toBe(true);
      expect(mockFbApiService.subscribePageToWebhook).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return page statistics', async () => {
      mockPrismaService.page.findFirst.mockResolvedValue(mockPage);
      mockPrismaService.conversation.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(20);
      mockPrismaService.message.groupBy.mockResolvedValue([
        { direction: 'INBOUND', _count: 500 },
        { direction: 'OUTBOUND', _count: 300 },
      ]);
      mockPrismaService.contact.count.mockResolvedValue(80);

      const result = await service.getStats('page-1', 'workspace-1');

      expect(result).toEqual({
        totalConversations: 100,
        activeConversations: 20,
        totalMessages: 800,
        inboundMessages: 500,
        outboundMessages: 300,
        totalContacts: 80,
      });
    });
  });

  describe('checkAndFixWebhook', () => {
    it('should fix webhook subscription', async () => {
      mockPrismaService.page.findUnique.mockResolvedValue({
        ...mockPage,
        isWebhookActive: false,
      });
      mockFbApiService.subscribePageToWebhook.mockResolvedValue(true);
      mockPrismaService.page.update.mockResolvedValue({});

      const result = await service.checkAndFixWebhook('page-1');

      expect(result.fixed).toBe(true);
      expect(result.status).toBe(true);
    });
  });

  describe('validateToken', () => {
    it('should validate page token', async () => {
      mockPrismaService.page.findUnique.mockResolvedValue(mockPage);
      mockFbApiService.debugToken.mockResolvedValue({
        is_valid: true,
        expires_at: 1704067200,
        scopes: ['pages_messaging'],
      });

      const result = await service.validateToken('page-1');

      expect(result.valid).toBe(true);
      expect(result.scopes).toContain('pages_messaging');
    });
  });

  describe('syncPageInfo', () => {
    it('should sync page info from Facebook', async () => {
      mockPrismaService.page.findUnique.mockResolvedValue(mockPage);
      mockFbApiService.getPageInfo.mockResolvedValue({
        name: 'Updated Page Name',
        category: 'Brand',
        picture: { data: { url: 'http://new-pic.com' } },
      });
      mockPrismaService.page.update.mockResolvedValue({
        ...mockPage,
        name: 'Updated Page Name',
      });

      const result = await service.syncPageInfo('page-1');

      expect(mockPrismaService.page.update).toHaveBeenCalledWith({
        where: { id: 'page-1' },
        data: {
          name: 'Updated Page Name',
          category: 'Brand',
          profilePictureUrl: 'http://new-pic.com',
        },
      });
    });
  });
});
