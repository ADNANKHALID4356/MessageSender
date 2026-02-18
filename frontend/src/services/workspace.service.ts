import api, { PaginatedResponse } from '@/lib/api-client';

// ===========================================
// Types
// ===========================================

export interface Workspace {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  settings: WorkspaceSettings;
  createdAt: string;
  updatedAt: string;
  _count?: {
    pages: number;
    contacts: number;
    messages: number;
    members: number;
  };
}

export interface WorkspaceSettings {
  defaultReplyDelay?: number;
  autoAssign?: boolean;
  notifyOnNewMessage?: boolean;
  workingHours?: {
    enabled: boolean;
    timezone: string;
    schedule: Record<string, { start: string; end: string } | null>;
  };
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  settings?: Partial<WorkspaceSettings>;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive';
  settings?: Partial<WorkspaceSettings>;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: 'owner' | 'manager' | 'agent';
  permissions: string[];
  user: {
    id: string;
    name: string;
    email: string;
    status: string;
  };
  createdAt: string;
}

export interface AddMemberRequest {
  userId: string;
  role: 'manager' | 'agent';
  permissions?: string[];
}

export interface UpdateMemberRequest {
  role?: 'manager' | 'agent';
  permissions?: string[];
}

export interface WorkspaceListParams {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive';
  search?: string;
}

// ===========================================
// Workspace Service
// ===========================================

export const workspaceService = {
  /**
   * Get all workspaces for current user
   * Uses /workspaces/my endpoint which works for both admin and regular users
   */
  async getWorkspaces(params?: WorkspaceListParams): Promise<PaginatedResponse<Workspace>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    const url = `/workspaces/my${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return api.get<PaginatedResponse<Workspace>>(url);
  },

  /**
   * Get workspace by ID
   */
  async getWorkspace(id: string): Promise<Workspace> {
    return api.get<Workspace>(`/workspaces/${id}`);
  },

  /**
   * Create new workspace
   */
  async createWorkspace(data: CreateWorkspaceRequest): Promise<Workspace> {
    return api.post<Workspace>('/workspaces', data);
  },

  /**
   * Update workspace
   */
  async updateWorkspace(id: string, data: UpdateWorkspaceRequest): Promise<Workspace> {
    return api.put<Workspace>(`/workspaces/${id}`, data);
  },

  /**
   * Delete workspace
   */
  async deleteWorkspace(id: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/workspaces/${id}`);
  },

  /**
   * Get workspace members
   */
  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return api.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/users`);
  },

  /**
   * Add member to workspace
   */
  async addMember(workspaceId: string, data: AddMemberRequest): Promise<WorkspaceMember> {
    return api.post<WorkspaceMember>(`/workspaces/${workspaceId}/users`, data);
  },

  /**
   * Update member role/permissions
   */
  async updateMember(workspaceId: string, userId: string, data: UpdateMemberRequest): Promise<WorkspaceMember> {
    return api.put<WorkspaceMember>(`/workspaces/${workspaceId}/users/${userId}`, data);
  },

  /**
   * Remove member from workspace
   */
  async removeMember(workspaceId: string, userId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/workspaces/${workspaceId}/users/${userId}`);
  },

  /**
   * Get workspace statistics
   */
  async getStats(workspaceId: string): Promise<{
    contacts: number;
    messages: number;
    conversations: number;
    campaigns: number;
  }> {
    return api.get(`/workspaces/${workspaceId}/stats`);
  },
};

export default workspaceService;
