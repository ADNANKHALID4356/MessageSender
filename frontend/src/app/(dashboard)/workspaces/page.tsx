'use client';

import { useState } from 'react';
import {
  Search,
  Plus,
  MoreVertical,
  Building2,
  Users,
  MessageSquare,
  Settings,
  Edit,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn, formatNumber } from '@/lib/utils';
import { WorkspacesSkeleton } from '@/components/skeletons';
import { useWorkspaces, useCreateWorkspace, useDeleteWorkspace } from '@/hooks/use-workspace';
import { useWorkspaceStore } from '@/stores/workspace-store';

export default function WorkspacesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('');
  
  const { setCurrentWorkspace } = useWorkspaceStore();

  // Fetch workspaces
  const { data, isLoading, isError, error, refetch } = useWorkspaces();
  const createWorkspace = useCreateWorkspace({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Workspace created successfully' });
      setIsCreateDialogOpen(false);
      setNewWorkspaceName('');
      setNewWorkspaceDescription('');
      refetch();
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message || 'Failed to create workspace', variant: 'destructive' });
    },
  });
  
  const deleteWorkspace = useDeleteWorkspace({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Workspace deleted successfully' });
      refetch();
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message || 'Failed to delete workspace', variant: 'destructive' });
    },
  });

  const workspaces = data?.data || [];
  
  const filteredWorkspaces = workspaces.filter((workspace) => {
    const matchesSearch = workspace.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || workspace.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalContacts = workspaces.reduce((sum, w) => sum + (w._count?.contacts || 0), 0);
  const totalMessages = workspaces.reduce((sum, w) => sum + (w._count?.messages || 0), 0);
  const activeCount = workspaces.filter(w => w.status === 'active').length;

  const [wsNameError, setWsNameError] = useState('');

  const handleCreateWorkspace = () => {
    if (!newWorkspaceName.trim()) {
      setWsNameError('Workspace name is required');
      return;
    }
    setWsNameError('');
    createWorkspace.mutate({
      name: newWorkspaceName,
      description: newWorkspaceDescription || undefined,
    });
  };

  const handleDeleteWorkspace = (workspaceId: string) => {
    if (confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) {
      deleteWorkspace.mutate(workspaceId);
    }
  };

  const handleSelectWorkspace = (workspace: typeof workspaces[0]) => {
    setCurrentWorkspace({
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      isActive: workspace.status === 'active',
    });
    toast({ title: 'Workspace Selected', description: `Switched to ${workspace.name}` });
  };

  // Loading state
  if (isLoading) {
    return <WorkspacesSkeleton />;
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Workspaces</h1>
            <p className="text-muted-foreground">Manage your business workspaces</p>
          </div>
        </div>
        <Card className="p-8">
          <div className="text-center text-destructive">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <h3 className="font-medium mb-1">Failed to load workspaces</h3>
            <p className="text-sm text-muted-foreground mb-4">{error?.message || 'An error occurred'}</p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground">
            Manage your business workspaces (max 5 allowed)
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={activeCount >= 5}>
              <Plus className="h-4 w-4 mr-2" />
              Create Workspace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Workspace</DialogTitle>
              <DialogDescription>
                Add a new workspace to manage a separate business or project.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className={cn(wsNameError && 'text-destructive')}>Workspace Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., E-commerce Store"
                  value={newWorkspaceName}
                  onChange={(e) => { setNewWorkspaceName(e.target.value); if (wsNameError) setWsNameError(''); }}
                  aria-invalid={!!wsNameError}
                  aria-describedby={wsNameError ? 'ws-name-error' : undefined}
                  className={cn(wsNameError && 'border-destructive focus-visible:ring-destructive')}
                />
                {wsNameError && (
                  <p id="ws-name-error" className="text-sm text-destructive flex items-center gap-1 animate-in slide-in-from-top-1 fade-in duration-200">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {wsNameError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="Brief description of this workspace"
                  value={newWorkspaceDescription}
                  onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateWorkspace} disabled={createWorkspace.isPending}>
                {createWorkspace.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Workspace
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workspaces</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workspaces.length}/5</div>
            <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${(workspaces.length / 5) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalContacts)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalMessages)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workspaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'inactive'].map((status) => (
            <Button
              key={status}
              size="sm"
              variant={statusFilter === status ? 'secondary' : 'ghost'}
              onClick={() => setStatusFilter(status as 'all' | 'active' | 'inactive')}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Workspaces Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredWorkspaces.map((workspace) => (
          <Card
            key={workspace.id}
            className={cn(
              'hover:shadow-md transition-shadow cursor-pointer',
              workspace.status === 'inactive' && 'opacity-60'
            )}
            onClick={() => handleSelectWorkspace(workspace)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{workspace.name}</CardTitle>
                    {workspace.status === 'active' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <CardDescription>{workspace.description || 'No description'}</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSelectWorkspace(workspace); }}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Select
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleDeleteWorkspace(workspace.id); }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-2 bg-muted rounded-lg">
                  <div className="text-lg font-bold">{workspace._count?.pages || 0}</div>
                  <div className="text-xs text-muted-foreground">Pages</div>
                </div>
                <div className="text-center p-2 bg-muted rounded-lg">
                  <div className="text-lg font-bold">{formatNumber(workspace._count?.contacts || 0)}</div>
                  <div className="text-xs text-muted-foreground">Contacts</div>
                </div>
                <div className="text-center p-2 bg-muted rounded-lg">
                  <div className="text-lg font-bold">{formatNumber(workspace._count?.messages || 0)}</div>
                  <div className="text-xs text-muted-foreground">Messages</div>
                </div>
                <div className="text-center p-2 bg-muted rounded-lg">
                  <div className="text-lg font-bold">{workspace._count?.members || 0}</div>
                  <div className="text-xs text-muted-foreground">Team</div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Created {new Date(workspace.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredWorkspaces.length === 0 && !isLoading && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-medium mb-1">No workspaces found</h3>
            <p className="text-sm">
              {workspaces.length === 0
                ? 'Create your first workspace to get started'
                : 'Try adjusting your search or filter criteria'}
            </p>
            {workspaces.length === 0 && (
              <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Workspace
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
