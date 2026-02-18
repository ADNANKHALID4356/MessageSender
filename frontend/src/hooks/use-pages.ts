'use client';

import { useMutation, useQuery, useQueryClient, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import {
  pageService,
  Page,
  PageStats,
  UpdatePageRequest,
  TokenValidation,
  WebhookStatus,
} from '@/services/page.service';
import {
  facebookService,
  ConnectionStatus,
  FacebookPage,
  ConnectPageRequest,
} from '@/services/facebook.service';
import { ApiError } from '@/lib/api-client';

// Query keys
export const pageKeys = {
  all: ['pages'] as const,
  lists: () => [...pageKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...pageKeys.lists(), workspaceId] as const,
  details: () => [...pageKeys.all, 'detail'] as const,
  detail: (workspaceId: string, pageId: string) => [...pageKeys.details(), workspaceId, pageId] as const,
  stats: (workspaceId: string, pageId: string) => [...pageKeys.detail(workspaceId, pageId), 'stats'] as const,
  token: (workspaceId: string, pageId: string) => [...pageKeys.detail(workspaceId, pageId), 'token'] as const,
  // Facebook connection
  connectionStatus: (workspaceId: string) => ['facebook', 'status', workspaceId] as const,
  availablePages: (accountId: string) => ['facebook', 'pages', accountId] as const,
};

/**
 * Hook to get all pages for a workspace
 */
export function usePages(
  workspaceId: string,
  options?: Omit<UseQueryOptions<Page[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: pageKeys.list(workspaceId),
    queryFn: () => pageService.getPages(workspaceId),
    enabled: !!workspaceId,
    ...options,
  });
}

/**
 * Hook to get a single page
 */
export function usePage(
  workspaceId: string,
  pageId: string,
  options?: Omit<UseQueryOptions<Page, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: pageKeys.detail(workspaceId, pageId),
    queryFn: () => pageService.getPage(workspaceId, pageId),
    enabled: !!workspaceId && !!pageId,
    ...options,
  });
}

/**
 * Hook to get page stats
 */
export function usePageStats(
  workspaceId: string,
  pageId: string,
  options?: Omit<UseQueryOptions<PageStats, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: pageKeys.stats(workspaceId, pageId),
    queryFn: () => pageService.getStats(workspaceId, pageId),
    enabled: !!workspaceId && !!pageId,
    ...options,
  });
}

/**
 * Hook to validate page token
 */
export function usePageToken(
  workspaceId: string,
  pageId: string,
  options?: Omit<UseQueryOptions<TokenValidation, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: pageKeys.token(workspaceId, pageId),
    queryFn: () => pageService.validateToken(workspaceId, pageId),
    enabled: !!workspaceId && !!pageId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    ...options,
  });
}

/**
 * Hook to get Facebook connection status for workspace
 */
export function useFacebookConnectionStatus(
  workspaceId: string,
  options?: Omit<UseQueryOptions<ConnectionStatus, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: pageKeys.connectionStatus(workspaceId),
    queryFn: () => facebookService.getConnectionStatus(workspaceId),
    enabled: !!workspaceId,
    ...options,
  });
}

/**
 * Hook to get available Facebook pages from an account
 */
export function useFacebookAvailablePages(
  accountId: string,
  options?: Omit<UseQueryOptions<FacebookPage[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: pageKeys.availablePages(accountId),
    queryFn: () => facebookService.getAvailablePages(accountId),
    enabled: !!accountId,
    ...options,
  });
}

/**
 * Hook to update page settings
 */
export function useUpdatePage(
  workspaceId: string,
  options?: Omit<UseMutationOptions<Page, ApiError, { pageId: string; data: UpdatePageRequest }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pageId, data }: { pageId: string; data: UpdatePageRequest }) =>
      pageService.updatePage(workspaceId, pageId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: pageKeys.list(workspaceId) });
      queryClient.invalidateQueries({ queryKey: pageKeys.detail(workspaceId, variables.pageId) });
    },
    ...options,
  });
}

/**
 * Hook to sync page with Facebook
 */
export function useSyncPage(
  workspaceId: string,
  options?: Omit<UseMutationOptions<Page, ApiError, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pageId: string) => pageService.syncPage(workspaceId, pageId),
    onSuccess: (_, pageId) => {
      queryClient.invalidateQueries({ queryKey: pageKeys.list(workspaceId) });
      queryClient.invalidateQueries({ queryKey: pageKeys.detail(workspaceId, pageId) });
    },
    ...options,
  });
}

/**
 * Hook to deactivate a page
 */
export function useDeactivatePage(
  workspaceId: string,
  options?: Omit<UseMutationOptions<void, ApiError, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pageId: string) => pageService.deactivatePage(workspaceId, pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pageKeys.list(workspaceId) });
    },
    ...options,
  });
}

/**
 * Hook to reactivate a page
 */
export function useReactivatePage(
  workspaceId: string,
  options?: Omit<UseMutationOptions<Page, ApiError, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pageId: string) => pageService.reactivatePage(workspaceId, pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pageKeys.list(workspaceId) });
    },
    ...options,
  });
}

/**
 * Hook to fix webhook subscription
 */
export function useFixWebhook(
  workspaceId: string,
  options?: Omit<UseMutationOptions<WebhookStatus, ApiError, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pageId: string) => pageService.fixWebhook(workspaceId, pageId),
    onSuccess: (_, pageId) => {
      queryClient.invalidateQueries({ queryKey: pageKeys.list(workspaceId) });
      queryClient.invalidateQueries({ queryKey: pageKeys.detail(workspaceId, pageId) });
    },
    ...options,
  });
}

/**
 * Hook to initiate Facebook OAuth
 */
export function useInitiateFacebookOAuth(
  options?: Omit<UseMutationOptions<{ authUrl: string }, ApiError, string>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (workspaceId: string) => facebookService.initiateOAuth(workspaceId),
    ...options,
  });
}

/**
 * Hook to connect a Facebook page to workspace
 */
export function useConnectFacebookPage(
  workspaceId: string,
  options?: Omit<UseMutationOptions<FacebookPage, ApiError, ConnectPageRequest>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConnectPageRequest) => facebookService.connectPage(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pageKeys.list(workspaceId) });
      queryClient.invalidateQueries({ queryKey: pageKeys.connectionStatus(workspaceId) });
    },
    ...options,
  });
}

/**
 * Hook to disconnect a Facebook page
 */
export function useDisconnectFacebookPage(
  workspaceId: string,
  options?: Omit<UseMutationOptions<void, ApiError, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pageId: string) => facebookService.disconnectPage(workspaceId, pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pageKeys.list(workspaceId) });
      queryClient.invalidateQueries({ queryKey: pageKeys.connectionStatus(workspaceId) });
    },
    ...options,
  });
}

/**
 * Hook to disconnect Facebook account from workspace
 */
export function useDisconnectFacebookAccount(
  options?: Omit<UseMutationOptions<void, ApiError, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => facebookService.disconnectAccount(workspaceId),
    onSuccess: (_, workspaceId) => {
      queryClient.invalidateQueries({ queryKey: pageKeys.list(workspaceId) });
      queryClient.invalidateQueries({ queryKey: pageKeys.connectionStatus(workspaceId) });
    },
    ...options,
  });
}

/**
 * Hook to refresh Facebook account token
 */
export function useRefreshFacebookAccount(
  options?: Omit<UseMutationOptions<{ success: boolean; expiresAt: string }, ApiError, string>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (accountId: string) => facebookService.refreshToken(accountId),
    ...options,
  });
}
