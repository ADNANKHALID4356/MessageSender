import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuthStore, getDisplayName, getFirstName } from '@/stores/auth-store';
import { authService } from '@/services/auth.service';
import { tokenManager } from '@/lib/api-client';

// Mock dependencies
jest.mock('@/services/auth.service', () => ({
  authService: {
    isAuthenticated: jest.fn(),
    getProfile: jest.fn(),
    logout: jest.fn(),
  },
}));

jest.mock('@/lib/api-client', () => ({
  tokenManager: {
    clearTokens: jest.fn(),
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    setTokens: jest.fn(),
    isTokenExpired: jest.fn(),
  },
}));

describe('Auth Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the store before each test
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isInitialized: false,
      currentWorkspaceId: null,
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());
      
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.currentWorkspaceId).toBeNull();
    });
  });

  describe('setUser', () => {
    it('should set user correctly', () => {
      const { result } = renderHook(() => useAuthStore());
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isAdmin: false,
        workspaces: [],
      };

      act(() => {
        result.current.setUser(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe('setAuthenticated', () => {
    it('should set isAuthenticated correctly', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setAuthenticated(true);
      });

      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('setWorkspace', () => {
    it('should set currentWorkspaceId correctly', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setWorkspace('workspace-123');
      });

      expect(result.current.currentWorkspaceId).toBe('workspace-123');
    });
  });

  describe('setCurrentWorkspace', () => {
    it('should set workspace from membership object', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setCurrentWorkspace({
          workspaceId: 'workspace-456',
          workspaceName: 'Test Workspace',
          role: 'manager',
          permissions: ['read', 'write'],
        });
      });

      expect(result.current.currentWorkspaceId).toBe('workspace-456');
    });
  });

  describe('initialize', () => {
    it('should set isInitialized to true when no token', async () => {
      (authService.isAuthenticated as jest.Mock).mockReturnValue(false);
      
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should fetch profile when token exists', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        isAdmin: false,
        workspaces: [
          { workspaceId: 'ws-1', workspaceName: 'Workspace 1', role: 'owner', permissions: [] },
        ],
      };

      (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
      (authService.getProfile as jest.Mock).mockResolvedValue(mockUser);
      
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });

    it('should clear auth state when getProfile fails', async () => {
      (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
      (authService.getProfile as jest.Mock).mockRejectedValue(new Error('Unauthorized'));
      
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(tokenManager.clearTokens).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should clear auth state and call service logout', async () => {
      const { result } = renderHook(() => useAuthStore());

      // Set some initial state
      act(() => {
        result.current.setUser({
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'Test',
          isAdmin: false,
        });
        result.current.setAuthenticated(true);
      });

      (authService.logout as jest.Mock).mockResolvedValue(undefined);

      await act(async () => {
        await result.current.logout();
      });

      expect(authService.logout).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset to initial state but keep initialized', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set some state
      act(() => {
        result.current.setUser({
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'Test',
          isAdmin: false,
        });
        result.current.setAuthenticated(true);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isInitialized).toBe(true);
    });
  });
});

describe('Helper Functions', () => {
  describe('getDisplayName', () => {
    it('should return full name when firstName and lastName exist', () => {
      const user = { id: '1', email: 'test@example.com', firstName: 'John', lastName: 'Doe', isAdmin: false };
      expect(getDisplayName(user)).toBe('John Doe');
    });

    it('should return firstName only when lastName is missing', () => {
      const user = { id: '1', email: 'test@example.com', firstName: 'John', isAdmin: false };
      expect(getDisplayName(user)).toBe('John');
    });

    it('should return name when firstName is missing', () => {
      const user = { id: '1', email: 'test@example.com', name: 'John Doe', isAdmin: false };
      expect(getDisplayName(user)).toBe('John Doe');
    });

    it('should return email username when name fields are missing', () => {
      const user = { id: '1', email: 'john@example.com', isAdmin: false };
      expect(getDisplayName(user)).toBe('john');
    });

    it('should return empty string for null user', () => {
      expect(getDisplayName(null)).toBe('');
    });
  });

  describe('getFirstName', () => {
    it('should return firstName when available', () => {
      const user = { id: '1', email: 'test@example.com', firstName: 'John', lastName: 'Doe', isAdmin: false };
      expect(getFirstName(user)).toBe('John');
    });

    it('should return first part of name when firstName is missing', () => {
      const user = { id: '1', email: 'test@example.com', name: 'John Doe', isAdmin: false };
      expect(getFirstName(user)).toBe('John');
    });

    it('should return email username when name fields are missing', () => {
      const user = { id: '1', email: 'john@example.com', isAdmin: false };
      expect(getFirstName(user)).toBe('john');
    });

    it('should return empty string for null user', () => {
      expect(getFirstName(null)).toBe('');
    });
  });
});
