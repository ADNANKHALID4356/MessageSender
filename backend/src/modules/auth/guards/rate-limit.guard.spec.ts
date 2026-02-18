import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { LoginRateLimitGuard, ApiRateLimitGuard } from './rate-limit.guard';
import { RedisService } from '../../../redis/redis.service';

describe('LoginRateLimitGuard', () => {
  let guard: LoginRateLimitGuard;

  const mockClient = {
    get: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn().mockReturnValue(mockClient),
    del: jest.fn(),
  };

  const createMockContext = (ip: string, email: string): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => ({
        ip,
        body: { email },
      }),
      getResponse: jest.fn(),
      getNext: jest.fn(),
    }),
    getClass: jest.fn(),
    getHandler: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
  } as unknown as ExecutionContext);

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginRateLimitGuard,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    guard = module.get<LoginRateLimitGuard>(LoginRateLimitGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  // =====================
  // canActivate
  // =====================
  describe('canActivate', () => {
    it('should allow request when no previous attempts', async () => {
      mockClient.get.mockResolvedValue(null);

      const context = createMockContext('192.168.1.1', 'user@test.com');
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockClient.get).toHaveBeenCalledWith('login_attempts:192.168.1.1:user@test.com');
    });

    it('should allow request when attempts below threshold', async () => {
      mockClient.get.mockResolvedValue('4');

      const context = createMockContext('192.168.1.1', 'user@test.com');
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should block request after 5 failed attempts', async () => {
      mockClient.get.mockResolvedValue('5');
      mockClient.ttl.mockResolvedValue(600);

      const context = createMockContext('192.168.1.1', 'user@test.com');

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);

      try {
        await guard.canActivate(context);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const response = (e as HttpException).getResponse();
        expect(response).toHaveProperty('retryAfter', 600);
        expect((response as Record<string, unknown>).message).toContain('10 minute');
      }
    });

    it('should block request after more than 5 failed attempts', async () => {
      mockClient.get.mockResolvedValue('10');
      mockClient.ttl.mockResolvedValue(300);

      const context = createMockContext('192.168.1.1', 'user@test.com');

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });

    it('should allow request when Redis fails (fail open)', async () => {
      mockClient.get.mockRejectedValue(new Error('Redis connection lost'));

      const context = createMockContext('192.168.1.1', 'user@test.com');
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should use username field as fallback when email is not provided', async () => {
      mockClient.get.mockResolvedValue(null);

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            ip: '192.168.1.1',
            body: { username: 'admin' },
          }),
        }),
        getClass: jest.fn(),
        getHandler: jest.fn(),
        getArgs: jest.fn(),
        getArgByIndex: jest.fn(),
        switchToRpc: jest.fn(),
        switchToWs: jest.fn(),
        getType: jest.fn(),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockClient.get).toHaveBeenCalledWith('login_attempts:192.168.1.1:admin');
    });
  });

  // =====================
  // recordFailedAttempt
  // =====================
  describe('recordFailedAttempt', () => {
    it('should increment counter and set expiry on first attempt', async () => {
      mockClient.incr.mockResolvedValue(1);

      await guard.recordFailedAttempt('192.168.1.1', 'user@test.com');

      expect(mockClient.incr).toHaveBeenCalledWith('login_attempts:192.168.1.1:user@test.com');
      expect(mockClient.expire).toHaveBeenCalledWith(
        'login_attempts:192.168.1.1:user@test.com',
        900,
      );
    });

    it('should increment counter without resetting expiry on subsequent attempts', async () => {
      mockClient.incr.mockResolvedValue(3);

      await guard.recordFailedAttempt('192.168.1.1', 'user@test.com');

      expect(mockClient.incr).toHaveBeenCalled();
      expect(mockClient.expire).not.toHaveBeenCalled();
    });

    it('should not throw on Redis errors', async () => {
      mockClient.incr.mockRejectedValue(new Error('Redis error'));

      await expect(
        guard.recordFailedAttempt('192.168.1.1', 'user@test.com'),
      ).resolves.not.toThrow();
    });
  });

  // =====================
  // clearAttempts
  // =====================
  describe('clearAttempts', () => {
    it('should delete the attempt counter key', async () => {
      mockRedisService.del.mockResolvedValue(1);

      await guard.clearAttempts('192.168.1.1', 'user@test.com');

      expect(mockRedisService.del).toHaveBeenCalledWith('login_attempts:192.168.1.1:user@test.com');
    });

    it('should not throw on Redis errors', async () => {
      mockRedisService.del.mockRejectedValue(new Error('Redis error'));

      await expect(
        guard.clearAttempts('192.168.1.1', 'user@test.com'),
      ).resolves.not.toThrow();
    });
  });
});

