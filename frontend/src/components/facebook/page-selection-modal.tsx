'use client';

import { useState, useEffect } from 'react';
import {
  Facebook,
  CheckCircle2,
  Circle,
  Loader2,
  Search,
  AlertCircle,
  Users,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  useFacebookAvailablePages,
  useConnectFacebookPage,
} from '@/hooks';
import { FacebookPage } from '@/services/facebook.service';

interface PageSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  facebookAccountId: string;
  onSuccess?: () => void;
}

export function PageSelectionModal({
  open,
  onOpenChange,
  workspaceId,
  facebookAccountId,
  onSuccess,
}: PageSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [connectingPages, setConnectingPages] = useState<Set<string>>(new Set());

  // Fetch available pages
  const { 
    data: availablePages, 
    isLoading: isLoadingPages,
    refetch: refetchPages,
    isRefetching,
  } = useFacebookAvailablePages(facebookAccountId, {
    enabled: open && !!facebookAccountId,
  });

  // Connect page mutation
  const connectPage = useConnectFacebookPage(workspaceId, {
    onSuccess: (_, variables) => {
      setConnectingPages((prev) => {
        const next = new Set(prev);
        next.delete(variables.pageId);
        return next;
      });
      refetchPages();
      onSuccess?.();
    },
    onError: (_, variables) => {
      setConnectingPages((prev) => {
        const next = new Set(prev);
        next.delete(variables.pageId);
        return next;
      });
    },
  });

  // Reset selection when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedPages(new Set());
      setSearchQuery('');
    }
  }, [open]);

  // Filter pages by search
  const filteredPages = availablePages?.filter((page) =>
    page.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Separate connected and available pages
  const connectedPages = filteredPages.filter((p) => p.isConnected);
  const unconnectedPages = filteredPages.filter((p) => !p.isConnected);

  const handleTogglePage = (pageId: string) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  };

  const handleConnectSelected = async () => {
    const pagesToConnect = unconnectedPages.filter((p) => selectedPages.has(p.id));
    
    for (const page of pagesToConnect) {
      setConnectingPages((prev) => {
        const newSet = new Set(Array.from(prev));
        newSet.add(page.id);
        return newSet;
      });
      connectPage.mutate({
        facebookAccountId,
        pageId: page.id,
        pageName: page.name,
      });
    }
  };

  const handleConnectSingle = (page: FacebookPage) => {
    setConnectingPages((prev) => {
      const newSet = new Set(Array.from(prev));
      newSet.add(page.id);
      return newSet;
    });
    connectPage.mutate({
      facebookAccountId,
      pageId: page.id,
      pageName: page.name,
    });
  };

  const selectedCount = Array.from(selectedPages).filter(
    (id) => unconnectedPages.some((p) => p.id === id)
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-blue-600" />
            Select Facebook Pages
          </DialogTitle>
          <DialogDescription>
            Choose which Facebook Pages you want to connect to this workspace.
            You can add or remove pages at any time.
          </DialogDescription>
        </DialogHeader>

        {/* Search and Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetchPages()}
            disabled={isRefetching}
          >
            <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
          </Button>
        </div>

        {/* Page List */}
        <ScrollArea className="h-[400px] pr-4">
          {isLoadingPages ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Loading your Facebook pages...</p>
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h4 className="font-medium mb-2">No Pages Found</h4>
              <p className="text-sm text-muted-foreground max-w-sm">
                {availablePages?.length === 0
                  ? "No Facebook Pages found. Make sure you have admin access to at least one page."
                  : "No pages match your search criteria."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Already Connected Pages */}
              {connectedPages.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Already Connected ({connectedPages.length})
                  </h4>
                  <div className="space-y-2">
                    {connectedPages.map((page) => (
                      <PageListItem
                        key={page.id}
                        page={page}
                        isConnected
                        isSelected={false}
                        isConnecting={false}
                        onToggle={() => {}}
                        onConnect={() => {}}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Available Pages */}
              {unconnectedPages.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Circle className="h-4 w-4" />
                    Available Pages ({unconnectedPages.length})
                  </h4>
                  <div className="space-y-2">
                    {unconnectedPages.map((page) => (
                      <PageListItem
                        key={page.id}
                        page={page}
                        isConnected={false}
                        isSelected={selectedPages.has(page.id)}
                        isConnecting={connectingPages.has(page.id)}
                        onToggle={() => handleTogglePage(page.id)}
                        onConnect={() => handleConnectSingle(page)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedCount > 0 && `${selectedCount} page(s) selected`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {selectedCount > 0 && (
              <Button
                onClick={handleConnectSelected}
                disabled={connectingPages.size > 0}
              >
                {connectingPages.size > 0 ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Connect Selected ({selectedCount})
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Page List Item Component
interface PageListItemProps {
  page: FacebookPage;
  isConnected: boolean;
  isSelected: boolean;
  isConnecting: boolean;
  onToggle: () => void;
  onConnect: () => void;
}

function PageListItem({
  page,
  isConnected,
  isSelected,
  isConnecting,
  onToggle,
  onConnect,
}: PageListItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
        isConnected && "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
        !isConnected && isSelected && "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800",
        !isConnected && !isSelected && "bg-background hover:bg-muted/50 cursor-pointer"
      )}
      onClick={() => !isConnected && !isConnecting && onToggle()}
    >
      {/* Checkbox/Status */}
      <div className="flex-shrink-0">
        {isConnected ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : isConnecting ? (
          <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
        ) : (
          <div
            className={cn(
              "h-5 w-5 rounded border-2 flex items-center justify-center transition-colors",
              isSelected
                ? "border-blue-500 bg-blue-500"
                : "border-muted-foreground/50"
            )}
          >
            {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
          </div>
        )}
      </div>

      {/* Page Picture */}
      <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center overflow-hidden flex-shrink-0">
        {page.picture ? (
          <img
            src={page.picture}
            alt={page.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <Facebook className="h-5 w-5 text-blue-600" />
        )}
      </div>

      {/* Page Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{page.name}</p>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {page.category && <span>{page.category}</span>}
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {page.pageId}
          </span>
        </div>
      </div>

      {/* Action Button */}
      {!isConnected && (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onConnect();
          }}
          disabled={isConnecting}
          className="flex-shrink-0"
        >
          {isConnecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Connect"
          )}
        </Button>
      )}

      {isConnected && (
        <span className="text-xs text-green-600 font-medium flex-shrink-0">
          Connected
        </span>
      )}
    </div>
  );
}
