import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { healthService, reportService, backupService, emailService, ReportParams } from '@/services/admin.service';

// ===========================================
// Health Hooks
// ===========================================

export function useSystemHealth() {
  return useQuery({
    queryKey: ['admin', 'health'],
    queryFn: () => healthService.getStatus(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// ===========================================
// Report Hooks
// ===========================================

export function useGenerateReport() {
  return useMutation({
    mutationFn: (params: ReportParams) => reportService.generate(params),
  });
}

// ===========================================
// Backup Hooks
// ===========================================

export function useBackups(workspaceId: string) {
  return useQuery({
    queryKey: ['admin', 'backups', workspaceId],
    queryFn: () => backupService.list(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useBackupStats(workspaceId: string) {
  return useQuery({
    queryKey: ['admin', 'backup-stats', workspaceId],
    queryFn: () => backupService.getStats(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useCreateBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workspaceId: string) => backupService.create(workspaceId),
    onSuccess: (_, workspaceId) => {
      qc.invalidateQueries({ queryKey: ['admin', 'backups', workspaceId] });
      qc.invalidateQueries({ queryKey: ['admin', 'backup-stats', workspaceId] });
    },
  });
}

export function useDeleteBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (backupId: string) => backupService.delete(backupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'backups'] });
      qc.invalidateQueries({ queryKey: ['admin', 'backup-stats'] });
    },
  });
}

// ===========================================
// Email Hooks
// ===========================================

export function useSmtpConfig(workspaceId: string) {
  return useQuery({
    queryKey: ['admin', 'smtp', workspaceId],
    queryFn: () => emailService.getSmtpConfig(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useConfigureSmtp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, config }: { workspaceId: string; config: any }) =>
      emailService.configureSmtp(workspaceId, config),
    onSuccess: (_, { workspaceId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'smtp', workspaceId] });
    },
  });
}

export function useTestSmtp() {
  return useMutation({
    mutationFn: (workspaceId: string) => emailService.testSmtp(workspaceId),
  });
}

export function useSendInvitation() {
  return useMutation({
    mutationFn: emailService.sendInvitation,
  });
}