// =====================
// ApiRateLimitGuard
// =====================
describe('ApiRateLimitGuard', () => {
  let guard: ApiRateLimitGuard;

  const mockClient = {
    incr: jest.fn(),
    expire: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn().mockReturnValue(mockClient),
  };

  const createMockContext = (ip: string, route: string): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => ({
        ip,
        route: { path: route },
        url: route,
      }),
    }),
    getClass: jest.fn(),
    getHandler: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
  } as unknown as ExecutionContext);

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiRateLimitGuard,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    guard = module.get<ApiRateLimitGuard>(ApiRateLimitGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow request within rate limit', async () => {
    mockClient.incr.mockResolvedValue(1);

    const context = createMockContext('192.168.1.1', '/api/v1/contacts');
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockClient.incr).toHaveBeenCalledWith('api_rate:192.168.1.1:/api/v1/contacts');
    expect(mockClient.expire).toHaveBeenCalledWith(
      'api_rate:192.168.1.1:/api/v1/contacts',
      60,
    );
  });

  it('should allow request at exactly 100 requests', async () => {
    mockClient.incr.mockResolvedValue(100);

    const context = createMockContext('192.168.1.1', '/api/v1/contacts');
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should block request exceeding 100 requests per minute', async () => {
    mockClient.incr.mockResolvedValue(101);

    const context = createMockContext('192.168.1.1', '/api/v1/contacts');

    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);

    try {
      await guard.canActivate(context);
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it('should allow request when Redis fails (fail open)', async () => {
    mockClient.incr.mockRejectedValue(new Error('Redis down'));

    const context = createMockContext('192.168.1.1', '/api/v1/contacts');
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should not reset expiry on subsequent requests', async () => {
    mockClient.incr.mockResolvedValue(5);

    const context = createMockContext('192.168.1.1', '/api/v1/contacts');
    await guard.canActivate(context);

    expect(mockClient.expire).not.toHaveBeenCalled();
  });

  it('should use different keys for different IPs', async () => {
    mockClient.incr.mockResolvedValue(1);

    const ctx1 = createMockContext('10.0.0.1', '/api/v1/contacts');
    const ctx2 = createMockContext('10.0.0.2', '/api/v1/contacts');

    await guard.canActivate(ctx1);
    await guard.canActivate(ctx2);

    expect(mockClient.incr).toHaveBeenCalledWith('api_rate:10.0.0.1:/api/v1/contacts');
    expect(mockClient.incr).toHaveBeenCalledWith('api_rate:10.0.0.2:/api/v1/contacts');
  });

  it('should use different keys for different routes', async () => {
    mockClient.incr.mockResolvedValue(1);

    const ctx1 = createMockContext('10.0.0.1', '/api/v1/contacts');
    const ctx2 = createMockContext('10.0.0.1', '/api/v1/messages');

    await guard.canActivate(ctx1);
    await guard.canActivate(ctx2);

    expect(mockClient.incr).toHaveBeenCalledWith('api_rate:10.0.0.1:/api/v1/contacts');
    expect(mockClient.incr).toHaveBeenCalledWith('api_rate:10.0.0.1:/api/v1/messages');
  });
});
