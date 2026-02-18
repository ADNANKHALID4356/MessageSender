'use client';

import { useMutation, useQuery, useQueryClient, UseQueryOptions, UseMutationOptions, useInfiniteQuery, UseInfiniteQueryOptions } from '@tanstack/react-query';
import {
  contactService,
  Contact,
  ContactListParams,
  CreateContactRequest,
  UpdateContactRequest,
  BulkTagRequest,
  ImportContactsRequest,
  ImportContactsResponse,
  EngagementLevel,
} from '@/services/contact.service';
import { PaginatedResponse, ApiError } from '@/lib/api-client';

// Query keys
export const contactKeys = {
  all: ['contacts'] as const,
  lists: () => [...contactKeys.all, 'list'] as const,
  list: (workspaceId: string, params?: ContactListParams) => [...contactKeys.lists(), workspaceId, params] as const,
  details: () => [...contactKeys.all, 'detail'] as const,
  detail: (workspaceId: string, id: string) => [...contactKeys.details(), workspaceId, id] as const,
  stats: (workspaceId: string) => [...contactKeys.all, 'stats', workspaceId] as const,
};

/**
 * Hook to get contacts with pagination
 */
export function useContacts(
  workspaceId: string,
  params?: ContactListParams,
  options?: Omit<UseQueryOptions<PaginatedResponse<Contact>, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: contactKeys.list(workspaceId, params),
    queryFn: () => contactService.getContacts(workspaceId, params),
    enabled: !!workspaceId,
    ...options,
  });
}

/**
 * Hook to get contacts with infinite scroll
 */
export function useInfiniteContacts(
  workspaceId: string,
  params?: Omit<ContactListParams, 'page'>,
  options?: Omit<UseInfiniteQueryOptions<PaginatedResponse<Contact>, ApiError>, 'queryKey' | 'queryFn' | 'getNextPageParam' | 'initialPageParam'>
) {
  return useInfiniteQuery({
    queryKey: contactKeys.list(workspaceId, params),
    queryFn: ({ pageParam }) =>
      contactService.getContacts(workspaceId, { ...params, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    enabled: !!workspaceId,
    ...options,
  });
}

/**
 * Hook to get single contact
 */
export function useContact(
  workspaceId: string,
  contactId: string,
  options?: Omit<UseQueryOptions<Contact, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: contactKeys.detail(workspaceId, contactId),
    queryFn: () => contactService.getContact(workspaceId, contactId),
    enabled: !!workspaceId && !!contactId,
    ...options,
  });
}

/**
 * Hook to get contact statistics
 */
export function useContactStats(
  workspaceId: string,
  options?: Omit<UseQueryOptions<{
    total: number;
    byEngagement: Record<EngagementLevel, number>;
    withinWindow: number;
    subscribed: number;
  }, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: contactKeys.stats(workspaceId),
    queryFn: () => contactService.getStats(workspaceId),
    enabled: !!workspaceId,
    ...options,
  });
}

/**
 * Hook to create contact
 */
export function useCreateContact(
  workspaceId: string,
  options?: Omit<UseMutationOptions<Contact, ApiError, CreateContactRequest>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateContactRequest) => contactService.createContact(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contactKeys.stats(workspaceId) });
    },
    ...options,
  });
}

/**
 * Hook to update contact
 */
export function useUpdateContact(
  workspaceId: string,
  options?: Omit<UseMutationOptions<Contact, ApiError, { id: string; data: UpdateContactRequest }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => contactService.updateContact(workspaceId, id, data),
    onSuccess: (data) => {
      queryClient.setQueryData(contactKeys.detail(workspaceId, data.id), data);
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
    },
    ...options,
  });
}

/**
 * Hook to delete contact
 */
export function useDeleteContact(
  workspaceId: string,
  options?: Omit<UseMutationOptions<{ message: string }, ApiError, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contactService.deleteContact(workspaceId, id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: contactKeys.detail(workspaceId, id) });
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contactKeys.stats(workspaceId) });
    },
    ...options,
  });
}

/**
 * Hook to bulk tag contacts
 */
export function useBulkTagContacts(
  workspaceId: string,
  options?: Omit<UseMutationOptions<{ updated: number }, ApiError, BulkTagRequest>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkTagRequest) => contactService.bulkTag(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
    },
    ...options,
  });
}

/**
 * Hook to bulk delete contacts
 */
export function useBulkDeleteContacts(
  workspaceId: string,
  options?: Omit<UseMutationOptions<{ deleted: number }, ApiError, string[]>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contactIds: string[]) => contactService.bulkDelete(workspaceId, contactIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contactKeys.stats(workspaceId) });
    },
    ...options,
  });
}

/**
 * Hook to import contacts
 */
export function useImportContacts(
  workspaceId: string,
  options?: Omit<UseMutationOptions<ImportContactsResponse, ApiError, ImportContactsRequest>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ImportContactsRequest) => contactService.importContacts(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contactKeys.stats(workspaceId) });
    },
    ...options,
  });
}
