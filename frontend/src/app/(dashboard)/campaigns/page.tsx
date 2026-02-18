'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  MoreVertical,
  Play,
  Pause,
  Send,
  Users,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit,
  Copy,
  Trash2,
  Loader2,
  RefreshCw,
  Rocket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn, formatNumber } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores';
import { CampaignsSkeleton } from '@/components/skeletons';
import {
  useCampaigns,
  useLaunchCampaign,
  usePauseCampaign,
  useResumeCampaign,
  useCancelCampaign,
  useDeleteCampaign,
  useDuplicateCampaign,
} from '@/hooks';
import { Campaign, CampaignStatus, CampaignType } from '@/services/campaign.service';

const statusIcons: Record<CampaignStatus, React.ComponentType<{ className?: string }>> = {
  draft: AlertCircle,
  scheduled: Clock,
  running: Play,
  paused: Pause,
  completed: CheckCircle2,
  failed: XCircle,
};

const statusColors: Record<CampaignStatus, string> = {
  draft: 'text-gray-500 bg-gray-100 dark:bg-gray-800',
  scheduled: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
  running: 'text-green-500 bg-green-100 dark:bg-green-900/30',
  paused: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
  completed: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30',
  failed: 'text-red-500 bg-red-100 dark:bg-red-900/30',
};

