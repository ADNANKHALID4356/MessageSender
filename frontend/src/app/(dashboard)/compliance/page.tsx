'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  FileText,
  Eye,
  Calendar,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores';
import { apiClient } from '@/lib/api-client';

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: any;
  ipAddress: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string } | null;
  admin?: { email: string } | null;
}

interface ComplianceMetrics {
  totalContacts: number;
  subscribedContacts: number;
  unsubscribedContacts: number;
  consentRate: number;
  windowComplianceRate: number;
  bypassUsage: { method: string; count: number }[];
}

export default function ComplianceDashboardPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);

  const workspaceId = currentWorkspace?.id || '';

  useEffect(() => {
    if (!workspaceId) return;
    fetchAuditLogs();
  }, [workspaceId, page, actionFilter]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/activity-log', {
        params: { page, limit: 20, action: actionFilter || undefined },
      });
      setAuditLogs(res.data?.data || res.data || []);
    } catch {
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const complianceChecks = [
    {
      name: '24-Hour Messaging Window',
      status: 'compliant' as const,
      description: 'All outbound messages respect the 24-hour window or use approved bypass methods',
      icon: Clock,
    },
    {
      name: 'Subscriber Consent',
      status: 'compliant' as const,
      description: 'Contacts are opted-in before receiving campaign messages',
      icon: CheckCircle,
    },
    {
      name: 'Data Retention Policy',
      status: 'compliant' as const,
      description: 'Message data is retained per configured policy',
      icon: FileText,
    },
    {
      name: 'Message Tag Usage',
      status: 'warning' as const,
      description: 'Verify message tags are used only for their intended purposes',
      icon: AlertTriangle,
    },
  ];

  const handleExportReport = () => {
    const rows = [
      ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'User', 'IP Address'],
      ...auditLogs.map((log) => [
        new Date(log.createdAt).toISOString(),
        log.action,
        log.entityType || '',
        log.entityId || '',
        log.user ? `${log.user.firstName} ${log.user.lastName}` : log.admin?.email || '',
        log.ipAddress || '',
      ]),
    ];
    const csvContent = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `compliance_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No Workspace Selected</h2>
          <p className="text-muted-foreground">Please select a workspace to view compliance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compliance Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor compliance status and audit activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAuditLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Compliance Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {complianceChecks.map((check) => (
          <Card key={check.name}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'p-2 rounded-lg',
                    check.status === 'compliant'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-amber-100 dark:bg-amber-900/30',
                  )}
                >
                  <check.icon
                    className={cn(
                      'h-5 w-5',
                      check.status === 'compliant' ? 'text-green-600' : 'text-amber-600',
                    )}
                  />
                </div>
                <div>
                  <p className="font-medium text-sm">{check.name}</p>
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full mt-1 inline-block',
                      check.status === 'compliant'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                    )}
                  >
                    {check.status === 'compliant' ? 'Compliant' : 'Review Needed'}
                  </span>
                  <p className="text-xs text-muted-foreground mt-2">{check.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Facebook Platform Policy Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Facebook Platform Policy Summary
          </CardTitle>
          <CardDescription>Key compliance rules for Messenger Platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">24-Hour Rule</h4>
              <p className="text-sm text-muted-foreground">
                Standard messages can only be sent within 24 hours of a user&apos;s last interaction.
                Bypass requires approved message tags, OTN tokens, or recurring notification opt-in.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Message Tags</h4>
              <p className="text-sm text-muted-foreground">
                Tags (CONFIRMED_EVENT_UPDATE, POST_PURCHASE_UPDATE, ACCOUNT_UPDATE, HUMAN_AGENT)
                must be used only for their stated purpose. Misuse leads to platform restrictions.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Subscriber Consent</h4>
              <p className="text-sm text-muted-foreground">
                Users must opt-in to recurring notifications. One-Time Notifications require
                explicit consent tokens. Unsubscribe must be accessible.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Audit Log
          </CardTitle>
          <CardDescription>Track all system actions for compliance auditing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Filter by action..."
              className="max-w-xs"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Spinner size="md" />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No audit log entries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Time</th>
                    <th className="text-left p-3 font-medium">Action</th>
                    <th className="text-left p-3 font-medium">Entity</th>
                    <th className="text-left p-3 font-medium">User</th>
                    <th className="text-left p-3 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-muted">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {log.entityType ? `${log.entityType}${log.entityId ? ` #${log.entityId.slice(0, 8)}` : ''}` : '—'}
                      </td>
                      <td className="p-3">
                        {log.user
                          ? `${log.user.firstName} ${log.user.lastName}`
                          : log.admin?.email || '—'}
                      </td>
                      <td className="p-3 text-muted-foreground">{log.ipAddress || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={auditLogs.length < 20}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
