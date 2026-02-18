import { tokenManager } from './api-client';

// The global jest.setup.ts mocks localStorage with jest.fn() stubs,
// so getItem returns undefined by default and setItem doesn't persist.
// We configure mock return values per-test.

describe('TokenManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAccessToken', () => {
    it('should return null when no token stored', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
      expect(tokenManager.getAccessToken()).toBeNull();
    });

    it('should return stored access token', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('test-token');
      expect(tokenManager.getAccessToken()).toBe('test-token');
    });
  });

  describe('getRefreshToken', () => {
    it('should return null when no refresh token', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
      expect(tokenManager.getRefreshToken()).toBeNull();
    });

    it('should return stored refresh token', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('refresh-123');
      expect(tokenManager.getRefreshToken()).toBe('refresh-123');
    });
  });

  describe('setTokens', () => {
    it('should store both tokens', () => {
      tokenManager.setTokens('access-1', 'refresh-1');
      expect(localStorage.setItem).toHaveBeenCalledWith('access_token', 'access-1');
      expect(localStorage.setItem).toHaveBeenCalledWith('refresh_token', 'refresh-1');
    });
  });

  describe('clearTokens', () => {
    it('should remove both tokens', () => {
      tokenManager.clearTokens();
      expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('isTokenExpired', () => {
    it('should return true for expired token', () => {
      const expiredPayload = { sub: 'user-1', exp: Math.floor(Date.now() / 1000) - 3600 };
      const payload = btoa(JSON.stringify(expiredPayload));
      const token = `header.${payload}.signature`;
      expect(tokenManager.isTokenExpired(token)).toBe(true);
    });

    it('should return false for valid token', () => {
      const validPayload = { sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600 };
      const payload = btoa(JSON.stringify(validPayload));
      const token = `header.${payload}.signature`;
      expect(tokenManager.isTokenExpired(token)).toBe(false);
    });

    it('should return true for malformed token', () => {
      expect(tokenManager.isTokenExpired('not-a-jwt')).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(tokenManager.isTokenExpired('')).toBe(true);
    });
  });
});
