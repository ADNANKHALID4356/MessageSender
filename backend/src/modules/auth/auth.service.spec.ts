import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { LoginRateLimitGuard } from './guards/rate-limit.guard';
import { LoginDto } from './dto/login.dto';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let redisService: RedisService;
  let loginRateLimitGuard: LoginRateLimitGuard;

  // Mock data
  const mockAdmin = {
    id: 'admin-uuid-123',
    username: 'admin',
    email: 'admin@example.com',
    passwordHash: 'hashedPassword123',
    firstName: 'Admin',
    lastName: 'User',
    lastLoginAt: null,
  };

  const mockUser = {
    id: 'user-uuid-456',
    email: 'user@example.com',
    passwordHash: 'hashedPassword456',
    firstName: 'Test',
    lastName: 'User',
    status: 'ACTIVE',
    lastLoginAt: null,
    workspaceAccess: [
      {
        workspaceId: 'workspace-uuid-789',
        permissionLevel: 'MANAGER',
        workspace: {
          name: 'Test Workspace',
        },
      },
    ],
  };

  const mockPrismaService = {
    admin: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    loginAttempt: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    signAsync: jest.fn(),
    verify: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    setJson: jest.fn(),
    getJson: jest.fn(),
    delJson: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_EXPIRES_IN: '1h',
      };
      return config[key] || defaultValue;
    }),
  };

  const mockLoginRateLimitGuard = {
    recordFailedAttempt: jest.fn().mockResolvedValue(undefined),
    clearAttempts: jest.fn().mockResolvedValue(undefined),
    canActivate: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: LoginRateLimitGuard, useValue: mockLoginRateLimitGuard },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    redisService = module.get<RedisService>(RedisService);
    loginRateLimitGuard = module.get<LoginRateLimitGuard>(LoginRateLimitGuard);
  });

  describe('validateAdmin', () => {
    it('should return null when admin is not found', async () => {
      mockPrismaService.admin.findUnique.mockResolvedValue(null);

      const result = await authService.validateAdmin('nonexistent', 'password');

      expect(result).toBeNull();
      expect(mockPrismaService.admin.findUnique).toHaveBeenCalledWith({
        where: { username: 'nonexistent' },
      });
    });

    it('should return null when password is incorrect', async () => {
      mockPrismaService.admin.findUnique.mockResolvedValue(mockAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await authService.validateAdmin('admin', 'wrongpassword');

      expect(result).toBeNull();
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', mockAdmin.passwordHash);
    });

    it('should return AuthUser when credentials are valid', async () => {
      mockPrismaService.admin.findUnique.mockResolvedValue(mockAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.validateAdmin('admin', 'correctpassword');

      expect(result).toEqual({
        id: mockAdmin.id,
        email: mockAdmin.email,
        firstName: mockAdmin.firstName,
        lastName: mockAdmin.lastName,
        isAdmin: true,
      });
    });
  });

  describe('validateUser', () => {
    it('should return null when user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await authService.validateUser('notfound@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null when user is inactive', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: 'INACTIVE',
      });

      const result = await authService.validateUser('user@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await authService.validateUser('user@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should return AuthUser with workspaces when credentials are valid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.validateUser('user@example.com', 'correctpassword');

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        isAdmin: false,
        workspaces: [
          {
            workspaceId: 'workspace-uuid-789',
            workspaceName: 'Test Workspace',
            permissionLevel: expect.anything(),
          },
        ],
      });
    });
  });

  describe('adminLogin', () => {
    const loginDto: LoginDto = {
      username: 'admin',
      password: 'correctpassword',
      rememberMe: false,
    };

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      mockPrismaService.admin.findUnique.mockResolvedValue(null);

      await expect(authService.adminLogin(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens and user on successful login', async () => {
      mockPrismaService.admin.findUnique.mockResolvedValue(mockAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.admin.update.mockResolvedValue(mockAdmin);
      mockPrismaService.session.create.mockResolvedValue({
        id: 'session-uuid',
        refreshToken: 'refresh-token',
      });
      mockJwtService.sign.mockReturnValue('access-token');
      mockRedisService.set.mockResolvedValue('OK');

      const result = await authService.adminLogin(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.isAdmin).toBe(true);
    });
  });

  describe('userLogin', () => {
    const loginDto: LoginDto = {
      username: 'user@example.com',
      password: 'correctpassword',
      rememberMe: false,
    };

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(authService.userLogin(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens and user with workspaces on successful login', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.session.create.mockResolvedValue({
        id: 'session-uuid',
        refreshToken: 'refresh-token',
      });
      mockJwtService.sign.mockReturnValue('access-token');
      mockRedisService.set.mockResolvedValue('OK');

      const result = await authService.userLogin(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.isAdmin).toBe(false);
      expect(result.user.workspaces).toBeDefined();
    });
  });
});
