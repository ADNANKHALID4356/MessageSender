/**
 * @deprecated This file is dead code. All message functionality has been moved to
 * conversation.service.ts which exports both `conversationService` and `messageService`.
 * This file is retained only for reference and should not be imported anywhere.
 */

import api, { PaginatedResponse } from '@/lib/api-client';

// ===========================================
// Types
// ===========================================

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'template' | 'quick_reply' | 'button';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export type MessageDirection = 'inbound' | 'outbound';

export interface Message {
  id: string;
  contactId: string;
  conversationId: string;
  type: MessageType;
  direction: MessageDirection;
  content: string;
  attachments?: MessageAttachment[];
  metadata?: Record<string, unknown>;
  status: MessageStatus;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface MessageAttachment {
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  filename?: string;
  size?: number;
  mimeType?: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  pageId: string;
  workspaceId: string;
  status: 'open' | 'pending' | 'resolved';
  assignedToId?: string;
  lastMessageAt: string;
  windowExpiresAt?: string;
  isStarred: boolean;
  contact: {
    id: string;
    name: string;
    profilePic?: string;
    engagement: string;
  };
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageRequest {
  contactId: string;
  type: MessageType;
  content: string;
  attachments?: MessageAttachment[];
  metadata?: Record<string, unknown>;
}

export interface ConversationListParams {
  page?: number;
  limit?: number;
  status?: 'open' | 'pending' | 'resolved';
  assignedToId?: string;
  isStarred?: boolean;
  search?: string;
  pageId?: string;
}

export interface MessageListParams {
  page?: number;
  limit?: number;
  before?: string;
  after?: string;
}

export interface BroadcastRequest {
  segmentId?: string;
  contactIds?: string[];
  type: MessageType;
  content: string;
  attachments?: MessageAttachment[];
  scheduledAt?: string;
}

export interface BroadcastResponse {
  id: string;
  targetCount: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

// ===========================================
// Message Service
// ===========================================

export const messageService = {
  /**
   * Get conversations with filters
   */
  async getConversations(workspaceId: string, params?: ConversationListParams): Promise<PaginatedResponse<Conversation>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.assignedToId) queryParams.append('assignedToId', params.assignedToId);
    if (params?.isStarred !== undefined) queryParams.append('isStarred', params.isStarred.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.pageId) queryParams.append('pageId', params.pageId);

    const url = `/conversations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return api.get<PaginatedResponse<Conversation>>(url);
  },

  /**
   * Get conversation by ID
   */
  async getConversation(workspaceId: string, conversationId: string): Promise<Conversation> {
    return api.get<Conversation>(`/conversations/${conversationId}`);
  },

  /**
   * Get messages for a conversation
   */
  async getMessages(workspaceId: string, conversationId: string, params?: MessageListParams): Promise<PaginatedResponse<Message>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.before) queryParams.append('before', params.before);
    if (params?.after) queryParams.append('after', params.after);

    const url = `/conversations/${conversationId}/messages${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return api.get<PaginatedResponse<Message>>(url);
  },

  /**
   * Send a message
   */
  async sendMessage(workspaceId: string, data: SendMessageRequest): Promise<Message> {
    return api.post<Message>(`/messages`, data);
  },

  /**
   * Update conversation status
   */
  async updateConversation(
    workspaceId: string,
    conversationId: string,
    data: { status?: 'open' | 'pending' | 'resolved'; assignedToId?: string; isStarred?: boolean }
  ): Promise<Conversation> {
    return api.put<Conversation>(`/conversations/${conversationId}`, data);
  },

  /**
   * Star/Unstar conversation
   */
  async toggleStar(workspaceId: string, conversationId: string): Promise<Conversation> {
    return api.post<Conversation>(`/conversations/${conversationId}/toggle-star`);
  },

  /**
   * Mark conversation as read
   */
  async markAsRead(workspaceId: string, conversationId: string): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/conversations/${conversationId}/read`);
  },

  /**
   * Assign conversation to user
   */
  async assignConversation(workspaceId: string, conversationId: string, userId: string): Promise<Conversation> {
    return api.post<Conversation>(`/conversations/${conversationId}/assign`, { userId });
  },

  /**
   * Send broadcast message
   */
  async sendBroadcast(workspaceId: string, data: BroadcastRequest): Promise<BroadcastResponse> {
    return api.post<BroadcastResponse>(`/messages/broadcast`, data);
  },

  /**
   * Get message statistics
   */
  async getStats(workspaceId: string, dateRange?: { from: string; to: string }): Promise<{
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    deliveryRate: number;
    readRate: number;
  }> {
    const queryParams = new URLSearchParams();
    if (dateRange?.from) queryParams.append('from', dateRange.from);
    if (dateRange?.to) queryParams.append('to', dateRange.to);

    const url = `/messages/stats${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return api.get(url);
  },
};

export default messageService;
