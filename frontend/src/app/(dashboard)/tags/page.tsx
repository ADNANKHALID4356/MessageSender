'use client';

import { useState } from 'react';
import {
  Search,
  Plus,
  MoreVertical,
  Tag,
  Users,
  Edit,
  Trash2,
  Loader2,
  X,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatNumber } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '@/hooks/use-tags';
import { useToast } from '@/hooks/use-toast';

const colorOptions = [
  { name: 'Red', value: '#EF4444', bgClass: 'bg-red-500', textColor: 'text-red-700 dark:text-red-400', bgLight: 'bg-red-100 dark:bg-red-900/30' },
  { name: 'Orange', value: '#F97316', bgClass: 'bg-orange-500', textColor: 'text-orange-700 dark:text-orange-400', bgLight: 'bg-orange-100 dark:bg-orange-900/30' },
  { name: 'Yellow', value: '#EAB308', bgClass: 'bg-yellow-500', textColor: 'text-yellow-700 dark:text-yellow-400', bgLight: 'bg-yellow-100 dark:bg-yellow-900/30' },
  { name: 'Green', value: '#22C55E', bgClass: 'bg-green-500', textColor: 'text-green-700 dark:text-green-400', bgLight: 'bg-green-100 dark:bg-green-900/30' },
  { name: 'Blue', value: '#3B82F6', bgClass: 'bg-blue-500', textColor: 'text-blue-700 dark:text-blue-400', bgLight: 'bg-blue-100 dark:bg-blue-900/30' },
  { name: 'Purple', value: '#A855F7', bgClass: 'bg-purple-500', textColor: 'text-purple-700 dark:text-purple-400', bgLight: 'bg-purple-100 dark:bg-purple-900/30' },
  { name: 'Pink', value: '#EC4899', bgClass: 'bg-pink-500', textColor: 'text-pink-700 dark:text-pink-400', bgLight: 'bg-pink-100 dark:bg-pink-900/30' },
  { name: 'Gray', value: '#6B7280', bgClass: 'bg-gray-500', textColor: 'text-gray-700 dark:text-gray-400', bgLight: 'bg-gray-100 dark:bg-gray-800' },
];

function getColorClasses(hex: string) {
  const found = colorOptions.find((c) => c.value === hex);
  return found || colorOptions[7]; // Default to gray
}

export default function TagsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTag, setEditingTag] = useState<{ id: string; name: string; color: string } | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(colorOptions[4].value); // Blue default
  const { currentWorkspace } = useWorkspaceStore();
  const { toast } = useToast();

  const workspaceId = currentWorkspace?.id || '';

  // Real API hooks
  const { data: tags = [], isLoading } = useTags(workspaceId);
  const createTag = useCreateTag(workspaceId, {
    onSuccess: () => {
      toast({ title: 'Tag created', description: 'The tag was created successfully.' });
      resetForm();
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });
  const updateTag = useUpdateTag(workspaceId, {
    onSuccess: () => {
      toast({ title: 'Tag updated', description: 'The tag was updated successfully.' });
      setEditingTag(null);
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });
  const deleteTag = useDeleteTag(workspaceId, {
    onSuccess: () => {
      toast({ title: 'Tag deleted', description: 'The tag was deleted successfully.' });
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalTaggedContacts = tags.reduce((sum, t) => sum + (t._count?.contacts ?? 0), 0);

  const resetForm = () => {
    setShowCreateModal(false);
    setNewTagName('');
    setNewTagColor(colorOptions[4].value);
  };

  const [tagNameError, setTagNameError] = useState('');

  const handleCreate = () => {
    if (!newTagName.trim()) {
      setTagNameError('Tag name is required');
      return;
    }
    setTagNameError('');
    createTag.mutate({ name: newTagName.trim(), color: newTagColor });
  };

  const handleUpdate = () => {
    if (!editingTag || !editingTag.name.trim()) return;
    updateTag.mutate({
      tagId: editingTag.id,
      data: { name: editingTag.name.trim(), color: editingTag.color },
    });
  };

  const handleDelete = (tagId: string, tagName: string) => {
    if (confirm(`Are you sure you want to delete the tag "${tagName}"?`)) {
      deleteTag.mutate(tagId);
    }
  };

  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Please select a workspace to manage tags.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tags</h1>
          <p className="text-muted-foreground">
            Organize your contacts with custom tags
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Tag
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tags</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : tags.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tagged Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatNumber(totalTaggedContacts)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Contacts/Tag</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : tags.length > 0 ? (
                formatNumber(Math.round(totalTaggedContacts / tags.length))
              ) : (
                0
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Create Tag Inline Form */}
      {showCreateModal && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="tagName" className={cn(tagNameError && 'text-destructive')}>Tag Name</Label>
                <Input
                  id="tagName"
                  placeholder="e.g. VIP, New Customer"
                  value={newTagName}
                  onChange={(e) => { setNewTagName(e.target.value); if (tagNameError) setTagNameError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                  aria-invalid={!!tagNameError}
                  className={cn(tagNameError && 'border-destructive focus-visible:ring-destructive')}
                />
                {tagNameError && (
                  <p className="text-sm text-destructive flex items-center gap-1 animate-in slide-in-from-top-1 fade-in duration-200">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {tagNameError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-1.5">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setNewTagColor(color.value)}
                      className={cn(
                        'h-8 w-8 rounded-full transition-all',
                        color.bgClass,
                        newTagColor === color.value
                          ? 'ring-2 ring-offset-2 ring-primary'
                          : 'opacity-60 hover:opacity-100'
                      )}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={handleCreate} disabled={createTag.isPending || !newTagName.trim()}>
                {createTag.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create
              </Button>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Tags Grid */}
      {!isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTags.map((tag) => {
            const colors = getColorClasses(tag.color);
            const isEditing = editingTag?.id === tag.id;

            return (
              <Card key={tag.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  {/* Tag Badge */}
                  <div className="flex items-start justify-between mb-3">
                    {isEditing ? (
                      <Input
                        value={editingTag.name}
                        onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                        className="h-8 text-sm"
                        autoFocus
                      />
                    ) : (
                      <div
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium',
                          colors.bgLight,
                          colors.textColor
                        )}
                      >
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </div>
                    )}
                    {!isEditing && (
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Contact Count */}
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-bold">{formatNumber(tag._count?.contacts ?? 0)}</span>
                    <span className="text-sm text-muted-foreground">contacts</span>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      {new Date(tag.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex gap-1">
                      {isEditing ? (
                        <>
                          <Button size="sm" onClick={handleUpdate} disabled={updateTag.isPending}>
                            {updateTag.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingTag(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditingTag({ id: tag.id, name: tag.name, color: tag.color })}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleDelete(tag.id, tag.name)}
                            disabled={deleteTag.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && filteredTags.length === 0 && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-medium mb-1">
              {searchQuery ? 'No tags found' : 'No tags yet'}
            </h3>
            <p className="text-sm">
              {searchQuery
                ? 'Try adjusting your search criteria'
                : 'Create your first tag to start organizing contacts'}
            </p>
            {!searchQuery && (
              <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Tag
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Color Palette Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Available Tag Colors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((color) => (
              <div
                key={color.name}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
                  color.bgLight,
                  color.textColor
                )}
              >
                <div className={cn('h-3 w-3 rounded-full', color.bgClass)} />
                {color.name}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
