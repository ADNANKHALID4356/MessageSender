import api from '@/lib/api-client';

// ===========================================
// Types
// ===========================================

export interface TemplateContent {
  text?: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'video' | 'audio' | 'file';
  buttons?: Array<{ type: string; title: string; url?: string; payload?: string }>;
  quickReplies?: Array<{ content_type: string; title?: string; payload?: string }>;
  elements?: Array<{
    title: string;
    subtitle?: string;
    image_url?: string;
    buttons?: Array<{ type: string; title: string; url?: string; payload?: string }>;
  }>;
}

export interface MessageTemplate {
  id: string;
  workspaceId: string;
  name: string;
  category: string;
  content: TemplateContent;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CannedResponse {
  id: string;
  workspaceId: string;
  shortcut: string;
  title: string;
  content: string;
  category: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

// ===========================================
// API Methods
// ===========================================

export const templatesService = {
  // Message Templates
  getTemplates: async (category?: string): Promise<MessageTemplate[]> => {
    const params = category ? { category } : {};
    return api.get('/messages/templates/all', { params });
  },

  getTemplate: async (templateId: string): Promise<MessageTemplate> => {
    return api.get(`/messages/templates/${templateId}`);
  },

  createTemplate: async (dto: { name: string; category?: string; content: TemplateContent }): Promise<MessageTemplate> => {
    return api.post('/messages/templates', dto);
  },

  updateTemplate: async (templateId: string, dto: Partial<{ name: string; category: string; content: TemplateContent; isActive: boolean }>): Promise<MessageTemplate> => {
    return api.put(`/messages/templates/${templateId}`, dto);
  },

  deleteTemplate: async (templateId: string): Promise<void> => {
    await api.delete(`/messages/templates/${templateId}`);
  },

  getCategories: async (): Promise<string[]> => {
    return api.get('/messages/templates/categories');
  },

  // Canned Responses
  getCannedResponses: async (category?: string): Promise<CannedResponse[]> => {
    const params = category ? { category } : {};
    return api.get('/messages/canned-responses/all', { params });
  },

  createCannedResponse: async (dto: { shortcut: string; title: string; content: string; category?: string }): Promise<CannedResponse> => {
    return api.post('/messages/canned-responses', dto);
  },

  updateCannedResponse: async (responseId: string, dto: Partial<{ shortcut: string; title: string; content: string; category: string }>): Promise<CannedResponse> => {
    return api.put(`/messages/canned-responses/${responseId}`, dto);
  },

  deleteCannedResponse: async (responseId: string): Promise<void> => {
    await api.delete(`/messages/canned-responses/${responseId}`);
  },

  findByShortcut: async (shortcut: string): Promise<CannedResponse | null> => {
    try {
      return await api.get(`/messages/canned-responses/search/${shortcut}`);
    } catch {
      return null;
    }
  },
};
