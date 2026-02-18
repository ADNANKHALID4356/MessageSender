'use client';

import { useMutation, useQuery, useQueryClient, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import {
  contactService,
  Tag,
  CreateTagRequest,
  UpdateTagRequest,
} from '@/services/contact.service';
import { ApiError } from '@/lib/api-client';

// Query keys
export const tagKeys = {
  all: ['tags'] as const,
  lists: () => [...tagKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...tagKeys.lists(), workspaceId] as const,
};

/**
 * Hook to get all tags for a workspace
 */
export function useTags(
  workspaceId: string,
  options?: Omit<UseQueryOptions<Tag[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: tagKeys.list(workspaceId),
    queryFn: () => contactService.getTags(workspaceId),
    enabled: !!workspaceId,
    ...options,
  });
}

/**
 * Hook to create a tag
 */
export function useCreateTag(
  workspaceId: string,
  options?: Omit<UseMutationOptions<Tag, ApiError, CreateTagRequest>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTagRequest) => contactService.createTag(workspaceId, data),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
      options?.onSuccess?.(...args);
    },
    onError: options?.onError,
  });
}

/**
 * Hook to update a tag
 */
export function useUpdateTag(
  workspaceId: string,
  options?: Omit<UseMutationOptions<Tag, ApiError, { tagId: string; data: UpdateTagRequest }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tagId, data }) => contactService.updateTag(workspaceId, tagId, data),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
      options?.onSuccess?.(...args);
    },
    onError: options?.onError,
  });
}

/**
 * Hook to delete a tag
 */
export function useDeleteTag(
  workspaceId: string,
  options?: Omit<UseMutationOptions<void, ApiError, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tagId: string) => contactService.deleteTag(workspaceId, tagId),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
      options?.onSuccess?.(...args);
    },
    onError: options?.onError,
  });
}
