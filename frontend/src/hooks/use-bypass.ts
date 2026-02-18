import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { otnService, recurringService } from '@/services/bypass.service';

// ===========================================
// OTN Hooks
// ===========================================

export function useOtnTokens(contactId?: string, pageId?: string) {
  return useQuery({
    queryKey: ['otn-tokens', contactId, pageId],
    queryFn: () => otnService.getTokens(contactId!, pageId!),
    enabled: !!contactId && !!pageId,
  });
}

export function useOtnTokenCount(contactId?: string, pageId?: string) {
  return useQuery({
    queryKey: ['otn-count', contactId, pageId],
    queryFn: () => otnService.getTokenCount(contactId!, pageId!),
    enabled: !!contactId && !!pageId,
  });
}

export function useRequestOtn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: otnService.requestOtn,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['otn-tokens', vars.contactId, vars.pageId] });
      queryClient.invalidateQueries({ queryKey: ['otn-count', vars.contactId, vars.pageId] });
    },
  });
}

export function useUseOtnToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: otnService.useOtnToken,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['otn-tokens', vars.contactId, vars.pageId] });
      queryClient.invalidateQueries({ queryKey: ['otn-count', vars.contactId, vars.pageId] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

// ===========================================
// Recurring Notification Hooks
// ===========================================

export function useRecurringSubscriptions(contactId?: string, pageId?: string) {
  return useQuery({
    queryKey: ['recurring-subscriptions', contactId, pageId],
    queryFn: () => recurringService.getSubscriptions(contactId!, pageId!),
    enabled: !!contactId && !!pageId,
  });
}

export function useRequestRecurringSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recurringService.requestSubscription,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['recurring-subscriptions', vars.contactId, vars.pageId],
      });
    },
  });
}

export function useSendRecurringMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recurringService.sendRecurringMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useCanSendRecurring(subscriptionId?: string) {
  return useQuery({
    queryKey: ['recurring-can-send', subscriptionId],
    queryFn: () => recurringService.canSend(subscriptionId!),
    enabled: !!subscriptionId,
  });
}
