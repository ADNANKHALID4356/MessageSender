import api, { PaginatedResponse } from '@/lib/api-client';
import { Contact } from './contact.service';

// ===========================================
// Types
// ===========================================

export type ConversationStatus = 'OPEN' | 'PENDING' | 'RESOLVED';

export interface Conversation {
  id: string;
  workspaceId: string;
  contactId: string;
  pageId: string;
  status: ConversationStatus;
  assignedToUserId?: string;
  unreadCount: number;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  notes?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  contact: {
    id: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    profilePictureUrl?: string;
    engagementLevel: string;
  };
  page: {
    id: string;
    name: string;
    profilePictureUrl?: string;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  _count?: {
    messages: number;
  };
}

export interface ConversationDetail extends Conversation {
  contact: Contact;
  messages: Message[];
}

export interface Message {
  id: string;
  conversationId: string;
  contactId: string;
  pageId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'TEMPLATE';
  content: {
    text?: string;
    attachmentUrl?: string;
    attachmentType?: string;
    fileName?: string;
  };
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  externalId?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  receivedAt?: string;
  sentById?: string;
  sentBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationListParams {
  page?: number;
  limit?: number;
  status?: ConversationStatus;
  pageId?: string;
  assignedToUserId?: string;
  unreadOnly?: boolean;
  search?: string;
  sortBy?: 'lastMessageAt' | 'createdAt' | 'unreadCount';
  sortOrder?: 'asc' | 'desc';
}

export interface MessageListParams {
  conversationId: string;
  page?: number;
  limit?: number;
  before?: string;
  after?: string;
}

export interface SendMessageRequest {
  conversationId: string;
  messageType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'TEMPLATE';
  content: {
    text?: string;
    attachmentUrl?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface SendQuickMessageRequest {
  contactId: string;
  text: string;
}

export interface UpdateConversationRequest {
  status?: ConversationStatus;
  assignedToUserId?: string | null;
  notes?: string;
}

export interface BulkUpdateConversationsRequest {
  conversationIds: string[];
  status?: ConversationStatus;
  assignedToUserId?: string | null;
}

export interface ConversationStats {
  totalConversations: number;
  openConversations: number;
  pendingConversations: number;
  resolvedConversations: number;
  unreadConversations: number;
  todayConversations: number;
  averageResponseTimeMinutes: number;
}

export interface MessageStats {
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  responseRate: number;
  messagesByDay: Array<{ date: string; count: number }>;
}

// ===========================================
// Conversation Service
// ===========================================

export const conversationService = {
  /**
   * Get conversations (Inbox)
   */
  async getConversations(params?: ConversationListParams): Promise<PaginatedResponse<Conversation>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.pageId) queryParams.append('pageId', params.pageId);
    if (params?.assignedToUserId) queryParams.append('assignedToUserId', params.assignedToUserId);
    if (params?.unreadOnly) queryParams.append('unreadOnly', 'true');
    if (params?.search) queryParams.append('search', params.search);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = `/conversations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return api.get<PaginatedResponse<Conversation>>(url);
  },

  /**
   * Get conversation by ID with messages
   */
  async getConversation(conversationId: string): Promise<ConversationDetail> {
    return api.get<ConversationDetail>(`/conversations/${conversationId}`);
  },

  /**
   * Create a new conversation
   */
  async createConversation(contactId: string, assignedToUserId?: string): Promise<Conversation> {
    return api.post<Conversation>('/conversations', { contactId, assignedToUserId });
  },

  /**
   * Update conversation status/assignment
   */
  async updateConversation(conversationId: string, data: UpdateConversationRequest): Promise<Conversation> {
    return api.put<Conversation>(`/conversations/${conversationId}`, data);
  },

  /**
   * Assign conversation to user
   */
  async assignConversation(conversationId: string, userId: string): Promise<Conversation> {
    return api.post<Conversation>(`/conversations/${conversationId}/assign`, { userId });
  },

  /**
   * Unassign conversation
   */
  async unassignConversation(conversationId: string): Promise<Conversation> {
    return api.post<Conversation>(`/conversations/${conversationId}/unassign`);
  },

  /**
   * Mark conversation as read
   */
  async markAsRead(conversationId: string): Promise<Conversation> {
    return api.post<Conversation>(`/conversations/${conversationId}/read`);
  },

  /**
   * Bulk update conversations
   */
  async bulkUpdate(data: BulkUpdateConversationsRequest): Promise<{ success: boolean; updatedCount: number }> {
    return api.post('/conversations/bulk', data);
  },

  /**
   * Get conversation statistics
   */
  async getStats(): Promise<ConversationStats> {
    return api.get('/conversations/stats');
  },

  /**
   * Get my assigned conversations
   */
  async getMyConversations(): Promise<PaginatedResponse<Conversation>> {
    return api.get<PaginatedResponse<Conversation>>('/conversations/my');
  },
};

// ===========================================
// Message Service
// ===========================================

export const messageService = {
  /**
   * Get messages for a conversation
   */
  async getMessages(params: MessageListParams): Promise<PaginatedResponse<Message>> {
    const queryParams = new URLSearchParams();
    queryParams.append('conversationId', params.conversationId);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.before) queryParams.append('before', params.before);
    if (params.after) queryParams.append('after', params.after);

    return api.get<PaginatedResponse<Message>>(`/messages?${queryParams.toString()}`);
  },

  /**
   * Send a message
   */
  async sendMessage(data: SendMessageRequest): Promise<Message> {
    return api.post<Message>('/messages', data);
  },

  /**
   * Send a quick message to a contact
   */
  async sendQuickMessage(data: SendQuickMessageRequest): Promise<Message> {
    return api.post<Message>('/messages/quick', data);
  },

  /**
   * Get message by ID
   */
  async getMessage(messageId: string): Promise<Message> {
    return api.get<Message>(`/messages/${messageId}`);
  },

  /**
   * Get messages for a contact
   */
  async getContactMessages(contactId: string, page?: number, limit?: number): Promise<PaginatedResponse<Message>> {
    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page.toString());
    if (limit) queryParams.append('limit', limit.toString());

    return api.get<PaginatedResponse<Message>>(`/messages/contact/${contactId}?${queryParams.toString()}`);
  },

  /**
   * Get message statistics
   */
  async getStats(days?: number): Promise<MessageStats> {
    const queryParams = days ? `?days=${days}` : '';
    return api.get<MessageStats>(`/messages/stats${queryParams}`);
  },
};

export default { conversationService, messageService };
