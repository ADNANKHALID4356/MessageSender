import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckResult,
  HealthIndicatorResult,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Basic liveness probe — always public, no auth required.
   * Returns { status: 'ok' } for load balancers, Kubernetes, Docker, uptime monitors.
   */
  @Get()
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'Health check (public, unauthenticated)' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Database check
      async (): Promise<HealthIndicatorResult> => {
        try {
          await this.prisma.$queryRaw`SELECT 1`;
          return { database: { status: 'up' } };
        } catch {
          return { database: { status: 'down' } };
        }
      },
      // Redis check
      async (): Promise<HealthIndicatorResult> => {
        try {
          const client = this.redis.getClient();
          await client.ping();
          return { redis: { status: 'up' } };
        } catch {
          return { redis: { status: 'down' } };
        }
      },
      // Memory check — heap must be under 512 MB
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
    ]);
  }

  /**
   * Detailed readiness probe — returns uptime, versions, and memory.
   * Still public for orchestrators but includes more diagnostic info.
   */
  @Get('ready')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'Readiness probe with details' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  async readiness() {
    const mem = process.memoryUsage();
    let dbOk = false;
    let redisOk = false;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {}

    try {
      const client = this.redis.getClient();
      await client.ping();
      redisOk = true;
    } catch {}

    const overall = dbOk && redisOk ? 'ok' : 'degraded';

    return {
      status: overall,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      node: process.version,
      services: {
        database: dbOk ? 'up' : 'down',
        redis: redisOk ? 'up' : 'down',
      },
      memory: {
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        rssMB: Math.round(mem.rss / 1024 / 1024),
      },
    };
  }
}