const typeColors: Record<CampaignType, string> = {
  broadcast: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  otn: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  recurring: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export default function CampaignsPage() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspaceStore();
  const workspaceId = currentWorkspace?.id;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);

  // API hooks
  const { data, isLoading, isError, error, refetch } = useCampaigns(
    workspaceId || '',
    { search: searchQuery || undefined, status: statusFilter !== 'all' ? statusFilter as CampaignStatus : undefined },
    { enabled: !!workspaceId }
  );

  const launchCampaign = useLaunchCampaign({ onSuccess: () => refetch() });
  const pauseCampaign = usePauseCampaign({ onSuccess: () => refetch() });
  const resumeCampaign = useResumeCampaign({ onSuccess: () => refetch() });
  const cancelCampaign = useCancelCampaign({ onSuccess: () => refetch() });
  const duplicateCampaign = useDuplicateCampaign({ onSuccess: () => refetch() });
  const deleteCampaign = useDeleteCampaign({
    onSuccess: () => {
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
      refetch();
    },
  });

  // No workspace selected
  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Send className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No workspace selected</h2>
        <p className="text-muted-foreground mb-4">
          Please select a workspace to view campaigns
        </p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return <CampaignsSkeleton />;
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load campaigns</h2>
        <p className="text-muted-foreground mb-4">
          {error?.message || 'An error occurred while loading campaigns'}
        </p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  const campaigns = data?.data || [];
  
  // Filter campaigns locally for instant feedback
  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const totalSent = campaigns.reduce((sum, c) => sum + c.sentCount, 0);
  const totalDelivered = campaigns.reduce((sum, c) => sum + c.deliveredCount, 0);
  const avgDeliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0';
  const activeCampaigns = campaigns.filter((c) => c.status === 'running').length;

  const handleDelete = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (campaignToDelete) {
      deleteCampaign.mutate(campaignToDelete.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">
            Create and manage your messaging campaigns
          </p>
        </div>
        <Button onClick={() => router.push('/campaigns/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Play className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCampaigns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalSent)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDeliveryRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'draft', 'scheduled', 'running', 'paused', 'completed'].map((status) => (
            <Button
              key={status}
              size="sm"
              variant={statusFilter === status ? 'secondary' : 'ghost'}
              onClick={() => setStatusFilter(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredCampaigns.length > 0 ? (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left text-sm font-medium">Campaign</th>
                    <th className="p-3 text-left text-sm font-medium">Type</th>
                    <th className="p-3 text-left text-sm font-medium">Status</th>
                    <th className="p-3 text-left text-sm font-medium">Segment</th>
                    <th className="p-3 text-left text-sm font-medium">Progress</th>
                    <th className="p-3 text-left text-sm font-medium">Performance</th>
                    <th className="p-3 text-left w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map((campaign) => {
                    const StatusIcon = statusIcons[campaign.status];
                    const progress = campaign.targetCount > 0
                      ? (campaign.sentCount / campaign.targetCount) * 100
                      : 0;
                    const deliveryRate = campaign.sentCount > 0
                      ? ((campaign.deliveredCount / campaign.sentCount) * 100).toFixed(1)
                      : '0';
                    const readRate = campaign.deliveredCount > 0
                      ? ((campaign.readCount / campaign.deliveredCount) * 100).toFixed(1)
                      : '0';

                    const isLaunching = launchCampaign.isPending && launchCampaign.variables === campaign.id;
                    const isPausing = pauseCampaign.isPending && pauseCampaign.variables === campaign.id;
                    const isResuming = resumeCampaign.isPending && resumeCampaign.variables === campaign.id;
                    const isCancelling = cancelCampaign.isPending && cancelCampaign.variables === campaign.id;
                    const isDuplicating = duplicateCampaign.isPending && duplicateCampaign.variables === campaign.id;

                    return (
                      <tr key={campaign.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-xs text-muted-foreground">{campaign.description}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-xs font-medium uppercase',
                              typeColors[campaign.type]
                            )}
                          >
                            {campaign.type}
                          </span>
                        </td>
                        <td className="p-3">
                          <div
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium capitalize',
                              statusColors[campaign.status]
                            )}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {campaign.status}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{campaign.segment?.name || 'All Contacts'}</span>
                            <span className="text-xs text-muted-foreground">
                              ({formatNumber(campaign.targetCount)})
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1 min-w-[120px]">
                            <div className="flex items-center justify-between text-xs">
                              <span>{formatNumber(campaign.sentCount)} sent</span>
                              <span>{progress.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          {campaign.sentCount > 0 ? (
                            <div className="text-xs space-y-0.5">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Delivered:</span>
                                <span className="font-medium">{deliveryRate}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Read:</span>
                                <span className="font-medium">{readRate}%</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {campaign.status === 'draft' && (
                                <DropdownMenuItem
                                  onClick={() => launchCampaign.mutate(campaign.id)}
                                  disabled={isLaunching}
                                >
                                  {isLaunching ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Rocket className="h-4 w-4 mr-2" />
                                  )}
                                  Launch
                                </DropdownMenuItem>
                              )}
                              {campaign.status === 'running' && (
                                <DropdownMenuItem
                                  onClick={() => pauseCampaign.mutate(campaign.id)}
                                  disabled={isPausing}
                                >
                                  {isPausing ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Pause className="h-4 w-4 mr-2" />
                                  )}
                                  Pause
                                </DropdownMenuItem>
                              )}
                              {campaign.status === 'paused' && (
                                <DropdownMenuItem
                                  onClick={() => resumeCampaign.mutate(campaign.id)}
                                  disabled={isResuming}
                                >
                                  {isResuming ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Play className="h-4 w-4 mr-2" />
                                  )}
                                  Resume
                                </DropdownMenuItem>
                              )}
                              {(campaign.status === 'running' || campaign.status === 'paused' || campaign.status === 'scheduled') && (
                                <DropdownMenuItem
                                  onClick={() => cancelCampaign.mutate(campaign.id)}
                                  disabled={isCancelling}
                                  className="text-amber-600"
                                >
                                  {isCancelling ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <XCircle className="h-4 w-4 mr-2" />
                                  )}
                                  Cancel
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => router.push(`/campaigns/${campaign.id}`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                {campaign.status === 'draft' ? 'Edit' : 'View Details'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => duplicateCampaign.mutate(campaign.id)}
                                disabled={isDuplicating}
                              >
                                {isDuplicating ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Copy className="h-4 w-4 mr-2" />
                                )}
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(campaign)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-medium mb-1">No campaigns found</h3>
              <p className="text-sm">
                {campaigns.length === 0
                  ? 'Create your first campaign to get started'
                  : 'Try adjusting your search or filter criteria'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{campaignToDelete?.name}"? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteCampaign.isPending}
            >
              {deleteCampaign.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
