'use client';

import { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Send,
  MessageSquare,
  Clock,
  Calendar,
  Download,
  RefreshCw,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { cn, formatNumber } from '@/lib/utils';
import { AnalyticsSkeleton } from '@/components/skeletons';
import { useWorkspaceStore } from '@/stores';
import { useAnalyticsOverview } from '@/hooks';

export default function AnalyticsPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');

  // Fetch analytics data
  const {
    data: analyticsData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useAnalyticsOverview(parseInt(dateRange));

  const conversationStats = analyticsData?.conversations;
  const messageStats = analyticsData?.messages;

  // Calculate metrics
  const overviewMetrics = useMemo(() => {
    if (!conversationStats || !messageStats) return [];

    return [
      {
        title: 'Total Messages Sent',
        value: formatNumber(messageStats.outboundMessages || 0),
        change: 0,
        changeLabel: `last ${dateRange} days`,
        icon: Send,
      },
      {
        title: 'Messages Received',
        value: formatNumber(messageStats.inboundMessages || 0),
        change: 0,
        changeLabel: `last ${dateRange} days`,
        icon: MessageSquare,
      },
      {
        title: 'Open Conversations',
        value: formatNumber(conversationStats.openConversations || 0),
        change: 0,
        changeLabel: 'currently active',
        icon: Users,
      },
      {
        title: 'Avg Response Time',
        value: `${conversationStats.averageResponseTimeMinutes?.toFixed(1) || 'N/A'}m`,
        change: 0,
        changeLabel: 'average',
        icon: Clock,
      },
    ];
  }, [conversationStats, messageStats, dateRange]);

  // Calculate daily stats from messageStats
  const dailyStats = useMemo(() => {
    if (!messageStats?.messagesByDay) return [];
    return messageStats.messagesByDay.slice(-7);
  }, [messageStats]);

  const maxDailyCount = Math.max(...(dailyStats.map((d) => d.count) || [1]), 1);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!messageStats?.messagesByDay) return [];
    return messageStats.messagesByDay.map((d: any) => ({
      date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      messages: d.count,
    }));
  }, [messageStats]);

  const pieData = useMemo(() => {
    if (!conversationStats) return [];
    return [
      { name: 'Open', value: conversationStats.openConversations || 0 },
      { name: 'Pending', value: conversationStats.pendingConversations || 0 },
      { name: 'Resolved', value: conversationStats.resolvedConversations || 0 },
    ].filter((d) => d.value > 0);
  }, [conversationStats]);

  const PIE_COLORS = ['#3b82f6', '#f59e0b', '#22c55e'];

  const handleExport = () => {
    if (!conversationStats && !messageStats) {
      return;
    }
    const rows = [
      ['Metric', 'Value'],
      ['Total Messages Sent', String(messageStats?.outboundMessages || 0)],
      ['Messages Received', String(messageStats?.inboundMessages || 0)],
      ['Total Messages', String(messageStats?.totalMessages || 0)],
      ['Response Rate', messageStats?.responseRate !== undefined ? `${(messageStats.responseRate * 100).toFixed(1)}%` : 'N/A'],
      ['Total Conversations', String(conversationStats?.totalConversations || 0)],
      ['Open Conversations', String(conversationStats?.openConversations || 0)],
      ['Pending Conversations', String(conversationStats?.pendingConversations || 0)],
      ['Resolved Conversations', String(conversationStats?.resolvedConversations || 0)],
      ['Avg Response Time (min)', conversationStats?.averageResponseTimeMinutes?.toFixed(1) || 'N/A'],
      ['Date Range', `Last ${dateRange} days`],
    ];
    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics_${dateRange}d_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Check workspace
  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No Workspace Selected</h2>
          <p className="text-muted-foreground">
            Please select a workspace to view analytics.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  // Error state
  if (isError) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Failed to Load Analytics</h2>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Track your messaging performance and engagement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            {[
              { value: '7', label: '7d' },
              { value: '30', label: '30d' },
              { value: '90', label: '90d' },
            ].map(({ value, label }) => (
              <Button
                key={value}
                size="sm"
                variant={dateRange === value ? 'secondary' : 'ghost'}
                onClick={() => setDateRange(value as typeof dateRange)}
                className="rounded-none border-0"
              >
                {label}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {overviewMetrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">{metric.changeLabel}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Daily Message Volume Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily Message Volume</CardTitle>
            <CardDescription>Messages over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Bar dataKey="messages" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  No data available for the selected period
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Conversation Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Conversation Overview</CardTitle>
            <CardDescription>Current conversation status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  No conversation data
                </div>
              )}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Total Conversations</p>
                  <p className="text-2xl font-bold">
                    {formatNumber(conversationStats?.totalConversations || 0)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Open</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatNumber(conversationStats?.openConversations || 0)}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold text-amber-600">
                    {formatNumber(conversationStats?.pendingConversations || 0)}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Resolved</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatNumber(conversationStats?.resolvedConversations || 0)}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Unread</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatNumber(conversationStats?.unreadConversations || 0)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Message Trend</CardTitle>
            <CardDescription>Messages breakdown for the period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="messages"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Inbound</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatNumber(messageStats?.inboundMessages || 0)}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Outbound</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatNumber(messageStats?.outboundMessages || 0)}
                  </p>
                </div>
              </div>
              {messageStats?.responseRate !== undefined && (
                <div className="p-4 border rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Response Rate</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {(messageStats.responseRate * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Activity</CardTitle>
          <CardDescription>Conversations started today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-primary">
                {formatNumber(conversationStats?.todayConversations || 0)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">New Conversations</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-blue-600">
                {conversationStats?.averageResponseTimeMinutes?.toFixed(1) || 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Avg Response (min)</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {formatNumber(conversationStats?.resolvedConversations || 0)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Resolved</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-amber-600">
                {formatNumber(conversationStats?.pendingConversations || 0)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Pending Response</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
