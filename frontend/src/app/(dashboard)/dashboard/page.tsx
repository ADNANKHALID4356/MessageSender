'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  MessageSquare,
  Send,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Clock,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore, useCurrentWorkspace, getFirstName } from '@/stores/auth-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { cn, formatNumber } from '@/lib/utils';
import { useWorkspaceStats } from '@/hooks/use-workspace';
import { useContactStats } from '@/hooks/use-contacts';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  iconColor?: string;
  isLoading?: boolean;
}

function StatCard({ title, value, change, changeLabel, icon: Icon, iconColor, isLoading }: StatCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn('p-2 rounded-lg', iconColor || 'bg-primary/10')}>
          <Icon className={cn('h-4 w-4', iconColor ? 'text-white' : 'text-primary')} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className="text-2xl font-bold">{typeof value === 'number' ? formatNumber(value) : value}</div>
            {change !== undefined && (
              <div className="flex items-center gap-1 text-xs mt-1">
                {isPositive && <ArrowUpRight className="h-3 w-3 text-green-500" />}
                {isNegative && <ArrowDownRight className="h-3 w-3 text-red-500" />}
                <span className={cn(
                  isPositive && 'text-green-500',
                  isNegative && 'text-red-500',
                  !change && 'text-muted-foreground'
                )}>
                  {isPositive && '+'}{change}%
                </span>
                {changeLabel && <span className="text-muted-foreground">{changeLabel}</span>}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const currentWorkspace = useCurrentWorkspace();
  const { currentWorkspace: wsInfo } = useWorkspaceStore();
  const [greeting, setGreeting] = useState('');

  const workspaceId = wsInfo?.id || '';

  // Fetch real workspace statistics
  const { data: wsStats, isLoading: wsStatsLoading } = useWorkspaceStats(workspaceId, {
    enabled: !!workspaceId,
  });

  // Fetch real contact statistics
  const { data: contactStats, isLoading: contactStatsLoading } = useContactStats(workspaceId, {
    enabled: !!workspaceId,
  });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const displayName = getFirstName(user);
  const isLoading = wsStatsLoading || contactStatsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}, {displayName}!
          </h1>
          <p className="text-muted-foreground">
            {user?.isAdmin
              ? 'Here\'s an overview of your platform.'
              : `Here's what's happening in ${currentWorkspace?.workspaceName || 'your workspace'}.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/analytics')}>
            <BarChart3 className="mr-2 h-4 w-4" />
            View Reports
          </Button>
          <Button onClick={() => router.push('/campaigns')}>
            <Send className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Contacts"
          value={contactStats?.total ?? wsStats?.contacts ?? 0}
          icon={Users}
          isLoading={isLoading}
        />
        <StatCard
          title="Messages Sent"
          value={wsStats?.messages ?? 0}
          icon={Send}
          isLoading={isLoading}
        />
        <StatCard
          title="Active Conversations"
          value={wsStats?.conversations ?? 0}
          icon={MessageSquare}
          isLoading={isLoading}
        />
        <StatCard
          title="Campaigns"
          value={wsStats?.campaigns ?? 0}
          icon={TrendingUp}
          isLoading={isLoading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Engagement Breakdown */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Contact Engagement</CardTitle>
            <CardDescription>
              Breakdown of contacts by engagement level
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contactStatsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : contactStats?.byEngagement ? (
              <div className="space-y-4">
                {(Object.entries(contactStats.byEngagement) as [string, number][]).map(([level, count]) => {
                  const total = contactStats.total || 1;
                  const pct = Math.round((count / total) * 100);
                  const colorMap: Record<string, string> = {
                    HOT: 'bg-red-500',
                    WARM: 'bg-orange-500',
                    COLD: 'bg-blue-500',
                    INACTIVE: 'bg-gray-400',
                    NEW: 'bg-green-500',
                  };
                  return (
                    <div key={level} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium capitalize">{level.toLowerCase()}</span>
                        <span className="text-muted-foreground">{formatNumber(count)} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', colorMap[level] || 'bg-primary')}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                No contact data available yet. Connect a Facebook Page to start receiving contacts.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/inbox')}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Open Inbox
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/contacts')}>
              <Users className="mr-2 h-4 w-4" />
              View Contacts
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/campaigns')}>
              <Send className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/analytics')}>
              <BarChart3 className="mr-2 h-4 w-4" />
              View Analytics
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/settings')}>
              <Clock className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 24-Hour Window Status */}
      <Card>
        <CardHeader>
          <CardTitle>24-Hour Messaging Window</CardTitle>
          <CardDescription>
            Contacts available for messaging within the 24-hour window
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
              {contactStatsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-green-600 mx-auto" />
              ) : (
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatNumber(contactStats?.withinWindow ?? 0)}
                </div>
              )}
              <div className="text-sm text-muted-foreground">Within Window</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              {contactStatsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
              ) : (
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatNumber(contactStats?.subscribed ?? 0)}
                </div>
              )}
              <div className="text-sm text-muted-foreground">Subscribed</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-900/20">
              {contactStatsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-gray-600 mx-auto" />
              ) : (
                <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                  {formatNumber(Math.max(0, (contactStats?.total ?? 0) - (contactStats?.withinWindow ?? 0)))}
                </div>
              )}
              <div className="text-sm text-muted-foreground">Outside Window</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
