import { Test, TestingModule } from '@nestjs/testing';
import {
  HealthCheckService,
  MemoryHealthIndicator,
  HealthCheckResult,
} from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;
  let prismaService: PrismaService;
  let redisService: RedisService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn().mockReturnValue({
      ping: jest.fn(),
    }),
  };

  const mockHealthCheckService = {
    check: jest.fn(),
  };

  const mockMemoryHealthIndicator = {
    checkHeap: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: MemoryHealthIndicator, useValue: mockMemoryHealthIndicator },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // =====================
  // GET /health — Liveness probe
  // =====================
  describe('check (GET /health)', () => {
    it('should return healthy status when all services are up', async () => {
      const healthResult: HealthCheckResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          redis: { status: 'up' },
          memory_heap: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
          redis: { status: 'up' },
          memory_heap: { status: 'up' },
        },
      };

      // Mock HealthCheckService.check to execute the indicator callbacks
      mockHealthCheckService.check.mockImplementation(async (indicators: (() => Promise<any>)[]) => {
        const results: Record<string, any> = {};
        for (const indicator of indicators) {
          const result = await indicator();
          Object.assign(results, result);
        }
        return {
          status: 'ok',
          info: results,
          error: {},
          details: results,
        };
      });

      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedisService.getClient().ping.mockResolvedValue('PONG');
      mockMemoryHealthIndicator.checkHeap.mockResolvedValue({
        memory_heap: { status: 'up' },
      });

      const result = await controller.check();

      expect(result.status).toBe('ok');
      expect(result.info).toHaveProperty('database');
      expect(result.info).toHaveProperty('redis');
      expect(mockHealthCheckService.check).toHaveBeenCalled();
    });

    it('should report database down when query fails', async () => {
      mockHealthCheckService.check.mockImplementation(async (indicators: (() => Promise<any>)[]) => {
        const results: Record<string, any> = {};
        for (const indicator of indicators) {
          const result = await indicator();
          Object.assign(results, result);
        }
        return {
          status: 'error',
          info: {},
          error: results,
          details: results,
        };
      });

      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Connection refused'));
      mockRedisService.getClient().ping.mockResolvedValue('PONG');
      mockMemoryHealthIndicator.checkHeap.mockResolvedValue({
        memory_heap: { status: 'up' },
      });

      const result = await controller.check();

      expect(result.details).toHaveProperty('database');
      expect(result.details.database.status).toBe('down');
    });

    it('should report redis down when ping fails', async () => {
      mockHealthCheckService.check.mockImplementation(async (indicators: (() => Promise<any>)[]) => {
        const results: Record<string, any> = {};
        for (const indicator of indicators) {
          const result = await indicator();
          Object.assign(results, result);
        }
        return {
          status: 'error',
          info: {},
          error: results,
          details: results,
        };
      });

      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedisService.getClient().ping.mockRejectedValue(new Error('Redis unreachable'));
      mockMemoryHealthIndicator.checkHeap.mockResolvedValue({
        memory_heap: { status: 'up' },
      });

      const result = await controller.check();

      expect(result.details).toHaveProperty('redis');
      expect(result.details.redis.status).toBe('down');
    });

    it('should pass 512 MB limit to memory heap check', async () => {
      mockHealthCheckService.check.mockImplementation(async (indicators: (() => Promise<any>)[]) => {
        const results: Record<string, any> = {};
        for (const indicator of indicators) {
          const result = await indicator();
          Object.assign(results, result);
        }
        return { status: 'ok', info: results, error: {}, details: results };
      });

      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedisService.getClient().ping.mockResolvedValue('PONG');
      mockMemoryHealthIndicator.checkHeap.mockResolvedValue({
        memory_heap: { status: 'up' },
      });

      await controller.check();

      expect(mockMemoryHealthIndicator.checkHeap).toHaveBeenCalledWith(
        'memory_heap',
        512 * 1024 * 1024,
      );
    });
  });

  // =====================
  // GET /health/ready — Readiness probe
  // =====================
  describe('readiness (GET /health/ready)', () => {
    it('should return ok status when all services are healthy', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedisService.getClient().ping.mockResolvedValue('PONG');

      const result = await controller.readiness();

      expect(result.status).toBe('ok');
      expect(result.services.database).toBe('up');
      expect(result.services.redis).toBe('up');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeDefined();
      expect(result.node).toBe(process.version);
      expect(result.memory).toHaveProperty('heapUsedMB');
      expect(result.memory).toHaveProperty('heapTotalMB');
      expect(result.memory).toHaveProperty('rssMB');
    });

    it('should return degraded status when database is down', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('DB down'));
      mockRedisService.getClient().ping.mockResolvedValue('PONG');

      const result = await controller.readiness();

      expect(result.status).toBe('degraded');
      expect(result.services.database).toBe('down');
      expect(result.services.redis).toBe('up');
    });

    it('should return degraded status when redis is down', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedisService.getClient().ping.mockRejectedValue(new Error('Redis down'));

      const result = await controller.readiness();

      expect(result.status).toBe('degraded');
      expect(result.services.database).toBe('up');
      expect(result.services.redis).toBe('down');
    });

    it('should return degraded when both services are down', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('DB down'));
      mockRedisService.getClient().ping.mockRejectedValue(new Error('Redis down'));

      const result = await controller.readiness();

      expect(result.status).toBe('degraded');
      expect(result.services.database).toBe('down');
      expect(result.services.redis).toBe('down');
    });

    it('should return memory stats in MB', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedisService.getClient().ping.mockResolvedValue('PONG');

      const result = await controller.readiness();

      expect(typeof result.memory.heapUsedMB).toBe('number');
      expect(typeof result.memory.heapTotalMB).toBe('number');
      expect(typeof result.memory.rssMB).toBe('number');
      expect(result.memory.heapUsedMB).toBeGreaterThan(0);
    });

    it('should return uptime as integer seconds', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedisService.getClient().ping.mockResolvedValue('PONG');

      const result = await controller.readiness();

      expect(Number.isInteger(result.uptime)).toBe(true);
    });

    it('should return ISO timestamp', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedisService.getClient().ping.mockResolvedValue('PONG');

      const result = await controller.readiness();

      expect(() => new Date(result.timestamp)).not.toThrow();
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
