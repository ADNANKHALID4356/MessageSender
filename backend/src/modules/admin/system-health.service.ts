import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

// ===========================================
// System Health Types
// ===========================================

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number; // seconds
  timestamp: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    facebookApi: ServiceHealth;
    jobQueue: QueueHealth;
  };
  system: {
    memoryUsage: { heapUsed: number; heapTotal: number; rss: number; percentage: number };
    cpuTime: { user: number; system: number };
    nodeVersion: string;
  };
  workspace: {
    totalWorkspaces: number;
    totalContacts: number;
    totalMessages: number;
    totalPages: number;
    activeCampaigns: number;
  };
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  latency?: number; // ms
  error?: string;
  lastChecked: string;
}

export interface QueueHealth {
  status: 'up' | 'down' | 'degraded';
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

// ===========================================
// System Health Service (FR-12.5.4)
// ===========================================

@Injectable()
export class SystemHealthService {
  private readonly logger = new Logger(SystemHealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // ===========================================
  // Complete Health Check
  // ===========================================

  async getHealthStatus(): Promise<HealthStatus> {
    const [database, redis, facebookApi, jobQueue, workspace] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkFacebookApi(),
      this.checkJobQueues(),
      this.getWorkspaceStats(),
    ]);

    const services = { database, redis, facebookApi, jobQueue };

    // Determine overall status
    const serviceStatuses = [database.status, redis.status, facebookApi.status];
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (serviceStatuses.some(s => s === 'down')) overallStatus = 'unhealthy';
    else if (serviceStatuses.some(s => s === 'degraded')) overallStatus = 'degraded';

    const mem = process.memoryUsage();

    return {
      status: overallStatus,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      services,
      system: {
        memoryUsage: {
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
          rss: Math.round(mem.rss / 1024 / 1024),
          percentage: Math.round((mem.heapUsed / mem.heapTotal) * 100),
        },
        cpuTime: process.cpuUsage(),
        nodeVersion: process.version,
      },
      workspace,
    };
  }

  // ===========================================
  // Individual Health Checks
  // ===========================================

  private async checkDatabase(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        latency: Date.now() - start,
        lastChecked: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error('Database health check failed:', error.message);
      return {
        status: 'down',
        latency: Date.now() - start,
        error: error.message,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const client = this.redis.getClient();
      await client.ping();
      return {
        status: 'up',
        latency: Date.now() - start,
        lastChecked: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error('Redis health check failed:', error.message);
      return {
        status: 'down',
        latency: Date.now() - start,
        error: error.message,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private async checkFacebookApi(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      // Check if we have any connected pages with valid tokens
      const activePagesCount = await this.prisma.page.count({
        where: {
          isActive: true,
          tokenError: null,
        },
      });

      const expiredTokenCount = await this.prisma.page.count({
        where: {
          isActive: true,
          tokenExpiresAt: { lt: new Date() },
        },
      });

      if (expiredTokenCount > 0) {
        return {
          status: 'degraded',
          latency: Date.now() - start,
          error: `${expiredTokenCount} pages with expired tokens`,
          lastChecked: new Date().toISOString(),
        };
      }

      return {
        status: activePagesCount > 0 ? 'up' : 'degraded',
        latency: Date.now() - start,
        lastChecked: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        status: 'down',
        latency: Date.now() - start,
        error: error.message,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private async checkJobQueues(): Promise<QueueHealth> {
    try {
      const client = this.redis.getClient();

      // Check BullMQ queue stats from Redis
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        client.llen('bull:messages:wait').catch(() => 0),
        client.llen('bull:messages:active').catch(() => 0),
        client.get('bull:messages:completed').then(v => parseInt(v || '0', 10)).catch(() => 0),
        client.get('bull:messages:failed').then(v => parseInt(v || '0', 10)).catch(() => 0),
        client.zcard('bull:messages:delayed').catch(() => 0),
      ]);

      return {
        status: failed > 100 ? 'degraded' : 'up',
        waiting: waiting as number,
        active: active as number,
        completed,
        failed,
        delayed: delayed as number,
      };
    } catch {
      return {
        status: 'down',
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      };
    }
  }

  private async getWorkspaceStats(): Promise<HealthStatus['workspace']> {
    const [totalWorkspaces, totalContacts, totalMessages, totalPages, activeCampaigns] =
      await Promise.all([
        this.prisma.workspace.count(),
        this.prisma.contact.count(),
        this.prisma.message.count(),
        this.prisma.page.count({ where: { isActive: true } }),
        this.prisma.campaign.count({ where: { status: 'RUNNING' } }),
      ]);

    return { totalWorkspaces, totalContacts, totalMessages, totalPages, activeCampaigns };
  }

  // ===========================================
  // Page Health Monitoring
  // ===========================================

  async getPageHealthAlerts(): Promise<{
    totalPages: number;
    healthyPages: number;
    alerts: Array<{
      pageId: string;
      pageName: string;
      issue: string;
      severity: 'warning' | 'critical';
      detectedAt: string;
    }>;
  }> {
    const pages = await this.prisma.page.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
        webhookSubscribed: true,
        tokenExpiresAt: true,
        tokenError: true,
        lastSyncedAt: true,
        updatedAt: true,
      },
    });

    const alerts: Array<{
      pageId: string;
      pageName: string;
      issue: string;
      severity: 'warning' | 'critical';
      detectedAt: string;
    }> = [];

    const now = new Date();

    for (const page of pages) {
      if (!page.isActive) {
        alerts.push({
          pageId: page.id,
          pageName: page.name,
          issue: 'Page is deactivated',
          severity: 'critical',
          detectedAt: page.updatedAt.toISOString(),
        });
      }

      if (!page.webhookSubscribed) {
        alerts.push({
          pageId: page.id,
          pageName: page.name,
          issue: 'Webhook is disconnected — messages will not be received',
          severity: 'critical',
          detectedAt: page.updatedAt.toISOString(),
        });
      }

      if (page.tokenExpiresAt && page.tokenExpiresAt < now) {
        alerts.push({
          pageId: page.id,
          pageName: page.name,
          issue: 'Access token has expired — reconnection needed',
          severity: 'critical',
          detectedAt: page.tokenExpiresAt.toISOString(),
        });
      } else if (
        page.tokenExpiresAt &&
        page.tokenExpiresAt.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000
      ) {
        alerts.push({
          pageId: page.id,
          pageName: page.name,
          issue: 'Access token expires within 7 days',
          severity: 'warning',
          detectedAt: now.toISOString(),
        });
      }

      if (page.tokenError) {
        alerts.push({
          pageId: page.id,
          pageName: page.name,
          issue: `Token error: ${page.tokenError}`,
          severity: 'critical',
          detectedAt: page.updatedAt.toISOString(),
        });
      }

      // Stale sync detection — no sync in 24+ hours
      if (page.isActive && page.lastSyncedAt) {
        const hoursSinceSync = (now.getTime() - new Date(page.lastSyncedAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceSync > 24) {
          alerts.push({
            pageId: page.id,
            pageName: page.name,
            issue: `No sync in ${Math.round(hoursSinceSync)} hours`,
            severity: 'warning',
            detectedAt: page.lastSyncedAt.toISOString(),
          });
        }
      }
    }

    return {
      totalPages: pages.length,
      healthyPages: pages.filter((p) => p.isActive && p.webhookSubscribed && !p.tokenError).length,
      alerts: alerts.sort((a, b) => (a.severity === 'critical' ? -1 : 1)),
    };
  }
}
