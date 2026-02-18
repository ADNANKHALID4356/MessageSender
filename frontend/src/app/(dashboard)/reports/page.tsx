'use client';

import { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  RefreshCw,
  Calendar,
  BarChart3,
  Users,
  Send,
  MessageSquare,
  AlertCircle,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { cn, formatNumber } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores';
import { useAnalyticsOverview } from '@/hooks';

type ReportType = 'messaging' | 'campaigns' | 'contacts' | 'engagement';

interface ReportConfig {
  type: ReportType;
  dateRange: string;
  format: 'csv' | 'json';
}

export default function ReportsPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const [reportType, setReportType] = useState<ReportType>('messaging');
  const [dateRange, setDateRange] = useState('30');
  const [generating, setGenerating] = useState(false);

  const { data: analyticsData, isLoading, refetch } = useAnalyticsOverview(parseInt(dateRange));

  const conversationStats = analyticsData?.conversations;
  const messageStats = analyticsData?.messages;

  const reportTypes = [
    {
      value: 'messaging' as const,
      label: 'Messaging Report',
      description: 'Message volume, response rates, and delivery metrics',
      icon: Send,
    },
    {
      value: 'campaigns' as const,
      label: 'Campaign Report',
      description: 'Campaign performance, delivery, and engagement',
      icon: Send,
    },
    {
      value: 'contacts' as const,
      label: 'Contact Report',
      description: 'Contact growth, engagement levels, and segments',
      icon: Users,
    },
    {
      value: 'engagement' as const,
      label: 'Engagement Report',
      description: 'Engagement scores, response patterns, and trends',
      icon: TrendingUp,
    },
  ];

  const generateReport = async (format: 'csv' | 'json') => {
    setGenerating(true);
    try {
      const data = buildReportData();
      if (format === 'csv') {
        downloadCSV(data);
      } else {
        downloadJSON(data);
      }
    } finally {
      setGenerating(false);
    }
  };

  const buildReportData = () => {
    const base = {
      reportType,
      dateRange: `Last ${dateRange} days`,
      generatedAt: new Date().toISOString(),
      workspace: currentWorkspace?.name || '',
    };

    switch (reportType) {
      case 'messaging':
        return {
          ...base,
          totalMessages: messageStats?.totalMessages || 0,
          inbound: messageStats?.inboundMessages || 0,
          outbound: messageStats?.outboundMessages || 0,
          responseRate: messageStats?.responseRate || 0,
          messagesByDay: messageStats?.messagesByDay || [],
        };
      case 'contacts':
        return {
          ...base,
          totalConversations: conversationStats?.totalConversations || 0,
          openConversations: conversationStats?.openConversations || 0,
          resolvedConversations: conversationStats?.resolvedConversations || 0,
        };
      default:
        return base;
    }
  };

  const downloadCSV = (data: any) => {
    const rows: string[][] = [['Metric', 'Value']];
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value !== 'object') {
        rows.push([key, String(value)]);
      }
    });
    const csvContent = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${reportType}_report_${dateRange}d_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const downloadJSON = (data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${reportType}_report_${dateRange}d_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No Workspace Selected</h2>
          <p className="text-muted-foreground">Please select a workspace to generate reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Generate and download detailed reports</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          Refresh Data
        </Button>
      </div>

      {/* Report Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Report Type</CardTitle>
          <CardDescription>Choose the type of report to generate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {reportTypes.map((rt) => (
              <button
                key={rt.value}
                onClick={() => setReportType(rt.value)}
                className={cn(
                  'p-4 border rounded-lg text-left transition-colors',
                  reportType === rt.value
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50',
                )}
              >
                <rt.icon className="h-5 w-5 mb-2 text-primary" />
                <p className="font-medium text-sm">{rt.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{rt.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div>
              <Label>Date Range</Label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </div>
            <Button onClick={() => generateReport('csv')} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Download CSV
            </Button>
            <Button variant="outline" onClick={() => generateReport('json')} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Download JSON
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Data Preview</CardTitle>
          <CardDescription>Current data summary for the selected report type</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Spinner size="md" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 border rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Total Messages</p>
                <p className="text-2xl font-bold">{formatNumber(messageStats?.totalMessages || 0)}</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Inbound</p>
                <p className="text-2xl font-bold text-green-600">{formatNumber(messageStats?.inboundMessages || 0)}</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Outbound</p>
                <p className="text-2xl font-bold text-blue-600">{formatNumber(messageStats?.outboundMessages || 0)}</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Response Rate</p>
                <p className="text-2xl font-bold text-purple-600">
                  {messageStats?.responseRate ? `${(messageStats.responseRate * 100).toFixed(1)}%` : 'N/A'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
