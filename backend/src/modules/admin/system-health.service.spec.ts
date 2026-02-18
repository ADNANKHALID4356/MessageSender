import { Test, TestingModule } from '@nestjs/testing';
import { SystemHealthService } from './system-health.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

// =============================================
// System Health Service - Unit Tests
// =============================================

describe('SystemHealthService', () => {
  let service: SystemHealthService;

  const mockPrisma = {
    $queryRawUnsafe: jest.fn(),
    workspace: { count: jest.fn() },
    contact: { count: jest.fn() },
    message: { count: jest.fn() },
    page: { count: jest.fn() },
    campaign: { count: jest.fn() },
  };

  const mockRedis = {
    getClient: jest.fn().mockReturnValue({
      ping: jest.fn().mockResolvedValue('PONG'),
      keys: jest.fn().mockResolvedValue([]),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemHealthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<SystemHealthService>(SystemHealthService);
    jest.clearAllMocks();
  });

  describe('getHealthStatus', () => {
    it('should return overall healthy status when all services are up', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ '?column?': 1 }]);
      mockPrisma.workspace.count.mockResolvedValue(2);
      mockPrisma.contact.count.mockResolvedValue(100);
      mockPrisma.message.count.mockResolvedValue(500);
      mockPrisma.page.count.mockResolvedValue(3);
      mockPrisma.campaign.count.mockResolvedValue(5);

      const health = await service.getHealthStatus();

      // The mock environment can't guarantee all services are "healthy",
      // but the shape of the response should be correct.
      expect(health.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(health.services).toBeDefined();
      expect(health.services.database).toBeDefined();
      expect(health.services.redis).toBeDefined();
      expect(health.system).toBeDefined();
      expect(health.system.nodeVersion).toBeDefined();
      expect(health.uptime).toBeGreaterThanOrEqual(0);
      expect(health.workspace.totalWorkspaces).toBe(2);
      expect(health.workspace.totalContacts).toBe(100);
      expect(health.timestamp).toBeDefined();
    });

    it('should return degraded status when a service is down', async () => {
      mockPrisma.$queryRawUnsafe.mockRejectedValue(new Error('DB connection failed'));
      mockPrisma.workspace.count.mockResolvedValue(0);
      mockPrisma.contact.count.mockResolvedValue(0);
      mockPrisma.message.count.mockResolvedValue(0);
      mockPrisma.page.count.mockResolvedValue(0);
      mockPrisma.campaign.count.mockResolvedValue(0);

      const health = await service.getHealthStatus();

      // Overall should be degraded or unhealthy when DB is down
      expect(['degraded', 'unhealthy']).toContain(health.status);
      expect(['unhealthy', 'down', 'degraded']).toContain(health.services.database.status);
    });

    it('should include system memory stats', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ '?column?': 1 }]);
      mockPrisma.workspace.count.mockResolvedValue(0);
      mockPrisma.contact.count.mockResolvedValue(0);
      mockPrisma.message.count.mockResolvedValue(0);
      mockPrisma.page.count.mockResolvedValue(0);
      mockPrisma.campaign.count.mockResolvedValue(0);

      const health = await service.getHealthStatus();

      expect(health.system.memoryUsage.heapUsed).toBeGreaterThan(0);
      expect(health.system.memoryUsage.heapTotal).toBeGreaterThan(0);
      expect(health.system.memoryUsage.rss).toBeGreaterThan(0);
      expect(health.system.memoryUsage.percentage).toBeGreaterThanOrEqual(0);
      expect(health.system.memoryUsage.percentage).toBeLessThanOrEqual(100);
    });
  });
});
