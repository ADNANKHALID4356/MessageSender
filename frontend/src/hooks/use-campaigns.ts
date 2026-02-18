'use client';

import { useMutation, useQuery, useQueryClient, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import {
  campaignService,
  Campaign,
  CampaignStats,
  CampaignListParams,
  CreateCampaignRequest,
  UpdateCampaignRequest,
} from '@/services/campaign.service';
import { PaginatedResponse, ApiError } from '@/lib/api-client';

// Query keys
export const campaignKeys = {
  all: ['campaigns'] as const,
  lists: () => [...campaignKeys.all, 'list'] as const,
  list: (workspaceId: string, params?: CampaignListParams) => [...campaignKeys.lists(), workspaceId, params] as const,
  details: () => [...campaignKeys.all, 'detail'] as const,
  detail: (campaignId: string) => [...campaignKeys.details(), campaignId] as const,
  stats: (campaignId: string) => [...campaignKeys.detail(campaignId), 'stats'] as const,
  progress: (campaignId: string) => [...campaignKeys.detail(campaignId), 'progress'] as const,
};

/**
 * Hook to get campaigns list
 */
export function useCampaigns(
  workspaceId: string,
  params?: CampaignListParams,
  options?: Omit<UseQueryOptions<PaginatedResponse<Campaign>, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: campaignKeys.list(workspaceId, params),
    queryFn: () => campaignService.getCampaigns(workspaceId, params),
    enabled: !!workspaceId,
    ...options,
  });
}

/**
 * Hook to get a single campaign
 */
export function useCampaign(
  campaignId: string,
  options?: Omit<UseQueryOptions<Campaign, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: campaignKeys.detail(campaignId),
    queryFn: () => campaignService.getCampaign(campaignId),
    enabled: !!campaignId,
    ...options,
  });
}

/**
 * Hook to get campaign stats
 */
export function useCampaignStats(
  campaignId: string,
  options?: Omit<UseQueryOptions<CampaignStats, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: campaignKeys.stats(campaignId),
    queryFn: () => campaignService.getCampaignStats(campaignId),
    enabled: !!campaignId,
    ...options,
  });
}

/**
 * Hook to create campaign
 */
export function useCreateCampaign(
  workspaceId: string,
  options?: Omit<UseMutationOptions<Campaign, ApiError, CreateCampaignRequest>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCampaignRequest) => campaignService.createCampaign(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
    ...options,
  });
}

/**
 * Hook to update campaign
 */
export function useUpdateCampaign(
  options?: Omit<UseMutationOptions<Campaign, ApiError, { campaignId: string; data: UpdateCampaignRequest }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campaignId, data }: { campaignId: string; data: UpdateCampaignRequest }) =>
      campaignService.updateCampaign(campaignId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(variables.campaignId) });
    },
    ...options,
  });
}

/**
 * Hook to delete campaign
 */
export function useDeleteCampaign(
  options?: Omit<UseMutationOptions<{ message: string }, ApiError, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (campaignId: string) => campaignService.deleteCampaign(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
    ...options,
  });
}

/**
 * Hook to launch campaign
 */
export function useLaunchCampaign(
  options?: Omit<UseMutationOptions<Campaign, ApiError, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (campaignId: string) => campaignService.launchCampaign(campaignId),
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
    },
    ...options,
  });
}

/**
 * Hook to pause campaign
 */
export function usePauseCampaign(
  options?: Omit<UseMutationOptions<Campaign, ApiError, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (campaignId: string) => campaignService.pauseCampaign(campaignId),
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
    },
    ...options,
  });
}

/**
 * Hook to resume campaign
 */
export function useResumeCampaign(
  options?: Omit<UseMutationOptions<Campaign, ApiError, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (campaignId: string) => campaignService.resumeCampaign(campaignId),
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
    },
    ...options,
  });
}

/**
 * Hook to cancel campaign
 */
export function useCancelCampaign(
  options?: Omit<UseMutationOptions<Campaign, ApiError, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (campaignId: string) => campaignService.cancelCampaign(campaignId),
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
    },
    ...options,
  });
}

/**
 * Hook to duplicate campaign
 */
export function useDuplicateCampaign(
  options?: Omit<UseMutationOptions<Campaign, ApiError, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (campaignId: string) => campaignService.duplicateCampaign(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
    ...options,
  });
}

/**
 * Hook to schedule campaign
 */
export function useScheduleCampaign(
  options?: Omit<UseMutationOptions<Campaign, ApiError, { campaignId: string; scheduledAt: string }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campaignId, scheduledAt }: { campaignId: string; scheduledAt: string }) =>
      campaignService.scheduleCampaign(campaignId, scheduledAt),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(variables.campaignId) });
    },
    ...options,
  });
}
