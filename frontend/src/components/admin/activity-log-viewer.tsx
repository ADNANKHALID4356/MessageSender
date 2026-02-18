'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activityLogService, ActivityLog, ActivityLogParams } from '@/services/activity-log.service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ActivityLogViewer() {
  const [params, setParams] = useState<ActivityLogParams>({ page: 1, limit: 25 });

  const { data, isLoading } = useQuery({
    queryKey: ['activity-logs', params],
    queryFn: () => activityLogService.getLogs(params),
  });

  const logs = data?.data ?? [];

  const formatAction = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('ADD')) return 'text-green-600';
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'text-red-600';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'text-blue-600';
    if (action.includes('LOGIN')) return 'text-purple-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Activity Logs</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Filter by action..."
            className="w-48"
            onChange={(e) => setParams({ ...params, action: e.target.value || undefined, page: 1 })}
          />
          <Input
            placeholder="Entity type..."
            className="w-40"
            onChange={(e) => setParams({ ...params, entityType: e.target.value || undefined, page: 1 })}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading logs...</div>
      ) : logs.length === 0 ? (
        <div className="text-sm text-muted-foreground">No activity logs found.</div>
      ) : (
        <div className="space-y-2">
          {logs.map((log: ActivityLog) => (
            <Card key={log.id} className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${getActionColor(log.action)}`}>
                      {formatAction(log.action)}
                    </span>
                    {log.entityType && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                        {log.entityType}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {log.admin && <span>by {log.admin.username || log.admin.firstName}</span>}
                    {log.user && <span>by {log.user.firstName} {log.user.lastName}</span>}
                    {log.ipAddress && <span> from {log.ipAddress}</span>}
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {JSON.stringify(log.details).slice(0, 200)}
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={params.page === 1}
          onClick={() => setParams({ ...params, page: (params.page || 1) - 1 })}
        >
          Previous
        </Button>
        <span className="text-sm py-1.5">Page {params.page || 1}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={logs.length < (params.limit || 25)}
          onClick={() => setParams({ ...params, page: (params.page || 1) + 1 })}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
