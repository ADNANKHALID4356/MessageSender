import api, { PaginatedResponse } from '@/lib/api-client';

// ===========================================
// Types
// ===========================================

export type EngagementLevel = 'HOT' | 'WARM' | 'COLD' | 'INACTIVE' | 'NEW';
export type ContactSource = 'ORGANIC' | 'AD' | 'COMMENT' | 'REFERRAL';

export interface Contact {
  id: string;
  workspaceId: string;
  pageId: string;
  psid: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  profilePictureUrl?: string;
  locale?: string;
  timezone?: number;
  gender?: string;
  source: ContactSource;
  engagementScore: number;
  engagementLevel: EngagementLevel;
  isSubscribed: boolean;
  unsubscribedAt?: string;
  customFields: Record<string, unknown>;
  notes?: string;
  firstInteractionAt?: string;
  lastInteractionAt?: string;
  lastMessageFromContactAt?: string;
  lastMessageToContactAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: Array<{ tag: Tag }>;
  page?: {
    id: string;
    name: string;
    profilePictureUrl?: string;
  };
  _count?: {
    messages: number;
    conversations: number;
  };
}

export interface Tag {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  createdAt: string;
  _count?: {
    contacts: number;
  };
}

export interface ContactListParams {
  page?: number;
  limit?: number;
  search?: string;
  engagementLevel?: EngagementLevel;
  pageId?: string;
  tagIds?: string[];
  isSubscribed?: boolean;
  sortBy?: 'lastInteractionAt' | 'createdAt' | 'fullName' | 'engagementScore';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateContactRequest {
  pageId: string;
  psid: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  locale?: string;
  timezone?: number;
  gender?: string;
  source?: ContactSource;
  customFields?: Record<string, unknown>;
  notes?: string;
}

export interface UpdateContactRequest {
  firstName?: string;
  lastName?: string;
  engagementLevel?: EngagementLevel;
  isSubscribed?: boolean;
  customFields?: Record<string, unknown>;
  notes?: string;
}

export interface BulkUpdateRequest {
  contactIds: string[];
  addTagIds?: string[];
  removeTagIds?: string[];
  engagementLevel?: EngagementLevel;
  isSubscribed?: boolean;
}

export interface BulkTagRequest {
  contactIds: string[];
  addTagIds?: string[];
  removeTagIds?: string[];
}

export interface ImportContactsRequest {
  contacts: Array<{
    psid: string;
    pageId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  }>;
}

export interface ImportContactsResponse {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface CreateTagRequest {
  name: string;
  color?: string;
}

export interface UpdateTagRequest {
  name?: string;
  color?: string;
}

export interface ContactStats {
  total: number;
  byEngagement: Record<EngagementLevel, number>;
  withinWindow: number;
  subscribed: number;
}

// ===========================================
// Contact Service
// ===========================================

export const contactService = {
  /**
   * Get contacts with filters and pagination
   */
  async getContacts(workspaceId: string, params?: ContactListParams): Promise<PaginatedResponse<Contact>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.engagementLevel) queryParams.append('engagementLevel', params.engagementLevel);
    if (params?.isSubscribed !== undefined) queryParams.append('isSubscribed', params.isSubscribed.toString());
    if (params?.pageId) queryParams.append('pageId', params.pageId);
    if (params?.tagIds?.length) params.tagIds.forEach(id => queryParams.append('tagIds', id));
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = `/contacts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return api.get<PaginatedResponse<Contact>>(url);
  },

  /**
   * Get contact by ID
   */
  async getContact(workspaceId: string, contactId: string): Promise<Contact> {
    return api.get<Contact>(`/contacts/${contactId}`);
  },

  /**
   * Create new contact
   */
  async createContact(workspaceId: string, data: CreateContactRequest): Promise<Contact> {
    return api.post<Contact>(`/contacts`, data);
  },

  /**
   * Update contact
   */
  async updateContact(workspaceId: string, contactId: string, data: UpdateContactRequest): Promise<Contact> {
    return api.put<Contact>(`/contacts/${contactId}`, data);
  },

  /**
   * Delete contact
   */
  async deleteContact(workspaceId: string, contactId: string): Promise<{ message: string }> {
    return api.delete(`/contacts/${contactId}`);
  },

  /**
   * Add tags to contact
   */
  async addTags(workspaceId: string, contactId: string, tagIds: string[]): Promise<Contact> {
    return api.post<Contact>(`/contacts/${contactId}/tags`, { tagIds });
  },

  /**
   * Remove tags from contact
   */
  async removeTags(workspaceId: string, contactId: string, tagIds: string[]): Promise<Contact> {
    return api.delete<Contact>(`/contacts/${contactId}/tags`, { data: { tagIds } });
  },

  /**
   * Bulk tag contacts
   */
  async bulkTag(workspaceId: string, data: BulkTagRequest): Promise<{ updated: number }> {
    return api.post(`/contacts/bulk-tag`, data);
  },

  /**
   * Bulk delete contacts
   */
  async bulkDelete(workspaceId: string, contactIds: string[]): Promise<{ deleted: number }> {
    return api.post(`/contacts/bulk-delete`, { contactIds });
  },

  /**
   * Import contacts
   */
  async importContacts(workspaceId: string, data: ImportContactsRequest): Promise<ImportContactsResponse> {
    return api.post(`/contacts/import`, data);
  },

  /**
   * Get contact statistics
   */
  async getStats(workspaceId: string): Promise<ContactStats> {
    return api.get(`/contacts/stats`);
  },

  // ===========================================
  // Tag Management
  // ===========================================

  /**
   * Get all tags
   */
  async getTags(workspaceId: string): Promise<Tag[]> {
    return api.get<Tag[]>(`/contacts/tags/all`);
  },

  /**
   * Create a new tag
   */
  async createTag(workspaceId: string, data: CreateTagRequest): Promise<Tag> {
    return api.post<Tag>(`/contacts/tags`, data);
  },

  /**
   * Update tag
   */
  async updateTag(workspaceId: string, tagId: string, data: UpdateTagRequest): Promise<Tag> {
    return api.put<Tag>(`/contacts/tags/${tagId}`, data);
  },

  /**
   * Delete tag
   */
  async deleteTag(workspaceId: string, tagId: string): Promise<void> {
    return api.delete(`/contacts/tags/${tagId}`);
  },
};

export default contactService;
