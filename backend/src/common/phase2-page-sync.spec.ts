/**
 * =============================================
 * Phase 2 — Page Sync Scheduling Tests
 * =============================================
 * Tests the @Cron-based scheduling refactor of PageSyncService.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { PageSyncService } from '../modules/pages/page-sync.service';
import { PrismaService } from '../prisma/prisma.service';
import { FacebookApiService } from '../modules/facebook/facebook-api.service';
import { EncryptionService } from './encryption.service';

describe('PageSyncService — @Cron Scheduling', () => {
  let service: PageSyncService;
  let mockPrisma: any;
  let mockFacebookApi: any;
  let mockEncryption: any;

  beforeEach(async () => {
    mockPrisma = {
      page: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    mockFacebookApi = {
      getPageInfo: jest.fn(),
      getLongLivedToken: jest.fn(),
      getPageAccessToken: jest.fn(),
      subscribePageToWebhook: jest.fn(),
    };

    mockEncryption = {
      encrypt: jest.fn((v: string) => `enc:${v}`),
      decrypt: jest.fn((v: string) => v),
      encryptIfNeeded: jest.fn((v: string) => v),
      decryptIfNeeded: jest.fn((v: string) => v),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PageSyncService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FacebookApiService, useValue: mockFacebookApi },
        { provide: EncryptionService, useValue: mockEncryption },
      ],
    }).compile();

    service = module.get(PageSyncService);
  });

  // ===========================================
  // @Cron Decorator Verification
  // ===========================================

  describe('@Cron decorator', () => {
    it('should have handleScheduledSync method', () => {
      expect(service.handleScheduledSync).toBeDefined();
      expect(typeof service.handleScheduledSync).toBe('function');
    });

    it('should have the Cron metadata on handleScheduledSync', () => {
      // Verify the method exists and is callable
      const metadata = Reflect.getMetadataKeys(
        PageSyncService.prototype.handleScheduledSync,
      );
      // @nestjs/schedule decorates with metadata
      expect(metadata.length).toBeGreaterThan(0);
    });
  });

  // ===========================================
  // Scheduled Sync Logic
  // ===========================================

  describe('handleScheduledSync', () => {
    it('should call syncAllPages on scheduled run', async () => {
      const spy = jest.spyOn(service, 'syncAllPages').mockResolvedValue({
        synced: 2,
        failed: 0,
        tokenRefreshed: 0,
        errors: [],
      });

      await service.handleScheduledSync();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should skip if currently syncing', async () => {
      // Simulate long-running sync
      const longSync = new Promise<any>((resolve) =>
        setTimeout(() => resolve({ synced: 0, failed: 0, tokenRefreshed: 0, errors: [] }), 100),
      );
      jest.spyOn(service, 'syncAllPages').mockReturnValue(longSync);

      // Start first sync
      const first = service.handleScheduledSync();
      // Try to start another immediately — should be skipped
      const second = service.handleScheduledSync();

      await first;
      await second;

      expect(service.syncAllPages).toHaveBeenCalledTimes(1);
    });

    it('should not run after shutdown', async () => {
      await service.onApplicationShutdown('SIGTERM');

      const spy = jest.spyOn(service, 'syncAllPages');
      await service.handleScheduledSync();

      expect(spy).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully without throwing', async () => {
      jest.spyOn(service, 'syncAllPages').mockRejectedValue(new Error('DB down'));
      await expect(service.handleScheduledSync()).resolves.not.toThrow();
    });

    it('should reset isSyncing flag after error', async () => {
      jest.spyOn(service, 'syncAllPages')
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValueOnce({ synced: 1, failed: 0, tokenRefreshed: 0, errors: [] });

      await service.handleScheduledSync(); // fails
      await service.handleScheduledSync(); // should still run

      expect(service.syncAllPages).toHaveBeenCalledTimes(2);
    });
  });

  // ===========================================
  // Backward Compatibility
  // ===========================================

  describe('deprecated methods', () => {
    it('startPeriodicSync should not throw', () => {
      expect(() => service.startPeriodicSync()).not.toThrow();
    });

    it('stopPeriodicSync should not throw', () => {
      expect(() => service.stopPeriodicSync()).not.toThrow();
    });
  });

  // ===========================================
  // Shutdown Behavior
  // ===========================================

  describe('onApplicationShutdown', () => {
    it('should implement OnApplicationShutdown', () => {
      expect(service.onApplicationShutdown).toBeDefined();
    });

    it('should prevent future syncs after shutdown', async () => {
      await service.onApplicationShutdown('SIGINT');

      const spy = jest.spyOn(service, 'syncAllPages');
      await service.handleScheduledSync();
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
