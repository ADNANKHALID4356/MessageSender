import api from '@/lib/api-client';

// ===========================================
// Sponsored Message Types
// ===========================================

export interface SponsoredCampaign {
  id: string;
  status: 'draft' | 'pending_review' | 'active' | 'paused' | 'completed' | 'rejected';
  adAccountId: string | null;
  estimatedReach: number;
  budgetCents: number;
  durationDays: number;
  startDate: string | null;
  createdAt: string;
}

export interface SponsoredCampaignStats {
  id: string;
  impressions: number;
  reach: number;
  messagesSent: number;
  messagesOpened: number;
  spent: number;
  ctr: number;
}

// ===========================================
// Sponsored Message API
// ===========================================

export const sponsoredService = {
  create: (params: {
    pageId: string;
    messageText: string;
    targetContactIds?: string[];
    dailyBudgetCents: number;
    durationDays: number;
  }) => api.post<SponsoredCampaign>('/messages/sponsored/create', params),

  submitForReview: (campaignId: string) =>
    api.post<SponsoredCampaign>(`/messages/sponsored/${campaignId}/submit`),

  pause: (campaignId: string) =>
    api.post<SponsoredCampaign>(`/messages/sponsored/${campaignId}/pause`),

  resume: (campaignId: string) =>
    api.post<SponsoredCampaign>(`/messages/sponsored/${campaignId}/resume`),

  list: () => api.get<SponsoredCampaign[]>('/messages/sponsored/list'),

  get: (campaignId: string) =>
    api.get<SponsoredCampaign>(`/messages/sponsored/${campaignId}`),

  getStats: (campaignId: string) =>
    api.get<SponsoredCampaignStats>(`/messages/sponsored/${campaignId}/stats`),

  delete: (campaignId: string) =>
    api.delete(`/messages/sponsored/${campaignId}`),
};
