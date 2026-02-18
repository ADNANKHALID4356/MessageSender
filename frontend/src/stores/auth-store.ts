import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authService, AuthUser, WorkspaceMembership } from '@/services/auth.service';
import { tokenManager } from '@/lib/api-client';

// Re-export types for convenience
export type { AuthUser as User, WorkspaceMembership as WorkspaceAccess };

export interface AuthState {
  // State
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  currentWorkspaceId: string | null;
  
  // Computed-like getters (will be handled via selectors)
  
  // Actions
  setUser: (user: AuthUser | null) => void;
  setAuthenticated: (value: boolean) => void;
  setWorkspace: (workspaceId: string | null) => void;
  setCurrentWorkspace: (workspace: WorkspaceMembership) => void;
  initialize: () => Promise<void>;
  login: (credentials: { username: string; password: string; rememberMe?: boolean }, isAdmin?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  currentWorkspaceId: null,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) => set({ user }),
      
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      
      setWorkspace: (currentWorkspaceId) => set({ currentWorkspaceId }),
      
      setCurrentWorkspace: (workspace) => set({ currentWorkspaceId: workspace.workspaceId }),
      
      login: async (credentials, isAdmin = false) => {
        set({ isLoading: true });
        try {
          const response = await authService.login({
            username: credentials.username,
            password: credentials.password,
            rememberMe: credentials.rememberMe,
            isAdmin,
          });
          
          // Store tokens
          tokenManager.setTokens(response.accessToken, response.refreshToken);
          
          // Get user profile
          const user = await authService.getProfile();
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            currentWorkspaceId: user.workspaces?.[0]?.workspaceId || null,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      
      initialize: async () => {
        const hasToken = authService.isAuthenticated();
        
        if (!hasToken) {
          set({ isInitialized: true, isAuthenticated: false, user: null });
          return;
        }
        
        try {
          const user = await authService.getProfile();
          const currentWorkspaceId = get().currentWorkspaceId;
          
          // Ensure current workspace is still valid for this user
          const validWorkspace = user.workspaces?.find(
            (w) => w.workspaceId === currentWorkspaceId
          );
          
          set({
            user,
            isAuthenticated: true,
            isInitialized: true,
            currentWorkspaceId: validWorkspace?.workspaceId || user.workspaces?.[0]?.workspaceId || null,
          });
        } catch (error) {
          // Token is invalid, clear everything
          tokenManager.clearTokens();
          set({ ...initialState, isInitialized: true });
        }
      },
      
      logout: async () => {
        try {
          await authService.logout();
        } finally {
          set({ ...initialState, isInitialized: true });
        }
      },
      
      reset: () => set({ ...initialState, isInitialized: true }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist workspace selection, not user data
        // User data will be fetched fresh on app load
        currentWorkspaceId: state.currentWorkspaceId,
      }),
    }
  )
);

// Selector hooks for common patterns
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useCurrentWorkspaceId = () => useAuthStore((state) => state.currentWorkspaceId);

export const useCurrentWorkspace = () => {
  const user = useAuthStore((state) => state.user);
  const currentWorkspaceId = useAuthStore((state) => state.currentWorkspaceId);
  
  if (!user?.workspaces || !currentWorkspaceId) return null;
  return user.workspaces.find((w) => w.workspaceId === currentWorkspaceId) || null;
};

export const useHasPermission = (permission: string) => {
  const workspace = useCurrentWorkspace();
  if (!workspace) return false;
  // Check permissions array - note: backend uses permissionLevel which may need mapping
  return workspace.permissions?.includes(permission) || workspace.role === 'owner';
};

// Helper function to get display name
export const getDisplayName = (user: AuthUser | null): string => {
  if (!user) return '';
  if (user.firstName) {
    return user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName;
  }
  return user.name || user.email.split('@')[0];
};

export const getFirstName = (user: AuthUser | null): string => {
  if (!user) return '';
  return user.firstName || user.name?.split(' ')[0] || user.email.split('@')[0];
};
