/**
 * =============================================
 * Page Sync Service — Unit Tests
 * =============================================
 */
import { Test, TestingModule } from '@nestjs/testing';
import { PageSyncService } from './page-sync.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FacebookApiService } from '../facebook/facebook-api.service';
import { EncryptionService } from '../../common/encryption.service';

describe('PageSyncService', () => {
  let service: PageSyncService;

  const mockPrisma: any = {
    page: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
  };

  const mockFacebookApi: any = {
    getPageInfo: jest.fn(),
    getLongLivedToken: jest.fn(),
    getPageAccessToken: jest.fn(),
    subscribePageToWebhook: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PageSyncService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FacebookApiService, useValue: mockFacebookApi },
        { provide: EncryptionService, useValue: { encrypt: jest.fn((v) => `encrypted:${v}`), decrypt: jest.fn((v) => v), encryptIfNeeded: jest.fn((v) => v), decryptIfNeeded: jest.fn((v) => v) } },
      ],
    }).compile();

    service = module.get(PageSyncService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.stopPeriodicSync();
  });

  // ===========================================
  // Periodic Sync
  // ===========================================

  describe('startPeriodicSync / stopPeriodicSync', () => {
    it('should start periodic sync without error', () => {
      expect(() => service.startPeriodicSync()).not.toThrow();
      service.stopPeriodicSync();
    });

    it('should be idempotent - calling start twice should not create two intervals', () => {
      service.startPeriodicSync();
      service.startPeriodicSync(); // second call should be no-op
      service.stopPeriodicSync();
    });
  });

  // ===========================================
  // Sync All Pages
  // ===========================================

  describe('syncAllPages', () => {
    it('should return 0 synced when no active pages', async () => {
      mockPrisma.page.findMany.mockResolvedValue([]);
      const result = await service.syncAllPages();
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should sync pages and report results', async () => {
      mockPrisma.page.findMany.mockResolvedValue([
        {
          id: 'p1',
          fbPageId: 'fb1',
          accessToken: 'token1',
          facebookAccount: { accessToken: 'acctToken', tokenExpiresAt: null },
        },
      ]);
      mockPrisma.page.findUnique.mockResolvedValue({
        id: 'p1',
        fbPageId: 'fb1',
        accessToken: 'token1',
      });
      mockFacebookApi.getPageInfo.mockResolvedValue({
        name: 'Test Page',
        picture: { data: { url: 'pic.jpg' } },
        followers_count: 1000,
        category: 'Business',
      });

      const result = await service.syncAllPages();
      expect(result.synced).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should handle sync failure for a page', async () => {
      mockPrisma.page.findMany.mockResolvedValue([
        {
          id: 'p1',
          fbPageId: 'fb1',
          accessToken: 'token1',
          facebookAccount: { accessToken: 'acctToken', tokenExpiresAt: null },
        },
      ]);
      mockPrisma.page.findUnique.mockResolvedValue({
        id: 'p1',
        fbPageId: 'fb1',
        accessToken: 'token1',
      });
      mockFacebookApi.getPageInfo.mockRejectedValue(new Error('API Down'));

      const result = await service.syncAllPages();
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('API Down');
    });
  });

  // ===========================================
  // Sync Single Page
  // ===========================================

  describe('syncPageData', () => {
    it('should do nothing if page not found', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);
      await service.syncPageData('nonexistent');
      expect(mockFacebookApi.getPageInfo).not.toHaveBeenCalled();
    });

    it('should update page data from Facebook API', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({
        id: 'p1',
        fbPageId: 'fb1',
        accessToken: 'valid_token',
      });
      mockFacebookApi.getPageInfo.mockResolvedValue({
        name: 'Updated Name',
        picture: { data: { url: 'new_pic.jpg' } },
        followers_count: 2000,
        category: 'Tech',
      });

      await service.syncPageData('p1');
      expect(mockPrisma.page.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p1' },
          data: expect.objectContaining({
            name: 'Updated Name',
            followersCount: 2000,
          }),
        }),
      );
    });
  });
});
