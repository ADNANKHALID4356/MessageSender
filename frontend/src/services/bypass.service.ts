import { apiClient } from '@/lib/api-client';

// ===========================================
// OTN Types
// ===========================================

export interface OtnToken {
  id: string;
  token: string;
  title: string;
  isUsed: boolean;
  expiresAt: string | null;
  optedInAt: string | null;
  createdAt: string;
}

export interface OtnRequestResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface OtnUseResult {
  success: boolean;
  messageId?: string;
  fbMessageId?: string;
  error?: string;
}

// ===========================================
// Recurring Notification Types
// ===========================================

export interface RecurringSubscription {
  id: string;
  contactId: string;
  pageId: string;
  title: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  topic: string;
  status: 'PENDING' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  lastSentAt: string | null;
  nextAllowedAt: string | null;
  messagesSent: number;
  optedInAt: string | null;
  createdAt: string;
}

// ===========================================
// OTN API Service
// ===========================================

export const otnService = {
  async requestOtn(data: {
    contactId: string;
    pageId: string;
    title: string;
    payload?: string;
  }): Promise<OtnRequestResult> {
    const res = await apiClient.post('/messages/otn/request', data);
    return res.data;
  },

  async useOtnToken(data: {
    otnTokenId: string;
    contactId: string;
    pageId: string;
    messageContent: { text?: string; attachmentUrl?: string; attachmentType?: string };
  }): Promise<OtnUseResult> {
    const res = await apiClient.post('/messages/otn/use', data);
    return res.data;
  },

  async getTokens(contactId: string, pageId: string): Promise<OtnToken[]> {
    const res = await apiClient.get(`/messages/otn/tokens/${contactId}/${pageId}`);
    return res.data;
  },

  async getTokenCount(contactId: string, pageId: string): Promise<number> {
    const res = await apiClient.get(`/messages/otn/count/${contactId}/${pageId}`);
    return res.data.count;
  },
};

// ===========================================
// Recurring Notifications API Service
// ===========================================

export const recurringService = {
  async requestSubscription(data: {
    contactId: string;
    pageId: string;
    title: string;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    topic?: string;
  }): Promise<any> {
    const res = await apiClient.post('/messages/recurring/request', data);
    return res.data;
  },

  async sendRecurringMessage(data: {
    subscriptionId: string;
    contactId: string;
    pageId: string;
    messageContent: { text?: string; attachmentUrl?: string; attachmentType?: string };
  }): Promise<any> {
    const res = await apiClient.post('/messages/recurring/send', data);
    return res.data;
  },

  async getSubscriptions(contactId: string, pageId: string): Promise<RecurringSubscription[]> {
    const res = await apiClient.get(`/messages/recurring/subscriptions/${contactId}/${pageId}`);
    return res.data;
  },

  async canSend(subscriptionId: string): Promise<boolean> {
    const res = await apiClient.get(`/messages/recurring/can-send/${subscriptionId}`);
    return res.data.canSend;
  },
};
