'use client';

import { useState } from 'react';
import {
  Search,
  Plus,
  MoreVertical,
  Users,
  TrendingUp,
  Clock,
  Target,
  Edit,
  Copy,
  Trash2,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Spinner } from '@/components/ui/spinner';
import { cn, formatNumber } from '@/lib/utils';
import { SegmentsSkeleton } from '@/components/skeletons';
import { useWorkspaceStore } from '@/stores';
import {
  useSegments,
  useDeleteSegment,
  useRecalculateSegment,
  useRecalculateAllSegments,
  useCreateSegment,
  useUpdateSegment,
} from '@/hooks';
import type { Segment, SegmentType, SegmentFilters, CreateSegmentDto, UpdateSegmentDto } from '@/services/segment.service';
import { SegmentFilterBuilder, getEmptyFilters } from '@/components/segments/segment-filter-builder';
import { previewSegment } from '@/services/segment.service';

export default function SegmentsPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | SegmentType>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);

  // Create/Edit dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [segmentName, setSegmentName] = useState('');
  const [segmentDescription, setSegmentDescription] = useState('');
  const [segmentType, setSegmentType] = useState<SegmentType>('DYNAMIC');
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [segmentFilters, setSegmentFilters] = useState<SegmentFilters>(getEmptyFilters());
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Fetch segments
  const {
    data: segmentsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useSegments({
    search: searchQuery || undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    limit: 100,
  });

  // Mutations
  const deleteSegment = useDeleteSegment();
  const recalculateSegment = useRecalculateSegment();
  const recalculateAllSegments = useRecalculateAllSegments();
  const createSegment = useCreateSegment();
  const updateSegment = useUpdateSegment();

  const segments = segmentsData?.data || [];
  const totalContacts = segments.reduce((sum, s) => sum + s.contactCount, 0);
  const dynamicCount = segments.filter((s) => s.segmentType === 'DYNAMIC').length;
  const staticCount = segments.filter((s) => s.segmentType === 'STATIC').length;

  const handleDeleteClick = (segment: Segment) => {
    setSelectedSegment(segment);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedSegment) {
      deleteSegment.mutate(selectedSegment.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setSelectedSegment(null);
        },
      });
    }
  };

  const handleRecalculate = (segmentId: string) => {
    recalculateSegment.mutate(segmentId);
  };

  const handleRecalculateAll = () => {
    recalculateAllSegments.mutate();
  };

  const handleOpenCreate = () => {
    setSegmentName('');
    setSegmentDescription('');
    setSegmentType('DYNAMIC');
    setSegmentFilters(getEmptyFilters());
    setPreviewCount(null);
    setCreateDialogOpen(true);
  };

  const handleCreateSegment = () => {
    if (!segmentName.trim()) return;
    createSegment.mutate({
      name: segmentName.trim(),
      description: segmentDescription.trim() || undefined,
      segmentType: segmentType,
      filters: segmentType === 'DYNAMIC' && segmentFilters.groups.length > 0 ? segmentFilters : undefined,
    }, {
      onSuccess: () => {
        setCreateDialogOpen(false);
      },
    });
  };

  const handleOpenEdit = (segment: Segment) => {
    setEditingSegment(segment);
    setSegmentName(segment.name);
    setSegmentDescription(segment.description || '');
    setSegmentFilters(segment.filters || getEmptyFilters());
    setPreviewCount(null);
    setEditDialogOpen(true);
  };

  const handleUpdateSegment = () => {
    if (!editingSegment || !segmentName.trim()) return;
    updateSegment.mutate({
      segmentId: editingSegment.id,
      data: {
        name: segmentName.trim(),
        description: segmentDescription.trim() || undefined,
        filters: segmentFilters.groups.length > 0 ? segmentFilters : undefined,
      },
    }, {
      onSuccess: () => {
        setEditDialogOpen(false);
        setEditingSegment(null);
      },
    });
  };

  const handleDuplicate = (segment: Segment) => {
    createSegment.mutate({
      name: `${segment.name} (Copy)`,
      description: segment.description || undefined,
      segmentType: segment.segmentType,
      filters: segment.filters || undefined,
    });
  };

  const handlePreview = async () => {
    if (segmentFilters.groups.length === 0) return;
    setIsPreviewLoading(true);
    try {
      const result = await previewSegment(segmentFilters);
      setPreviewCount(result.totalContacts);
    } catch {
      setPreviewCount(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Check workspace
  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No Workspace Selected</h2>
          <p className="text-muted-foreground">
            Please select a workspace to view segments.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return <SegmentsSkeleton />;
  }

  // Error state
  if (isError) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Failed to Load Segments</h2>
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
          <h1 className="text-2xl font-bold tracking-tight">Segments</h1>
          <p className="text-muted-foreground">
            Organize your contacts into targeted groups
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRecalculateAll}
            disabled={recalculateAllSegments.isPending}
          >
            {recalculateAllSegments.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Recalculate All
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Segment
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Segments</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{segments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dynamic Segments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dynamicCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Static Segments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staticCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalContacts)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search segments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={typeFilter === 'all' ? 'secondary' : 'ghost'}
            onClick={() => setTypeFilter('all')}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={typeFilter === 'DYNAMIC' ? 'secondary' : 'ghost'}
            onClick={() => setTypeFilter('DYNAMIC')}
          >
            Dynamic
          </Button>
          <Button
            size="sm"
            variant={typeFilter === 'STATIC' ? 'secondary' : 'ghost'}
            onClick={() => setTypeFilter('STATIC')}
          >
            Static
          </Button>
        </div>
      </div>

      {/* Segments Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {segments.map((segment) => (
          <Card key={segment.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{segment.name}</CardTitle>
                  <CardDescription>{segment.description || 'No description'}</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenEdit(segment)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Segment
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(segment)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    {segment.segmentType === 'DYNAMIC' && (
                      <DropdownMenuItem
                        onClick={() => handleRecalculate(segment.id)}
                        disabled={recalculateSegment.isPending}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Recalculate
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDeleteClick(segment)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              {/* Contact Count */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">{formatNumber(segment.contactCount)}</span>
                  <span className="text-sm text-muted-foreground">contacts</span>
                </div>
              </div>

              {/* Type Badge */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium capitalize',
                    segment.segmentType === 'DYNAMIC'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                  )}
                >
                  {segment.segmentType.toLowerCase()}
                </span>
              </div>

              {/* Filters preview */}
              {segment.filters && segment.filters.groups.length > 0 && (
                <div className="space-y-1 mb-4">
                  <span className="text-xs font-medium text-muted-foreground">Filters:</span>
                  <div className="flex flex-wrap gap-1">
                    {segment.filters.groups.slice(0, 3).map((group, idx) => (
                      <code
                        key={idx}
                        className="text-xs px-1.5 py-0.5 rounded bg-muted"
                      >
                        {group.conditions.length} condition(s)
                      </code>
                    ))}
                    {segment.filters.groups.length > 3 && (
                      <code className="text-xs px-1.5 py-0.5 rounded bg-muted">
                        +{segment.filters.groups.length - 3} more
                      </code>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {segment.lastCalculatedAt
                    ? `Calculated ${new Date(segment.lastCalculatedAt).toLocaleDateString()}`
                    : `Created ${new Date(segment.createdAt).toLocaleDateString()}`}
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(segment)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(segment)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDeleteClick(segment)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {segments.length === 0 && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-medium mb-1">No segments found</h3>
            <p className="text-sm">
              {searchQuery || typeFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Create your first segment to organize contacts'}
            </p>
          </div>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Segment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{selectedSegment?.name}&rdquo;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteSegment.isPending}
            >
              {deleteSegment.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Segment Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Segment</DialogTitle>
            <DialogDescription>
              Create a new segment to organize your contacts into targeted groups.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="seg-name">Segment Name *</Label>
              <Input
                id="seg-name"
                placeholder="e.g., Hot Leads, Recent Subscribers"
                value={segmentName}
                onChange={(e) => setSegmentName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seg-desc">Description</Label>
              <Input
                id="seg-desc"
                placeholder="Describe this segment..."
                value={segmentDescription}
                onChange={(e) => setSegmentDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Segment Type</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={segmentType === 'DYNAMIC' ? 'secondary' : 'outline'}
                  onClick={() => setSegmentType('DYNAMIC')}
                >
                  Dynamic
                </Button>
                <Button
                  size="sm"
                  variant={segmentType === 'STATIC' ? 'secondary' : 'outline'}
                  onClick={() => setSegmentType('STATIC')}
                >
                  Static
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {segmentType === 'DYNAMIC' ? 'Dynamic segments auto-update based on filter rules.' : 'Static segments have manually added contacts.'}
              </p>
            </div>
            {segmentType === 'DYNAMIC' && (
              <div className="space-y-2">
                <Label>Filter Rules</Label>
                <SegmentFilterBuilder
                  filters={segmentFilters}
                  onChange={setSegmentFilters}
                  onPreview={handlePreview}
                  previewCount={previewCount}
                  isPreviewLoading={isPreviewLoading}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSegment} disabled={createSegment.isPending || !segmentName.trim()}>
              {createSegment.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Segment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Segment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Segment</DialogTitle>
            <DialogDescription>
              Update the segment details and filter rules.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-seg-name">Segment Name *</Label>
              <Input
                id="edit-seg-name"
                value={segmentName}
                onChange={(e) => setSegmentName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-seg-desc">Description</Label>
              <Input
                id="edit-seg-desc"
                value={segmentDescription}
                onChange={(e) => setSegmentDescription(e.target.value)}
              />
            </div>
            {editingSegment?.segmentType === 'DYNAMIC' && (
              <div className="space-y-2">
                <Label>Filter Rules</Label>
                <SegmentFilterBuilder
                  filters={segmentFilters}
                  onChange={setSegmentFilters}
                  onPreview={handlePreview}
                  previewCount={previewCount}
                  isPreviewLoading={isPreviewLoading}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateSegment} disabled={updateSegment.isPending || !segmentName.trim()}>
              {updateSegment.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Edit className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
