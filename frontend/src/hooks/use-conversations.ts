'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useToast } from './use-toast';
import {
  conversationService,
  messageService,
  type ConversationListParams,
  type UpdateConversationRequest,
  type BulkUpdateConversationsRequest,
  type SendMessageRequest,
  type SendQuickMessageRequest,
  type ConversationStatus,
} from '@/services/conversation.service';

// Query keys
export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: (params: ConversationListParams) => [...conversationKeys.lists(), params] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
  my: () => [...conversationKeys.all, 'my'] as const,
  stats: () => [...conversationKeys.all, 'stats'] as const,
};

export const messageKeys = {
  all: ['messages'] as const,
  lists: () => [...messageKeys.all, 'list'] as const,
  list: (conversationId: string) => [...messageKeys.lists(), conversationId] as const,
  contact: (contactId: string) => [...messageKeys.all, 'contact', contactId] as const,
  stats: () => [...messageKeys.all, 'stats'] as const,
};

/**
 * Hook to fetch conversations (inbox)
 */
export function useConversations(params?: ConversationListParams) {
  return useQuery({
    queryKey: conversationKeys.list(params || {}),
    queryFn: () => conversationService.getConversations(params),
    refetchInterval: 30000, // Refetch every 30 seconds for inbox
  });
}

/**
 * Hook to fetch a single conversation with messages
 */
export function useConversation(conversationId: string | null) {
  return useQuery({
    queryKey: conversationKeys.detail(conversationId || ''),
    queryFn: () => conversationService.getConversation(conversationId!),
    enabled: !!conversationId,
  });
}

/**
 * Hook to fetch my assigned conversations
 */
export function useMyConversations() {
  return useQuery({
    queryKey: conversationKeys.my(),
    queryFn: () => conversationService.getMyConversations(),
  });
}

/**
 * Hook to fetch conversation stats
 */
export function useConversationStats() {
  return useQuery({
    queryKey: conversationKeys.stats(),
    queryFn: () => conversationService.getStats(),
  });
}

/**
 * Hook to fetch messages for a conversation
 */
export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: messageKeys.list(conversationId || ''),
    queryFn: () => messageService.getMessages({ conversationId: conversationId! }),
    enabled: !!conversationId,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time messages
  });
}

/**
 * Hook to fetch message stats
 */
export function useMessageStats(days?: number) {
  return useQuery({
    queryKey: messageKeys.stats(),
    queryFn: () => messageService.getStats(days),
  });
}

/**
 * Hook to create a new conversation
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contactId, assignedToUserId }: { contactId: string; assignedToUserId?: string }) =>
      conversationService.createConversation(contactId, assignedToUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: conversationKeys.stats() });
    },
  });
}

/**
 * Hook to update a conversation
 */
export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, data }: { conversationId: string; data: UpdateConversationRequest }) =>
      conversationService.updateConversation(conversationId, data),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: conversationKeys.stats() });
    },
  });
}

/**
 * Hook to assign a conversation
 */
export function useAssignConversation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ conversationId, userId }: { conversationId: string; userId: string }) =>
      conversationService.assignConversation(conversationId, userId),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: conversationKeys.my() });
      toast({
        title: 'Conversation Assigned',
        description: 'The conversation has been assigned successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Assignment Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to unassign a conversation
 */
export function useUnassignConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => conversationService.unassignConversation(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: conversationKeys.my() });
    },
  });
}

/**
 * Hook to mark conversation as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => conversationService.markAsRead(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: conversationKeys.stats() });
    },
  });
}

/**
 * Hook to bulk update conversations
 */
export function useBulkUpdateConversations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: BulkUpdateConversationsRequest) => conversationService.bulkUpdate(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.all });
      toast({
        title: 'Conversations Updated',
        description: `${result.updatedCount} conversation(s) updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Bulk Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to send a message
 */
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: SendMessageRequest) => messageService.sendMessage(data),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: messageKeys.list(conversationId) });
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
    onError: (error: Error) => {
      toast({
        title: 'Message Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to send a quick message
 */
export function useSendQuickMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: SendQuickMessageRequest) => messageService.sendQuickMessage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.all });
      queryClient.invalidateQueries({ queryKey: messageKeys.all });
      toast({
        title: 'Message Sent',
        description: 'Your message has been sent successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Message Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
