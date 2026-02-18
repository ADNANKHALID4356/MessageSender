'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  MoreVertical,
  Facebook,
  Users,
  MessageSquare,
  Settings,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Clock,
  Loader2,
  Unplug,
  Plug,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { cn, formatNumber, formatTimeAgo } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores';
import { PagesSkeleton } from '@/components/skeletons';
import {
  usePages,
  useSyncPage,
  useDeactivatePage,
  useReactivatePage,
  useFixWebhook,
  useFacebookConnectionStatus,
  useInitiateFacebookOAuth,
  useDisconnectFacebookPage,
} from '@/hooks';
import { Page } from '@/services/page.service';
import { FacebookConnectionCard, PageSelectionModal } from '@/components/facebook';

const statusIcons = {
  active: CheckCircle2,
  inactive: XCircle,
  error: AlertCircle,
};

const statusColors = {
  active: 'text-green-500',
  inactive: 'text-gray-400',
  error: 'text-red-500',
};

const statusBgColors = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function getPageStatus(page: Page): 'active' | 'inactive' | 'error' {
  if (!page.isActive) return 'inactive';
  if (!page.isWebhookActive) return 'error';
  return 'active';
}

export default function PagesPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const workspaceId = currentWorkspace?.id;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [pageToDisconnect, setPageToDisconnect] = useState<Page | null>(null);
  const [showPageSelectionModal, setShowPageSelectionModal] = useState(false);

  // API hooks
  const { data: pages, isLoading, isError, error, refetch } = usePages(workspaceId || '', {
    enabled: !!workspaceId,
  });
  
  const { data: connectionStatus, refetch: refetchConnectionStatus } = useFacebookConnectionStatus(workspaceId || '', {
    enabled: !!workspaceId,
  });

  const initiateFacebookOAuth = useInitiateFacebookOAuth({
    onSuccess: (data) => {
      window.location.href = data.authUrl;
    },
  });

  const syncPage = useSyncPage(workspaceId || '', {
    onSuccess: () => refetch(),
  });

  const deactivatePage = useDeactivatePage(workspaceId || '', {
    onSuccess: () => refetch(),
  });

  const reactivatePage = useReactivatePage(workspaceId || '', {
    onSuccess: () => refetch(),
  });

  const fixWebhook = useFixWebhook(workspaceId || '', {
    onSuccess: () => refetch(),
  });

  const disconnectPage = useDisconnectFacebookPage(workspaceId || '', {
    onSuccess: () => {
      setDisconnectDialogOpen(false);
      setPageToDisconnect(null);
      refetch();
    },
  });

  // No workspace selected
  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Facebook className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No workspace selected</h2>
        <p className="text-muted-foreground mb-4">
          Please select a workspace to view its Facebook pages
        </p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return <PagesSkeleton />;
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load pages</h2>
        <p className="text-muted-foreground mb-4">
          {error?.message || 'An error occurred while loading your pages'}
        </p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  const pagesList = pages || [];
  
  // Filter pages
  const filteredPages = pagesList.filter((page) => {
    const matchesSearch = page.pageName.toLowerCase().includes(searchQuery.toLowerCase());
    const pageStatus = getPageStatus(page);
    const matchesStatus = statusFilter === 'all' || pageStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const totalPages = pagesList.length;
  const activePages = pagesList.filter((p) => p.isActive && p.isWebhookActive).length;
  const totalConversations = pagesList.reduce((sum, p) => sum + (p._count?.conversations || 0), 0);
  const needsAttention = pagesList.filter((p) => !p.isActive || !p.isWebhookActive).length;

  const handleConnectPage = () => {
    if (workspaceId) {
      initiateFacebookOAuth.mutate(workspaceId);
    }
  };

  const handleDisconnectPage = (page: Page) => {
    setPageToDisconnect(page);
    setDisconnectDialogOpen(true);
  };

  const confirmDisconnect = () => {
    if (pageToDisconnect) {
      disconnectPage.mutate(pageToDisconnect.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facebook Pages</h1>
          <p className="text-muted-foreground">
            Manage your connected Facebook pages
          </p>
        </div>
        <Button onClick={handleConnectPage} disabled={initiateFacebookOAuth.isPending}>
          {initiateFacebookOAuth.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Facebook className="h-4 w-4 mr-2" />
          )}
          Connect Page
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
            <Facebook className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPages}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activePages}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalConversations)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{needsAttention}</div>
          </CardContent>
        </Card>
      </div>

      {/* Health Alert Banner */}
      {needsAttention > 0 && (
        <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-amber-800 dark:text-amber-300">
                {needsAttention} page{needsAttention > 1 ? 's' : ''} need{needsAttention === 1 ? 's' : ''} attention
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                {pagesList
                  .filter((p) => !p.isActive || !p.isWebhookActive)
                  .map((p) => {
                    const issues = [];
                    if (!p.isActive) issues.push('inactive');
                    if (!p.isWebhookActive) issues.push('webhook disconnected');
                    return `${p.pageName} (${issues.join(', ')})`;
                  })
                  .join(' · ')}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                Inactive pages or disconnected webhooks will prevent message delivery. Use the Fix Webhook or Reactivate actions to resolve.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'inactive', 'error'].map((status) => (
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

      {/* Pages Grid */}
      {filteredPages.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPages.map((page) => {
            const status = getPageStatus(page);
            const StatusIcon = statusIcons[status];
            const isSyncing = syncPage.isPending && syncPage.variables === page.id;
            const isFixingWebhook = fixWebhook.isPending && fixWebhook.variables === page.id;

            return (
              <Card
                key={page.id}
                className={cn(
                  'hover:shadow-md transition-shadow',
                  status !== 'active' && 'border-amber-200 dark:border-amber-900'
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center overflow-hidden">
                        {page.picture ? (
                          <img src={page.picture} alt={page.pageName} className="h-full w-full object-cover" />
                        ) : (
                          <Facebook className="h-6 w-6 text-blue-600" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <CardTitle className="text-lg">{page.pageName}</CardTitle>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {page.pageId}
                          </code>
                          <a
                            href={`https://facebook.com/${page.pageId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => syncPage.mutate(page.id)} disabled={isSyncing}>
                          {isSyncing ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Sync Page
                        </DropdownMenuItem>
                        {!page.isWebhookActive && (
                          <DropdownMenuItem onClick={() => fixWebhook.mutate(page.id)} disabled={isFixingWebhook}>
                            {isFixingWebhook ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Plug className="h-4 w-4 mr-2" />
                            )}
                            Fix Webhook
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {page.isActive ? (
                          <DropdownMenuItem
                            onClick={() => deactivatePage.mutate(page.id)}
                            className="text-amber-600"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => reactivatePage.mutate(page.id)}
                            className="text-green-600"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Reactivate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDisconnectPage(page)}
                          className="text-red-600"
                        >
                          <Unplug className="h-4 w-4 mr-2" />
                          Disconnect
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Status & Category */}
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium capitalize',
                        statusBgColors[status]
                      )}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {status === 'active' ? 'Connected' : status === 'inactive' ? 'Inactive' : 'Error'}
                    </div>
                    {page.category && (
                      <span className="text-xs text-muted-foreground">
                        {page.category}
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="text-center p-2 bg-muted rounded-lg">
                      <div className="text-lg font-bold">{formatNumber(page._count?.conversations || 0)}</div>
                      <div className="text-xs text-muted-foreground">Conversations</div>
                    </div>
                    <div className="text-center p-2 bg-muted rounded-lg">
                      <div className="text-lg font-bold">
                        {page.facebookAccount?.name?.split(' ')[0] || 'Unknown'}
                      </div>
                      <div className="text-xs text-muted-foreground">Account</div>
                    </div>
                  </div>

                  {/* Webhook Status */}
                  <div
                    className={cn(
                      'p-2 rounded-lg text-xs mb-3',
                      page.isWebhookActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    )}
                  >
                    {page.isWebhookActive ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Webhook active - Receiving messages
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Webhook inactive - Fix required
                      </span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Added {formatTimeAgo(new Date(page.createdAt))}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => syncPage.mutate(page.id)}
                        disabled={isSyncing}
                      >
                        {isSyncing ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        Sync
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Facebook className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-medium mb-1">No pages found</h3>
            <p className="text-sm">
              {pagesList.length === 0
                ? 'Connect your first Facebook page to get started'
                : 'Try adjusting your search or filter criteria'}
            </p>
          </div>
        </Card>
      )}

      {/* Help Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Facebook className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">
                {connectionStatus?.connected
                  ? `Connected as ${connectionStatus.account?.name || 'Unknown'}`
                  : 'Connect a new Facebook Page'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {connectionStatus?.connected
                  ? 'You can connect additional pages from your Facebook account'
                  : 'To connect a page, you need to be an admin of the page and grant the necessary permissions'}
              </p>
            </div>
            {connectionStatus?.connected ? (
              <Button onClick={() => setShowPageSelectionModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Page
              </Button>
            ) : (
              <Button onClick={handleConnectPage} disabled={initiateFacebookOAuth.isPending}>
                {initiateFacebookOAuth.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Facebook className="h-4 w-4 mr-2" />
                )}
                Connect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Disconnect Dialog */}
      <Dialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Page</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect "{pageToDisconnect?.pageName}"? 
              You will no longer receive messages from this page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDisconnect}
              disabled={disconnectPage.isPending}
            >
              {disconnectPage.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Unplug className="h-4 w-4 mr-2" />
              )}
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Page Selection Modal */}
      {connectionStatus?.account?.id && (
        <PageSelectionModal
          open={showPageSelectionModal}
          onOpenChange={setShowPageSelectionModal}
          workspaceId={workspaceId || ''}
          facebookAccountId={connectionStatus.account.id}
          onSuccess={() => {
            refetch();
            refetchConnectionStatus();
          }}
        />
      )}
    </div>
  );
}
