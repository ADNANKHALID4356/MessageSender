'use client';

import { useMutation, useQuery, useQueryClient, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import {
  workspaceService,
  Workspace,
  WorkspaceMember,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  AddMemberRequest,
  UpdateMemberRequest,
  WorkspaceListParams,
} from '@/services/workspace.service';
import { PaginatedResponse, ApiError } from '@/lib/api-client';

// Query keys
export const workspaceKeys = {
  all: ['workspaces'] as const,
  lists: () => [...workspaceKeys.all, 'list'] as const,
  list: (params?: WorkspaceListParams) => [...workspaceKeys.lists(), params] as const,
  details: () => [...workspaceKeys.all, 'detail'] as const,
  detail: (id: string) => [...workspaceKeys.details(), id] as const,
  members: (id: string) => [...workspaceKeys.detail(id), 'members'] as const,
  stats: (id: string) => [...workspaceKeys.detail(id), 'stats'] as const,
};

/**
 * Hook to get workspaces list
 */
export function useWorkspaces(
  params?: WorkspaceListParams,
  options?: Omit<UseQueryOptions<PaginatedResponse<Workspace>, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: workspaceKeys.list(params),
    queryFn: () => workspaceService.getWorkspaces(params),
    ...options,
  });
}

/**
 * Hook to get single workspace
 */
export function useWorkspace(
  id: string,
  options?: Omit<UseQueryOptions<Workspace, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: workspaceKeys.detail(id),
    queryFn: () => workspaceService.getWorkspace(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Hook to get workspace members
 */
export function useWorkspaceMembers(
  workspaceId: string,
  options?: Omit<UseQueryOptions<WorkspaceMember[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: () => workspaceService.getMembers(workspaceId),
    enabled: !!workspaceId,
    ...options,
  });
}

/**
 * Hook to get workspace stats
 */
export function useWorkspaceStats(
  workspaceId: string,
  options?: Omit<UseQueryOptions<{ contacts: number; messages: number; conversations: number; campaigns: number }, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: workspaceKeys.stats(workspaceId),
    queryFn: () => workspaceService.getStats(workspaceId),
    enabled: !!workspaceId,
    ...options,
  });
}

/**
 * Hook to create workspace
 */
export function useCreateWorkspace(
  options?: Omit<UseMutationOptions<Workspace, ApiError, CreateWorkspaceRequest>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkspaceRequest) => workspaceService.createWorkspace(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
    ...options,
  });
}

/**
 * Hook to update workspace
 */
export function useUpdateWorkspace(
  options?: Omit<UseMutationOptions<Workspace, ApiError, { id: string; data: UpdateWorkspaceRequest }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => workspaceService.updateWorkspace(id, data),
    onSuccess: (data) => {
      queryClient.setQueryData(workspaceKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
    ...options,
  });
}

/**
 * Hook to delete workspace
 */
export function useDeleteWorkspace(
  options?: Omit<UseMutationOptions<{ message: string }, ApiError, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workspaceService.deleteWorkspace(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: workspaceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
    ...options,
  });
}

/**
 * Hook to add member to workspace
 */
export function useAddWorkspaceMember(
  workspaceId: string,
  options?: Omit<UseMutationOptions<WorkspaceMember, ApiError, AddMemberRequest>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddMemberRequest) => workspaceService.addMember(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });
    },
    ...options,
  });
}

/**
 * Hook to update workspace member
 */
export function useUpdateWorkspaceMember(
  workspaceId: string,
  options?: Omit<UseMutationOptions<WorkspaceMember, ApiError, { userId: string; data: UpdateMemberRequest }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }) => workspaceService.updateMember(workspaceId, userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });
    },
    ...options,
  });
}

/**
 * Hook to remove member from workspace
 */
export function useRemoveWorkspaceMember(
  workspaceId: string,
  options?: Omit<UseMutationOptions<{ message: string }, ApiError, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => workspaceService.removeMember(workspaceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });
    },
    ...options,
  });
}
