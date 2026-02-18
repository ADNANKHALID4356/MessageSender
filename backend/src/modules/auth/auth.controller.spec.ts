import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginRateLimitGuard } from './guards/rate-limit.guard';
import { RedisService } from '../../redis/redis.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    adminLogin: jest.fn(),
    userLogin: jest.fn(),
    refreshTokens: jest.fn(),
    getAuthUser: jest.fn(),
    logout: jest.fn(),
    logoutAllSessions: jest.fn(),
    changePassword: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn().mockReturnValue({ get: jest.fn(), incr: jest.fn(), expire: jest.fn(), ttl: jest.fn() }),
    del: jest.fn(),
  };

  const mockAuthUser = {
    id: 'user-uuid',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    isAdmin: false,
    workspaces: [
      {
        workspaceId: 'workspace-uuid',
        workspaceName: 'Test Workspace',
        permissionLevel: 'MANAGER',
      },
    ],
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: RedisService, useValue: mockRedisService },
        LoginRateLimitGuard,
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('adminLogin', () => {
    const loginDto = { username: 'admin', password: 'password123', rememberMe: false };
    const ipAddress = '127.0.0.1';
    const userAgent = 'test-agent';

    it('should call authService.adminLogin with correct parameters', async () => {
      mockAuthService.adminLogin.mockResolvedValue({
        ...mockTokens,
        user: { ...mockAuthUser, isAdmin: true },
      });

      const result = await controller.adminLogin(loginDto, ipAddress, userAgent);

      expect(mockAuthService.adminLogin).toHaveBeenCalledWith(loginDto, ipAddress, userAgent);
      expect(result.user.isAdmin).toBe(true);
      expect(result.accessToken).toBe('mock-access-token');
    });
  });

  describe('userLogin', () => {
    const loginDto = { username: 'user@example.com', password: 'password123', rememberMe: false };
    const ipAddress = '127.0.0.1';
    const userAgent = 'test-agent';

    it('should call authService.userLogin with correct parameters', async () => {
      mockAuthService.userLogin.mockResolvedValue({
        ...mockTokens,
        user: mockAuthUser,
      });

      const result = await controller.userLogin(loginDto, ipAddress, userAgent);

      expect(mockAuthService.userLogin).toHaveBeenCalledWith(loginDto, ipAddress, userAgent);
      expect(result.user.isAdmin).toBe(false);
    });
  });

  describe('refreshToken', () => {
    const refreshTokenDto = { refreshToken: 'valid-refresh-token' };

    it('should call authService.refreshTokens', async () => {
      mockAuthService.refreshTokens.mockResolvedValue(mockTokens);

      const result = await controller.refreshToken(refreshTokenDto);

      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(refreshTokenDto);
      expect(result.accessToken).toBe('mock-access-token');
    });
  });

  describe('getProfile', () => {
    it('should call authService.getAuthUser with user id', async () => {
      mockAuthService.getAuthUser.mockResolvedValue(mockAuthUser);

      const result = await controller.getProfile({
        userId: 'user-uuid',
        isAdmin: false,
      });

      expect(mockAuthService.getAuthUser).toHaveBeenCalledWith('user-uuid', false);
      expect(result?.email).toBe('test@example.com');
    });
  });

  describe('logout', () => {
    it('should call authService.logout with session id', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout({ sessionId: 'session-uuid' });

      expect(mockAuthService.logout).toHaveBeenCalledWith('session-uuid');
      expect(result.message).toBe('Logged out successfully');
    });
  });

  describe('logoutAll', () => {
    it('should call authService.logoutAllSessions', async () => {
      mockAuthService.logoutAllSessions.mockResolvedValue(undefined);

      const result = await controller.logoutAll({
        userId: 'user-uuid',
        isAdmin: false,
      });

      expect(mockAuthService.logoutAllSessions).toHaveBeenCalledWith('user-uuid', false);
      expect(result.message).toBe('All sessions logged out successfully');
    });
  });

  describe('changePassword', () => {
    const changePasswordDto = {
      currentPassword: 'oldPassword123',
      newPassword: 'newPassword456',
    };

    it('should call authService.changePassword', async () => {
      mockAuthService.changePassword.mockResolvedValue(undefined);

      const result = await controller.changePassword(
        { userId: 'user-uuid', isAdmin: false },
        changePasswordDto,
      );

      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        'user-uuid',
        false,
        changePasswordDto,
      );
      expect(result.message).toBe('Password changed successfully');
    });
  });
});
