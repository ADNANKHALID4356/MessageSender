import api from '@/lib/api-client';

export interface ActivityLog {
  id: string;
  workspaceId?: string;
  adminId?: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
  admin?: { id: string; username: string; firstName?: string; lastName?: string };
  user?: { id: string; email: string; firstName: string; lastName?: string };
}

export interface ActivityLogParams {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
}

export const activityLogService = {
  getLogs: async (params: ActivityLogParams = {}): Promise<{ data: ActivityLog[]; pagination: unknown }> => {
    return api.get('/admin/activity-logs', { params });
  },
};
