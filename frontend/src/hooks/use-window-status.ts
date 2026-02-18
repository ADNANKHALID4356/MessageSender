'use client';

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { messagesService, WindowStatus } from '@/services/messages.service';
import { ApiError } from '@/lib/api-client';

// Query keys
export const windowStatusKeys = {
  all: ['window-status'] as const,
  detail: (contactId: string, pageId: string) =>
    [...windowStatusKeys.all, contactId, pageId] as const,
};

/**
 * Hook to get the 24-hour messaging window status for a contact.
 * Auto-refreshes every 30 seconds and provides countdown data.
 */
export function useWindowStatus(
  contactId: string | undefined,
  pageId: string | undefined,
  options?: Omit<UseQueryOptions<WindowStatus, ApiError>, 'queryKey' | 'queryFn'>,
) {
  const query = useQuery({
    queryKey: windowStatusKeys.detail(contactId || '', pageId || ''),
    queryFn: () => messagesService.getWindowStatus(contactId!, pageId!),
    enabled: !!contactId && !!pageId,
    staleTime: 30 * 1000, // Refresh every 30s
    refetchInterval: 30 * 1000,
    ...options,
  });

  // Compute derived window info
  const windowExpiresAt = query.data?.windowExpiresAt
    ? new Date(query.data.windowExpiresAt)
    : null;
  const remainingMs = windowExpiresAt
    ? Math.max(0, windowExpiresAt.getTime() - Date.now())
    : 0;
  const remainingMinutes = Math.ceil(remainingMs / 60000);

  return {
    ...query,
    isWithin24Hours: query.data?.isWithin24Hours ?? false,
    windowExpiresAt,
    remainingMinutes,
    availableBypassMethods: query.data?.availableBypassMethods ?? [],
    hasOtnToken: query.data?.hasOtnToken ?? false,
    hasRecurringSubscription: query.data?.hasRecurringSubscription ?? false,
  };
}
