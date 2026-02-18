import api, { PaginatedResponse } from '@/lib/api-client';

// ===========================================
// Types
// ===========================================

export type CampaignType = 'broadcast' | 'otn' | 'recurring';
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';

export interface Campaign {
  id: string;
  name: string;
  description: string;
  type: CampaignType;
  status: CampaignStatus;
  workspaceId: string;
  segmentId?: string;
  segment?: {
    id: string;
    name: string;
    contactCount: number;
  };
  message: {
    type: string;
    content: string;
    attachments?: Array<{ type: string; url: string }>;
  };
  targetCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignListParams {
  page?: number;
  limit?: number;
  status?: CampaignStatus;
  type?: CampaignType;
  search?: string;
  sortBy?: 'createdAt' | 'scheduledAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  type: CampaignType;
  segmentId?: string;
  contactIds?: string[];
  message: {
    type: string;
    content: string;
    attachments?: Array<{ type: string; url: string }>;
  };
  scheduledAt?: string;
  settings?: {
    sendRate?: number;
    retryFailed?: boolean;
    trackDelivery?: boolean;
  };
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  segmentId?: string;
  message?: {
    type: string;
    content: string;
    attachments?: Array<{ type: string; url: string }>;
  };
  scheduledAt?: string;
  settings?: {
    sendRate?: number;
    retryFailed?: boolean;
    trackDelivery?: boolean;
  };
}

export interface CampaignStats {
  id: string;
  targetCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  deliveryRate: number;
  readRate: number;
  dailyStats: Array<{
    date: string;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  }>;
}

// ===========================================
// Campaign Service
// ===========================================

export const campaignService = {
  /**
   * Get campaigns with filters
   */
  async getCampaigns(workspaceId: string, params?: CampaignListParams): Promise<PaginatedResponse<Campaign>> {
    const queryParams = new URLSearchParams();
    queryParams.append('workspaceId', workspaceId);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = `/campaigns${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return api.get<PaginatedResponse<Campaign>>(url);
  },

  /**
   * Get campaign by ID
   */
  async getCampaign(campaignId: string): Promise<Campaign> {
    return api.get<Campaign>(`/campaigns/${campaignId}`);
  },

  /**
   * Create new campaign
   */
  async createCampaign(workspaceId: string, data: CreateCampaignRequest): Promise<Campaign> {
    return api.post<Campaign>('/campaigns', { ...data, workspaceId });
  },

  /**
   * Update campaign
   */
  async updateCampaign(campaignId: string, data: UpdateCampaignRequest): Promise<Campaign> {
    return api.put<Campaign>(`/campaigns/${campaignId}`, data);
  },

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/campaigns/${campaignId}`);
  },

  /**
   * Launch/start campaign
   */
  async launchCampaign(campaignId: string): Promise<Campaign> {
    return api.post<Campaign>(`/campaigns/${campaignId}/launch`);
  },

  /**
   * Pause campaign
   */
  async pauseCampaign(campaignId: string): Promise<Campaign> {
    return api.post<Campaign>(`/campaigns/${campaignId}/pause`);
  },

  /**
   * Resume campaign
   */
  async resumeCampaign(campaignId: string): Promise<Campaign> {
    return api.post<Campaign>(`/campaigns/${campaignId}/resume`);
  },

  /**
   * Cancel campaign
   */
  async cancelCampaign(campaignId: string): Promise<Campaign> {
    return api.post<Campaign>(`/campaigns/${campaignId}/cancel`);
  },

  /**
   * Duplicate campaign
   */
  async duplicateCampaign(campaignId: string): Promise<Campaign> {
    return api.post<Campaign>(`/campaigns/${campaignId}/duplicate`);
  },

  /**
   * Schedule campaign
   */
  async scheduleCampaign(campaignId: string, scheduledAt: string): Promise<Campaign> {
    return api.post<Campaign>(`/campaigns/${campaignId}/schedule`, { scheduledAt });
  },

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId: string): Promise<CampaignStats> {
    return api.get<CampaignStats>(`/campaigns/${campaignId}/stats`);
  },

  /**
   * Get campaign progress
   */
  async getCampaignProgress(campaignId: string): Promise<{ progress: number; sentCount: number; targetCount: number }> {
    return api.get<{ progress: number; sentCount: number; targetCount: number }>(`/campaigns/${campaignId}/progress`);
  },
};

export default campaignService;
