import api from '@/lib/api-client';

// ===========================================
// Admin Service Types
// ===========================================

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    facebookApi: ServiceHealth;
    jobQueues: ServiceHealth;
  };
  system: {
    memoryUsage: { heapUsed: number; heapTotal: number; rss: number; usagePercent: number };
    uptime: number;
    nodeVersion: string;
    cpuUsage: number;
  };
  workspaceStats: {
    totalWorkspaces: number;
    totalContacts: number;
    totalMessages: number;
    totalPages: number;
    activeCampaigns: number;
  };
  timestamp: string;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  details?: string;
}

export interface ReportParams {
  workspaceId: string;
  reportType: 'campaign_summary' | 'contact_growth' | 'engagement' | 'compliance';
  startDate: string;
  endDate: string;
  format?: 'json' | 'csv';
}

export interface ReportResult {
  reportType: string;
  generatedAt: string;
  period: { startDate: string; endDate: string };
  data: any;
  csvContent?: string;
}

export interface BackupRecord {
  id: string;
  workspaceId: string;
  filename: string;
  sizeBytes: number;
  tables: string[];
  recordCounts: Record<string, number>;
  createdAt: string;
  status: 'completed' | 'failed' | 'in_progress';
  error?: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

// ===========================================
// Health API
// ===========================================

export const healthService = {
  getStatus: () => api.get<HealthStatus>('/admin/health'),
};

// ===========================================
// Report API
// ===========================================

export const reportService = {
  generate: (params: ReportParams) =>
    api.post<ReportResult>('/admin/reports/generate', params),
  
  getCampaignSummary: (workspaceId: string, startDate: string, endDate: string, format?: string) =>
    api.get<ReportResult>(`/admin/reports/${workspaceId}/campaign-summary`, {
      params: { startDate, endDate, format },
    }),

  getEngagement: (workspaceId: string, startDate: string, endDate: string, format?: string) =>
    api.get<ReportResult>(`/admin/reports/${workspaceId}/engagement`, {
      params: { startDate, endDate, format },
    }),
};

// ===========================================
// Backup API
// ===========================================

export const backupService = {
  create: (workspaceId: string) =>
    api.post<BackupRecord>(`/admin/backups/${workspaceId}`),

  list: (workspaceId: string) =>
    api.get<BackupRecord[]>(`/admin/backups/${workspaceId}`),

  getStats: (workspaceId: string) =>
    api.get<{ totalBackups: number; lastBackupAt: string | null; totalSizeBytes: number }>(
      `/admin/backups/${workspaceId}/stats`,
    ),

  getDetail: (backupId: string) =>
    api.get<BackupRecord>(`/admin/backups/detail/${backupId}`),

  delete: (backupId: string) =>
    api.delete(`/admin/backups/${backupId}`),
};

// ===========================================
// Email / SMTP API
// ===========================================

export const emailService = {
  configureSmtp: (workspaceId: string, config: SmtpConfig) =>
    api.put(`/admin/email/smtp/${workspaceId}`, config),

  getSmtpConfig: (workspaceId: string) =>
    api.get<SmtpConfig & { configured: boolean }>(`/admin/email/smtp/${workspaceId}`),

  testSmtp: (workspaceId: string) =>
    api.post<{ success: boolean; error?: string }>(`/admin/email/smtp/${workspaceId}/test`),

  sendInvitation: (params: {
    workspaceId: string;
    inviteeEmail: string;
    inviterName: string;
    workspaceName: string;
    role: string;
  }) => api.post('/admin/email/invite', params),

  sendNotification: (params: {
    workspaceId: string;
    email: string;
    title: string;
    message: string;
  }) => api.post('/admin/email/notification', params),
};
