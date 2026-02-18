import { authService } from '@/services/auth.service';
import api, { tokenManager } from '@/lib/api-client';

// Mock the api client
jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
  },
  tokenManager: {
    setTokens: jest.fn(),
    getRefreshToken: jest.fn(),
    clearTokens: jest.fn(),
    getAccessToken: jest.fn(),
    isTokenExpired: jest.fn(),
  },
}));

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginData = {
      username: 'test@example.com',
      password: 'password123',
      rememberMe: false,
      isAdmin: false,
    };

    const mockResponse = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isAdmin: false,
        workspaces: [],
      },
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    };

    it('should call correct endpoint for regular user login', async () => {
      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.login(loginData);

      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        username: loginData.username,
        password: loginData.password,
        rememberMe: loginData.rememberMe,
      });
      expect(tokenManager.setTokens).toHaveBeenCalledWith(
        'mock-access-token',
        'mock-refresh-token'
      );
      expect(result).toEqual(mockResponse);
    });

    it('should call admin endpoint when isAdmin is true', async () => {
      const adminLoginData = { ...loginData, isAdmin: true };
      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      await authService.login(adminLoginData);

      expect(api.post).toHaveBeenCalledWith('/auth/admin/login', expect.any(Object));
    });
  });

  describe('logout', () => {
    it('should call logout endpoint and clear tokens', async () => {
      (tokenManager.getRefreshToken as jest.Mock).mockReturnValue('refresh-token');
      (api.post as jest.Mock).mockResolvedValue(undefined);

      await authService.logout();

      expect(api.post).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'refresh-token' });
      expect(tokenManager.clearTokens).toHaveBeenCalled();
    });

    it('should clear tokens even if logout fails', async () => {
      (tokenManager.getRefreshToken as jest.Mock).mockReturnValue('refresh-token');
      (api.post as jest.Mock).mockRejectedValue(new Error('Network error'));

      await authService.logout();

      expect(tokenManager.clearTokens).toHaveBeenCalled();
    });

    it('should skip API call if no refresh token', async () => {
      (tokenManager.getRefreshToken as jest.Mock).mockReturnValue(null);

      await authService.logout();

      expect(api.post).not.toHaveBeenCalled();
      expect(tokenManager.clearTokens).toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should call profile endpoint', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        isAdmin: false,
      };
      (api.get as jest.Mock).mockResolvedValue(mockProfile);

      const result = await authService.getProfile();

      expect(api.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockProfile);
    });
  });

  describe('updateProfile', () => {
    it('should call update profile endpoint', async () => {
      const updateData = { name: 'New Name' };
      const mockResponse = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'New',
        lastName: 'Name',
        isAdmin: false,
      };
      (api.patch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.updateProfile(updateData);

      expect(api.patch).toHaveBeenCalledWith('/auth/profile', updateData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('changePassword', () => {
    it('should call change password endpoint', async () => {
      const changeData = {
        currentPassword: 'oldPass123',
        newPassword: 'newPass456',
      };
      (api.post as jest.Mock).mockResolvedValue({ message: 'Password changed' });

      const result = await authService.changePassword(changeData);

      expect(api.post).toHaveBeenCalledWith('/auth/change-password', changeData);
      expect(result.message).toBe('Password changed');
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no token', () => {
      (tokenManager.getAccessToken as jest.Mock).mockReturnValue(null);

      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return false when token is expired', () => {
      (tokenManager.getAccessToken as jest.Mock).mockReturnValue('some-token');
      (tokenManager.isTokenExpired as jest.Mock).mockReturnValue(true);

      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return true when token exists and is valid', () => {
      (tokenManager.getAccessToken as jest.Mock).mockReturnValue('some-token');
      (tokenManager.isTokenExpired as jest.Mock).mockReturnValue(false);

      expect(authService.isAuthenticated()).toBe(true);
    });
  });
});
