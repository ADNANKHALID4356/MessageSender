import api from '@/lib/api-client';

// ===========================================
// Types
// ===========================================

export interface Page {
  id: string;
  workspaceId: string;
  facebookAccountId: string;
  pageId: string;
  pageName: string;
  pageAccessToken?: string;
  category?: string;
  picture?: string;
  welcomeMessage?: string;
  awayMessage?: string;
  isActive: boolean;
  isWebhookActive: boolean;
  createdAt: string;
  updatedAt: string;
  facebookAccount?: {
    id: string;
    name: string;
    email?: string;
    facebookUserId: string;
  };
  workspace?: {
    id: string;
    name: string;
  };
  _count?: {
    conversations: number;
  };
}

export interface PageStats {
  totalConversations: number;
  activeConversations: number;
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  totalContacts: number;
  averageResponseTime?: number;
}

export interface UpdatePageRequest {
  welcomeMessage?: string;
  awayMessage?: string;
  isActive?: boolean;
  settings?: Record<string, unknown>;
}

export interface TokenValidation {
  valid: boolean;
  expiresAt?: number;
  scopes?: string[];
}

export interface WebhookStatus {
  fixed: boolean;
  status: boolean;
}

// ===========================================
// Page Service
// ===========================================

export const pageService = {
  /**
   * Get all pages for a workspace
   */
  async getPages(workspaceId: string): Promise<Page[]> {
    return api.get<Page[]>(`/workspaces/${workspaceId}/pages`);
  },

  /**
   * Get page by ID
   */
  async getPage(workspaceId: string, pageId: string): Promise<Page> {
    return api.get<Page>(`/workspaces/${workspaceId}/pages/${pageId}`);
  },

  /**
   * Get page statistics
   */
  async getStats(workspaceId: string, pageId: string): Promise<PageStats> {
    return api.get<PageStats>(`/workspaces/${workspaceId}/pages/${pageId}/stats`);
  },

  /**
   * Update page settings
   */
  async updatePage(workspaceId: string, pageId: string, data: UpdatePageRequest): Promise<Page> {
    return api.put<Page>(`/workspaces/${workspaceId}/pages/${pageId}`, data);
  },

  /**
   * Deactivate a page
   */
  async deactivatePage(workspaceId: string, pageId: string): Promise<void> {
    return api.delete(`/workspaces/${workspaceId}/pages/${pageId}`);
  },

  /**
   * Reactivate a page
   */
  async reactivatePage(workspaceId: string, pageId: string): Promise<Page> {
    return api.post<Page>(`/workspaces/${workspaceId}/pages/${pageId}/reactivate`);
  },

  /**
   * Sync page info from Facebook
   */
  async syncPage(workspaceId: string, pageId: string): Promise<Page> {
    return api.post<Page>(`/workspaces/${workspaceId}/pages/${pageId}/sync`);
  },

  /**
   * Validate page access token
   */
  async validateToken(workspaceId: string, pageId: string): Promise<TokenValidation> {
    return api.get<TokenValidation>(`/workspaces/${workspaceId}/pages/${pageId}/token/validate`);
  },

  /**
   * Fix webhook subscription
   */
  async fixWebhook(workspaceId: string, pageId: string): Promise<WebhookStatus> {
    return api.post<WebhookStatus>(`/workspaces/${workspaceId}/pages/${pageId}/webhook/fix`);
  },
};

export default pageService;
