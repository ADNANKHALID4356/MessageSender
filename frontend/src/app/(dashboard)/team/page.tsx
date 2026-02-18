'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  MoreVertical,
  UserCheck,
  UserX,
  UserMinus,
  UserPlus2,
  Shield,
  Loader2,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { authService, ManagedUser, PendingUser } from '@/services/auth.service';
import { workspaceService, Workspace } from '@/services/workspace.service';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import { cn, getInitials, formatTimeAgo } from '@/lib/utils';

const roleColors: Record<string, string> = {
  MANAGER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  OPERATOR: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  VIEW_ONLY: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  ACTIVE: { icon: CheckCircle2, color: 'text-green-500', label: 'Active' },
  PENDING: { icon: Clock, color: 'text-amber-500', label: 'Pending' },
  INACTIVE: { icon: XCircle, color: 'text-gray-400', label: 'Inactive' },
};

export default function TeamPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<ManagedUser | PendingUser | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('none');
  const [selectedPermission, setSelectedPermission] = useState<string>('OPERATOR');

  // Check if current user is admin
  const isAdmin = currentUser?.isAdmin;

  // Fetch all users
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => authService.getAllUsers(),
    enabled: isAdmin,
  });

  // Fetch pending users
  const { data: pendingUsers = [], isLoading: loadingPending } = useQuery({
    queryKey: ['pendingUsers'],
    queryFn: () => authService.getPendingUsers(),
    enabled: isAdmin,
  });

  // Fetch workspaces
  const { data: workspacesData } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => workspaceService.getWorkspaces(),
    enabled: isAdmin,
  });
  const workspaces = workspacesData?.data ?? [];

  // Approve user mutation
  const approveMutation = useMutation({
    mutationFn: ({ userId, workspaceId, permissionLevel }: { userId: string; workspaceId?: string; permissionLevel?: string }) =>
      authService.approveUser(userId, workspaceId, permissionLevel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      toast({ title: 'Success', description: 'User has been approved' });
      setApproveDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to approve user', variant: 'destructive' });
    },
  });

  // Reject user mutation
  const rejectMutation = useMutation({
    mutationFn: (userId: string) => authService.rejectUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      toast({ title: 'Success', description: 'User registration rejected' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to reject user', variant: 'destructive' });
    },
  });

  // Deactivate user mutation
  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => authService.deactivateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Success', description: 'User has been deactivated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to deactivate user', variant: 'destructive' });
    },
  });

  // Reactivate user mutation
  const reactivateMutation = useMutation({
    mutationFn: (userId: string) => authService.reactivateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Success', description: 'User has been reactivated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to reactivate user', variant: 'destructive' });
    },
  });

  // Filter users based on search and status
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = (user: PendingUser | ManagedUser) => {
    setSelectedUser(user);
    setApproveDialogOpen(true);
  };

  const confirmApprove = () => {
    if (!selectedUser) return;
    approveMutation.mutate({
      userId: selectedUser.id,
      workspaceId: selectedWorkspace !== 'none' ? selectedWorkspace : undefined,
      permissionLevel: selectedWorkspace !== 'none' ? selectedPermission : undefined,
    });
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Admin Access Required</CardTitle>
            <CardDescription>
              You need administrator privileges to manage team members.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === 'ACTIVE').length,
    pending: pendingUsers.length,
    inactive: users.filter((u) => u.status === 'INACTIVE').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
        <p className="text-muted-foreground">
          Manage team members and approve new registrations
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card className={cn(stats.pending > 0 && 'border-amber-200 bg-amber-50/50 dark:bg-amber-900/10')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            {stats.pending > 0 && (
              <p className="text-xs text-amber-600 mt-1">Requires attention</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <XCircle className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{stats.inactive}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Users ({users.length})</TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Pending Approval ({pendingUsers.length})
            {pendingUsers.length > 0 && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-amber-500 rounded-full" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* All Users Tab */}
        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <Card>
            <CardContent className="pt-6">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium mb-1">No users found</h3>
                  <p className="text-sm">Try adjusting your search or filter</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left text-sm font-medium">User</th>
                        <th className="p-3 text-left text-sm font-medium">Status</th>
                        <th className="p-3 text-left text-sm font-medium">Workspaces</th>
                        <th className="p-3 text-left text-sm font-medium">Last Login</th>
                        <th className="p-3 text-left text-sm font-medium">Joined</th>
                        <th className="p-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => {
                        const status = statusConfig[user.status] || statusConfig.PENDING;
                        const StatusIcon = status.icon;
                        
                        return (
                          <tr key={user.id} className="border-b hover:bg-muted/50">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                                  {getInitials(`${user.firstName} ${user.lastName || ''}`)}
                                </div>
                                <div>
                                  <p className="font-medium">{user.firstName} {user.lastName}</p>
                                  <p className="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <StatusIcon className={cn('h-4 w-4', status.color)} />
                                <span className="text-sm">{status.label}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {user.workspaces.length === 0 ? (
                                  <span className="text-sm text-muted-foreground">No workspaces</span>
                                ) : (
                                  <>
                                    {user.workspaces.slice(0, 2).map((ws) => (
                                      <span
                                        key={ws.workspaceId}
                                        className={cn(
                                          'px-2 py-0.5 rounded text-xs',
                                          roleColors[ws.permissionLevel] || roleColors.VIEW_ONLY
                                        )}
                                      >
                                        {ws.workspaceName}
                                      </span>
                                    ))}
                                    {user.workspaces.length > 2 && (
                                      <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs">
                                        +{user.workspaces.length - 2}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">
                              {user.lastLoginAt ? formatTimeAgo(new Date(user.lastLoginAt)) : 'Never'}
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {user.status === 'PENDING' && (
                                    <>
                                      <DropdownMenuItem onClick={() => handleApprove(user)}>
                                        <UserCheck className="h-4 w-4 mr-2 text-green-500" />
                                        Approve
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => rejectMutation.mutate(user.id)}
                                        className="text-destructive"
                                      >
                                        <UserX className="h-4 w-4 mr-2" />
                                        Reject
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {user.status === 'ACTIVE' && (
                                    <DropdownMenuItem 
                                      onClick={() => deactivateMutation.mutate(user.id)}
                                    >
                                      <UserMinus className="h-4 w-4 mr-2 text-amber-500" />
                                      Deactivate
                                    </DropdownMenuItem>
                                  )}
                                  {user.status === 'INACTIVE' && (
                                    <DropdownMenuItem 
                                      onClick={() => reactivateMutation.mutate(user.id)}
                                    >
                                      <UserPlus2 className="h-4 w-4 mr-2 text-green-500" />
                                      Reactivate
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Users Tab */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Pending Registrations
              </CardTitle>
              <CardDescription>
                Users who have registered and are waiting for your approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPending ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : pendingUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <h3 className="font-medium mb-1">All caught up!</h3>
                  <p className="text-sm">No pending registrations at this time</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-amber-50/50 dark:bg-amber-900/10"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-400 font-medium">
                          {getInitials(`${user.firstName} ${user.lastName || ''}`)}
                        </div>
                        <div>
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Registered {formatTimeAgo(new Date(user.createdAt))}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => rejectMutation.mutate(user.id)}
                          disabled={rejectMutation.isPending}
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(user)}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve User</DialogTitle>
            <DialogDescription>
              Approve this user and optionally assign them to a workspace.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
                  {getInitials(`${selectedUser.firstName} ${selectedUser.lastName || ''}`)}
                </div>
                <div>
                  <p className="font-medium">{selectedUser.firstName} {selectedUser.lastName}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assign to Workspace (Optional)</Label>
                <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No workspace (approve only)</SelectItem>
                    {workspaces.map((ws) => (
                      <SelectItem key={ws.id} value={ws.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {ws.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedWorkspace && selectedWorkspace !== 'none' && (
                <div className="space-y-2">
                  <Label>Permission Level</Label>
                  <Select value={selectedPermission} onValueChange={setSelectedPermission}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select permission" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIEW_ONLY">View Only - Can view but not modify</SelectItem>
                      <SelectItem value="OPERATOR">Operator - Can manage contacts & messages</SelectItem>
                      <SelectItem value="MANAGER">Manager - Full workspace access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmApprove} 
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                'Approve User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
