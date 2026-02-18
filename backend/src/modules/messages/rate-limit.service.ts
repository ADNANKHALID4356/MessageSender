import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

// ===========================================
// Types
// ===========================================

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
  waitTimeMs?: number;
}

export interface RateLimitConfig {
  limit: number; // Max requests
  windowMs: number; // Time window in milliseconds
}

// ===========================================
// Rate Limiting Service
// ===========================================

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  // Facebook's default rate limits
  private readonly LIMITS: Record<string, RateLimitConfig> = {
    // Page-level rate limit: 200 messages per hour per page
    PAGE_MESSAGE: {
      limit: 200,
      windowMs: 60 * 60 * 1000, // 1 hour
    },
    // Workspace-level rate limit: 1000 messages per hour
    WORKSPACE_MESSAGE: {
      limit: 1000,
      windowMs: 60 * 60 * 1000, // 1 hour
    },
    // API call rate limit: 200 calls per hour per page for Graph API
    PAGE_API_CALL: {
      limit: 200,
      windowMs: 60 * 60 * 1000, // 1 hour
    },
    // Bulk campaign rate limit: 100 messages per minute
    BULK_CAMPAIGN: {
      limit: 100,
      windowMs: 60 * 1000, // 1 minute
    },
    // Contact-level rate limit: 10 messages per minute to same contact
    CONTACT_MESSAGE: {
      limit: 10,
      windowMs: 60 * 1000, // 1 minute
    },
  };

  // Redis key prefixes
  private readonly REDIS_PREFIX = 'rate_limit:';

  constructor(private redis: RedisService) {}

  // ===========================================
  // Check Rate Limit
  // ===========================================

  /**
   * Check if action is allowed under rate limit
   */
  async checkRateLimit(
    type: string,
    identifier: string,
  ): Promise<RateLimitStatus> {
    const config = this.LIMITS[type];
    if (!config) {
      // Unknown type - allow by default
      this.logger.warn(`Unknown rate limit type: ${type}`);
      return {
        allowed: true,
        remaining: 999,
        limit: 999,
        resetAt: new Date(),
      };
    }

    const key = this.getRedisKey(type, identifier);

    try {
      const client = this.redis.getClient();
      
      // Get current count
      const countStr = await client.get(key);
      const currentCount = countStr ? parseInt(countStr, 10) : 0;

      // Get TTL to calculate reset time
      const ttl = await client.ttl(key);
      const resetAt = new Date(Date.now() + (ttl > 0 ? ttl * 1000 : config.windowMs));

      const remaining = Math.max(0, config.limit - currentCount);
      const allowed = currentCount < config.limit;

      return {
        allowed,
        remaining,
        limit: config.limit,
        resetAt,
        waitTimeMs: allowed ? 0 : (ttl > 0 ? ttl * 1000 : config.windowMs),
      };

    } catch (error) {
      this.logger.error(`Rate limit check failed for ${type}:${identifier}`, error);
      // On error, allow the request (fail open)
      return {
        allowed: true,
        remaining: 1,
        limit: config.limit,
        resetAt: new Date(Date.now() + config.windowMs),
      };
    }
  }

  // ===========================================
  // Increment Rate Limit Counter
  // ===========================================

  /**
   * Increment the rate limit counter and check if allowed
   * Returns the same status as checkRateLimit, but also increments
   */
  async incrementAndCheck(
    type: string,
    identifier: string,
    amount: number = 1,
  ): Promise<RateLimitStatus> {
    const config = this.LIMITS[type];
    if (!config) {
      return {
        allowed: true,
        remaining: 999,
        limit: 999,
        resetAt: new Date(),
      };
    }

    const key = this.getRedisKey(type, identifier);

    try {
      const client = this.redis.getClient();

      // Use MULTI for atomic operation
      const pipeline = client.multi();
      pipeline.incrby(key, amount);
      pipeline.ttl(key);
      
      const results = await pipeline.exec();
      
      if (!results) {
        throw new Error('Redis MULTI failed');
      }

      const [incrResult, ttlResult] = results;
      const newCount = incrResult[1] as number;
      const ttl = ttlResult[1] as number;

      // Set expiry if this is a new key
      if (ttl === -1) {
        await client.pexpire(key, config.windowMs);
      }

      const resetAt = new Date(Date.now() + (ttl > 0 ? ttl * 1000 : config.windowMs));
      const remaining = Math.max(0, config.limit - newCount);
      const allowed = newCount <= config.limit;

      // If we exceeded limit, roll back the increment
      if (!allowed && amount > 0) {
        await client.decrby(key, amount);
      }

      return {
        allowed,
        remaining: allowed ? remaining : 0,
        limit: config.limit,
        resetAt,
        waitTimeMs: allowed ? 0 : (ttl > 0 ? ttl * 1000 : config.windowMs),
      };

    } catch (error) {
      this.logger.error(`Rate limit increment failed for ${type}:${identifier}`, error);
      return {
        allowed: true,
        remaining: 1,
        limit: config.limit,
        resetAt: new Date(Date.now() + config.windowMs),
      };
    }
  }

  // ===========================================
  // Convenience Methods
  // ===========================================

  /**
   * Check page message rate limit
   */
  async checkPageMessageLimit(pageId: string): Promise<RateLimitStatus> {
    return this.checkRateLimit('PAGE_MESSAGE', pageId);
  }

  /**
   * Increment and check page message rate limit
   */
  async consumePageMessageQuota(pageId: string): Promise<RateLimitStatus> {
    return this.incrementAndCheck('PAGE_MESSAGE', pageId);
  }

  /**
   * Check workspace message rate limit
   */
  async checkWorkspaceMessageLimit(workspaceId: string): Promise<RateLimitStatus> {
    return this.checkRateLimit('WORKSPACE_MESSAGE', workspaceId);
  }

  /**
   * Check contact message rate limit (prevent spam to same contact)
   */
  async checkContactMessageLimit(contactId: string): Promise<RateLimitStatus> {
    return this.checkRateLimit('CONTACT_MESSAGE', contactId);
  }

  /**
   * Check bulk campaign rate limit
   */
  async checkBulkCampaignLimit(campaignId: string): Promise<RateLimitStatus> {
    return this.checkRateLimit('BULK_CAMPAIGN', campaignId);
  }

  /**
   * Consume rate limit quota for a message
   * Checks multiple limits and only succeeds if all pass
   */
  async consumeMessageQuota(
    pageId: string,
    workspaceId: string,
    contactId: string,
  ): Promise<{
    allowed: boolean;
    pageStatus: RateLimitStatus;
    workspaceStatus: RateLimitStatus;
    contactStatus: RateLimitStatus;
    reason?: string;
  }> {
    // Check all limits first (without incrementing)
    const [pageStatus, workspaceStatus, contactStatus] = await Promise.all([
      this.checkRateLimit('PAGE_MESSAGE', pageId),
      this.checkRateLimit('WORKSPACE_MESSAGE', workspaceId),
      this.checkRateLimit('CONTACT_MESSAGE', contactId),
    ]);

    // If any limit exceeded, return with reason
    if (!pageStatus.allowed) {
      return {
        allowed: false,
        pageStatus,
        workspaceStatus,
        contactStatus,
        reason: `Page rate limit exceeded (${pageStatus.limit}/hour). Resets at ${pageStatus.resetAt.toISOString()}`,
      };
    }

    if (!workspaceStatus.allowed) {
      return {
        allowed: false,
        pageStatus,
        workspaceStatus,
        contactStatus,
        reason: `Workspace rate limit exceeded (${workspaceStatus.limit}/hour)`,
      };
    }

    if (!contactStatus.allowed) {
      return {
        allowed: false,
        pageStatus,
        workspaceStatus,
        contactStatus,
        reason: `Contact rate limit exceeded (${contactStatus.limit}/minute)`,
      };
    }

    // All checks passed, now increment all
    const [finalPageStatus, finalWorkspaceStatus, finalContactStatus] = await Promise.all([
      this.incrementAndCheck('PAGE_MESSAGE', pageId),
      this.incrementAndCheck('WORKSPACE_MESSAGE', workspaceId),
      this.incrementAndCheck('CONTACT_MESSAGE', contactId),
    ]);

    return {
      allowed: true,
      pageStatus: finalPageStatus,
      workspaceStatus: finalWorkspaceStatus,
      contactStatus: finalContactStatus,
    };
  }

  // ===========================================
  // Admin / Monitoring
  // ===========================================

  /**
   * Get current rate limit usage for a page
   */
  async getPageUsage(pageId: string): Promise<{
    messagesUsed: number;
    messagesRemaining: number;
    limit: number;
    resetAt: Date;
  }> {
    const status = await this.checkRateLimit('PAGE_MESSAGE', pageId);
    return {
      messagesUsed: status.limit - status.remaining,
      messagesRemaining: status.remaining,
      limit: status.limit,
      resetAt: status.resetAt,
    };
  }

  /**
   * Get usage across all pages in a workspace
   */
  async getWorkspacePageUsage(pageIds: string[]): Promise<
    Array<{
      pageId: string;
      messagesUsed: number;
      messagesRemaining: number;
      resetAt: Date;
    }>
  > {
    const results = await Promise.all(
      pageIds.map(async (pageId) => {
        const usage = await this.getPageUsage(pageId);
        return {
          pageId,
          messagesUsed: usage.messagesUsed,
          messagesRemaining: usage.messagesRemaining,
          resetAt: usage.resetAt,
        };
      }),
    );
    return results;
  }

  /**
   * Reset rate limit for a specific key (admin only)
   */
  async resetRateLimit(type: string, identifier: string): Promise<void> {
    const key = this.getRedisKey(type, identifier);
    const client = this.redis.getClient();
    await client.del(key);
    this.logger.log(`Rate limit reset for ${type}:${identifier}`);
  }

  /**
   * Update rate limit configuration (runtime override)
   */
  setRateLimitConfig(type: string, config: RateLimitConfig): void {
    this.LIMITS[type] = config;
    this.logger.log(`Rate limit config updated for ${type}: ${JSON.stringify(config)}`);
  }

  // ===========================================
  // Helpers
  // ===========================================

  private getRedisKey(type: string, identifier: string): string {
    return `${this.REDIS_PREFIX}${type}:${identifier}`;
  }
}
