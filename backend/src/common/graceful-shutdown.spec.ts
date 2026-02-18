// ===========================================
// Graceful Shutdown — Unit Tests
// Tests OnApplicationShutdown hooks in Prisma, Redis, PageSync services
// ===========================================

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';

// ===========================================
// PrismaService Shutdown Tests
// ===========================================

describe('PrismaService - graceful shutdown', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should implement OnApplicationShutdown', () => {
    expect(typeof service.onApplicationShutdown).toBe('function');
  });

  it('should call $disconnect on shutdown', async () => {
    const disconnectSpy = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);

    await service.onApplicationShutdown('SIGTERM');
    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('should handle being called with undefined signal', async () => {
    jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);
    await expect(service.onApplicationShutdown(undefined)).resolves.not.toThrow();
  });

  it('should handle $disconnect failure', async () => {
    jest.spyOn(service, '$disconnect').mockRejectedValue(new Error('connection lost'));
    await expect(service.onApplicationShutdown('SIGINT')).rejects.toThrow('connection lost');
  });
});

// ===========================================
// RedisService Shutdown Tests (mocked)
// ===========================================

describe('RedisService - graceful shutdown', () => {
  it('should have onApplicationShutdown method', async () => {
    // Instead of instantiating RedisService (which connects to real Redis),
    // verify the contract by checking the class prototype
    const { RedisService } = await import('../redis/redis.service');
    expect(RedisService.prototype.onApplicationShutdown).toBeDefined();
    expect(typeof RedisService.prototype.onApplicationShutdown).toBe('function');
  });

  it('should have onModuleDestroy method', async () => {
    const { RedisService } = await import('../redis/redis.service');
    expect(RedisService.prototype.onModuleDestroy).toBeDefined();
    expect(typeof RedisService.prototype.onModuleDestroy).toBe('function');
  });
});

// ===========================================
// PageSyncService Shutdown Tests
// ===========================================

describe('PageSyncService - graceful shutdown', () => {
  let service: any;

  beforeEach(async () => {
    // Import and manually construct with mocks to avoid DI issues
    const { PageSyncService } = await import('../modules/pages/page-sync.service');
    service = new (PageSyncService as any)(
      { page: { findMany: jest.fn().mockResolvedValue([]) } }, // prisma
      {},  // facebookApi
      { decryptIfNeeded: jest.fn((v: string) => v), encrypt: jest.fn((v: string) => v) }, // encryption
    );
  });

  it('should implement OnApplicationShutdown', () => {
    expect(typeof service.onApplicationShutdown).toBe('function');
  });

  it('should have handleScheduledSync method (Cron-based)', () => {
    expect(typeof service.handleScheduledSync).toBe('function');
  });

  it('should stop accepting syncs on shutdown', async () => {
    await service.onApplicationShutdown('SIGTERM');
    const syncSpy = jest.spyOn(service, 'syncAllPages');
    await service.handleScheduledSync();
    expect(syncSpy).not.toHaveBeenCalled();
  });

  it('should have deprecated startPeriodicSync for backward compat', () => {
    expect(() => service.startPeriodicSync()).not.toThrow();
  });

  it('should safely stop when no sync is running', () => {
    expect(() => service.stopPeriodicSync()).not.toThrow();
  });

  it('should not run concurrent syncs', async () => {
    const longSync = new Promise<any>((resolve) =>
      setTimeout(() => resolve({ synced: 0, failed: 0, tokenRefreshed: 0, errors: [] }), 50),
    );
    jest.spyOn(service, 'syncAllPages').mockReturnValue(longSync);

    const first = service.handleScheduledSync();
    const second = service.handleScheduledSync();
    await first;
    await second;
    expect(service.syncAllPages).toHaveBeenCalledTimes(1);
  });
});
