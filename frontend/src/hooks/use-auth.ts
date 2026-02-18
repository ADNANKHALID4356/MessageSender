'use client';

import { useMutation, useQuery, useQueryClient, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import { authService, LoginRequest, LoginResponse, AuthUser, ChangePasswordRequest, UpdateProfileRequest, SessionInfo } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api-client';

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  profile: () => [...authKeys.all, 'profile'] as const,
  sessions: () => [...authKeys.all, 'sessions'] as const,
  notificationPreferences: () => [...authKeys.all, 'notification-preferences'] as const,
};

/**
 * Hook to get current user profile
 */
export function useProfile(options?: Omit<UseQueryOptions<AuthUser, ApiError>, 'queryKey' | 'queryFn'>) {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: authKeys.profile(),
    queryFn: () => authService.getProfile(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Hook for login
 */
export function useLogin(
  options?: Omit<UseMutationOptions<LoginResponse, ApiError, LoginRequest>, 'mutationFn'>
) {
  const { setUser, setAuthenticated, setWorkspace } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: LoginRequest) => authService.login(data),
    onSuccess: (data) => {
      setUser(data.user);
      setAuthenticated(true);

      // Set default workspace if available
      if (data.user.workspaces?.length) {
        setWorkspace(data.user.workspaces[0].workspaceId);
      }

      // Invalidate and refetch profile
      queryClient.invalidateQueries({ queryKey: authKeys.profile() });

      // Redirect to dashboard
      router.push('/dashboard');
    },
    ...options,
  });
}

/**
 * Hook for logout
 */
export function useLogout(
  options?: Omit<UseMutationOptions<void, ApiError, void>, 'mutationFn'>
) {
  const { reset } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      reset();
      queryClient.clear();
      router.push('/login');
    },
    onError: () => {
      // Even on error, clear local state and redirect
      reset();
      queryClient.clear();
      router.push('/login');
    },
    ...options,
  });
}

/**
 * Hook for updating profile
 */
export function useUpdateProfile(
  options?: Omit<UseMutationOptions<AuthUser, ApiError, UpdateProfileRequest>, 'mutationFn'>
) {
  const { setUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => authService.updateProfile(data),
    onSuccess: (data) => {
      setUser(data);
      queryClient.setQueryData(authKeys.profile(), data);
    },
    ...options,
  });
}

/**
 * Hook for changing password
 */
export function useChangePassword(
  options?: Omit<UseMutationOptions<{ message: string }, ApiError, ChangePasswordRequest>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => authService.changePassword(data),
    ...options,
  });
}

/**
 * Hook for setting current workspace
 */
export function useSetWorkspace(
  options?: Omit<UseMutationOptions<{ message: string }, ApiError, string>, 'mutationFn'>
) {
  const { setWorkspace } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => authService.setCurrentWorkspace(workspaceId),
    onSuccess: (_, workspaceId) => {
      setWorkspace(workspaceId);
      // Invalidate workspace-specific queries
      queryClient.invalidateQueries();
    },
    ...options,
  });
}

/**
 * Hook to get active sessions for the current user
 */
export function useSessions(
  options?: Omit<UseQueryOptions<SessionInfo[], ApiError>, 'queryKey' | 'queryFn'>
) {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: authKeys.sessions(),
    queryFn: () => authService.getSessions(),
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

/**
 * Hook for terminating a specific session
 */
export function useTerminateSession(
  options?: Omit<UseMutationOptions<{ message: string }, ApiError, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => authService.terminateSession(sessionId),
    onSuccess: () => {
      // Refetch sessions list after termination
      queryClient.invalidateQueries({ queryKey: authKeys.sessions() });
    },
    ...options,
  });
}
