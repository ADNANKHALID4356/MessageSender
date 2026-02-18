import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service';

/**
 * Login rate limit guard:
 * - Tracks failed login attempts per IP + email
 * - Blocks for 15 minutes after 5 failed attempts (per FR-1.1.4)
 */
@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(LoginRateLimitGuard.name);
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_SECONDS = 15 * 60; // 15 minutes

  constructor(private redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const email = request.body?.email || request.body?.username || 'unknown';
    const key = `login_attempts:${ip}:${email}`;

    try {
      const client = this.redis.getClient();
      const attemptsStr = await client.get(key);
      const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;

      if (attempts >= this.MAX_ATTEMPTS) {
        const ttl = await client.ttl(key);
        const minutesLeft = Math.ceil(ttl / 60);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Too many failed login attempts. Please try again in ${minutesLeft} minute(s).`,
            retryAfter: ttl,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // Redis error — allow request
      this.logger.error(`Login rate limit check failed: ${err}`);
      return true;
    }
  }

  /**
   * Record a failed login attempt
   */
  async recordFailedAttempt(ip: string, email: string): Promise<void> {
    const key = `login_attempts:${ip}:${email}`;
    try {
      const client = this.redis.getClient();
      const current = await client.incr(key);
      if (current === 1) {
        await client.expire(key, this.LOCKOUT_SECONDS);
      }
    } catch (err) {
      this.logger.error(`Failed to record login attempt: ${err}`);
    }
  }

  /**
   * Clear login attempts on successful login
   */
  async clearAttempts(ip: string, email: string): Promise<void> {
    const key = `login_attempts:${ip}:${email}`;
    try {
      await this.redis.del(key);
    } catch (err) {
      this.logger.error(`Failed to clear login attempts: ${err}`);
    }
  }
}

/**
 * Generic API rate limit guard
 * Limits requests per IP per endpoint pattern
 */
@Injectable()
export class ApiRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(ApiRateLimitGuard.name);
  private readonly MAX_REQUESTS = 100;
  private readonly WINDOW_SECONDS = 60;

  constructor(private redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const route = request.route?.path || request.url;
    const key = `api_rate:${ip}:${route}`;

    try {
      const client = this.redis.getClient();
      const current = await client.incr(key);
      if (current === 1) {
        await client.expire(key, this.WINDOW_SECONDS);
      }

      if (current > this.MAX_REQUESTS) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests. Please slow down.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`API rate limit check failed: ${err}`);
      return true;
    }
  }
}
