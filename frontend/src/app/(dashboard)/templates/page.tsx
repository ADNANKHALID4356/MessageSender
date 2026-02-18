'use client';

import { useState } from 'react';
import {
  FileCode,
  Plus,
  Edit,
  Trash2,
  Search,
  Copy,
  AlertCircle,
  Loader2,
  MessageSquare,
  Tag,
  X,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useTemplates, useCannedResponses } from '@/hooks/use-templates';
import { useToast } from '@/hooks/use-toast';

// Helper: extract displayable text from template content (might be string or JSON object)
function getContentText(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (typeof content === 'object') {
    if (content.text) return content.text;
    return JSON.stringify(content, null, 2);
  }
  return String(content);
}

export default function TemplatesPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'templates' | 'canned'>('templates');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Templates
  const {
    templates: templatesRaw,
    isLoading: templatesLoading,
    create: createTemplateFn,
    update: updateTemplateFn,
    remove: deleteTemplateFn,
    isCreating: isCreatingTemplate,
    isUpdating: isUpdatingTemplate,
  } = useTemplates();

  // Canned responses
  const {
    responses: cannedRaw,
    isLoading: cannedLoading,
    create: createCannedFn,
    update: updateCannedFn,
    remove: deleteCannedFn,
    isCreating: isCreatingCanned,
    isUpdating: isUpdatingCanned,
  } = useCannedResponses();

  const templates = (templatesRaw as any[]) || [];
  const cannedResponses = (cannedRaw as any[]) || [];

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    category: '',
    // Canned-specific
    shortcut: '',
    title: '',
  });

  const [templateErrors, setTemplateErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setFormData({ name: '', content: '', category: '', shortcut: '', title: '' });
    setShowCreateForm(false);
    setEditingId(null);
    setTemplateErrors({});
  };

  const handleCreateTemplate = async () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Template name is required';
    if (!formData.content.trim()) errors.content = 'Content is required';
    if (Object.keys(errors).length > 0) { setTemplateErrors(errors); return; }
    setTemplateErrors({});
    try {
      await createTemplateFn({
        name: formData.name.trim(),
        content: { text: formData.content.trim() },
        category: formData.category.trim() || undefined,
      });
      toast({ title: 'Template created', description: `"${formData.name}" has been created successfully.` });
      resetForm();
    } catch (err: any) {
      toast({ title: 'Failed to create template', description: err?.message || 'An unexpected error occurred.', variant: 'destructive' });
    }
  };

  const handleCreateCanned = async () => {
    const errors: Record<string, string> = {};
    if (!formData.shortcut.trim()) errors.shortcut = 'Shortcut is required';
    if (!formData.content.trim()) errors.content = 'Content is required';
    if (Object.keys(errors).length > 0) { setTemplateErrors(errors); return; }
    setTemplateErrors({});
    try {
      await createCannedFn({
        shortcut: formData.shortcut.trim(),
        title: formData.title.trim() || formData.shortcut.trim(),
        content: formData.content.trim(),
        category: formData.category.trim() || undefined,
      });
      toast({ title: 'Canned response created', description: `"/${formData.shortcut}" has been created successfully.` });
      resetForm();
    } catch (err: any) {
      toast({ title: 'Failed to create canned response', description: err?.message || 'An unexpected error occurred.', variant: 'destructive' });
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingId || !formData.name.trim()) return;
    try {
      await updateTemplateFn({
        id: editingId,
        dto: {
          name: formData.name.trim(),
          content: { text: formData.content.trim() },
          category: formData.category.trim() || undefined,
        },
      });
      toast({ title: 'Template updated', description: 'Changes saved successfully.' });
      resetForm();
    } catch (err: any) {
      toast({ title: 'Failed to update template', description: err?.message || 'An unexpected error occurred.', variant: 'destructive' });
    }
  };

  const handleUpdateCanned = async () => {
    if (!editingId) return;
    try {
      await updateCannedFn({
        id: editingId,
        dto: {
          shortcut: formData.shortcut.trim(),
          title: formData.title.trim(),
          content: formData.content.trim(),
          category: formData.category.trim() || undefined,
        },
      });
      toast({ title: 'Canned response updated', description: 'Changes saved successfully.' });
      resetForm();
    } catch (err: any) {
      toast({ title: 'Failed to update canned response', description: err?.message || 'An unexpected error occurred.', variant: 'destructive' });
    }
  };

  const handleCopyContent = (content: any) => {
    const text = getContentText(content);
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Content copied to clipboard.' });
  };

  const filteredTemplates = templates.filter(
    (t: any) =>
      t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getContentText(t.content).toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredCanned = cannedResponses.filter(
    (c: any) =>
      c.shortcut?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.content?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <FileCode className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No Workspace Selected</h2>
          <p className="text-muted-foreground">Please select a workspace to manage templates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates & Canned Responses</h1>
          <p className="text-muted-foreground">Manage reusable message templates and quick responses</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create New
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === 'templates' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => { setActiveTab('templates'); resetForm(); }}
        >
          <FileCode className="h-4 w-4 mr-2" />
          Message Templates
        </Button>
        <Button
          variant={activeTab === 'canned' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => { setActiveTab('canned'); resetForm(); }}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Canned Responses
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`Search ${activeTab === 'templates' ? 'templates' : 'canned responses'}...`}
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Create / Edit Form */}
      {(showCreateForm || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit' : 'Create'} {activeTab === 'templates' ? 'Template' : 'Canned Response'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeTab === 'templates' ? (
                <>
                  <div>
                    <Label className={cn(templateErrors.name && 'text-destructive')}>Template Name *</Label>
                    <Input
                      placeholder="e.g., Welcome Message"
                      value={formData.name}
                      onChange={(e) => { setFormData({ ...formData, name: e.target.value }); if (templateErrors.name) setTemplateErrors(prev => { const n = { ...prev }; delete n.name; return n; }); }}
                      aria-invalid={!!templateErrors.name}
                      className={cn(templateErrors.name && 'border-destructive focus-visible:ring-destructive')}
                    />
                    {templateErrors.name && (
                      <p className="text-sm text-destructive flex items-center gap-1 mt-1.5 animate-in slide-in-from-top-1 fade-in duration-200">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {templateErrors.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className={cn(templateErrors.content && 'text-destructive')}>Content *</Label>
                    <textarea
                      className={cn(
                        'w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring',
                        templateErrors.content && 'border-destructive focus:ring-destructive'
                      )}
                      placeholder="Template content with {{variables}}..."
                      value={formData.content}
                      onChange={(e) => { setFormData({ ...formData, content: e.target.value }); if (templateErrors.content) setTemplateErrors(prev => { const n = { ...prev }; delete n.content; return n; }); }}
                    />
                    {templateErrors.content && (
                      <p className="text-sm text-destructive flex items-center gap-1 mt-1.5 animate-in slide-in-from-top-1 fade-in duration-200">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {templateErrors.content}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className={cn(templateErrors.shortcut && 'text-destructive')}>Shortcut *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">/</span>
                        <Input
                          className={cn('pl-7', templateErrors.shortcut && 'border-destructive focus-visible:ring-destructive')}
                          placeholder="greeting"
                          value={formData.shortcut}
                          onChange={(e) => { setFormData({ ...formData, shortcut: e.target.value.replace(/\s/g, '_') }); if (templateErrors.shortcut) setTemplateErrors(prev => { const n = { ...prev }; delete n.shortcut; return n; }); }}
                          aria-invalid={!!templateErrors.shortcut}
                        />
                      </div>
                      {templateErrors.shortcut && (
                        <p className="text-sm text-destructive flex items-center gap-1 mt-1.5 animate-in slide-in-from-top-1 fade-in duration-200">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          {templateErrors.shortcut}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Title</Label>
                      <Input
                        placeholder="Quick greeting"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className={cn(templateErrors.content && 'text-destructive')}>Content *</Label>
                    <textarea
                      className={cn(
                        'w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring',
                        templateErrors.content && 'border-destructive focus:ring-destructive'
                      )}
                      placeholder="Response content..."
                      value={formData.content}
                      onChange={(e) => { setFormData({ ...formData, content: e.target.value }); if (templateErrors.content) setTemplateErrors(prev => { const n = { ...prev }; delete n.content; return n; }); }}
                    />
                    {templateErrors.content && (
                      <p className="text-sm text-destructive flex items-center gap-1 mt-1.5 animate-in slide-in-from-top-1 fade-in duration-200">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {templateErrors.content}
                      </p>
                    )}
                  </div>
                </>
              )}
              <div>
                <Label>Category (optional)</Label>
                <Input
                  placeholder="e.g., support, sales"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={
                    editingId
                      ? activeTab === 'templates'
                        ? handleUpdateTemplate
                        : handleUpdateCanned
                      : activeTab === 'templates'
                      ? handleCreateTemplate
                      : handleCreateCanned
                  }
                  disabled={
                    activeTab === 'templates'
                      ? !formData.name.trim() || !formData.content.trim()
                      : !formData.shortcut.trim() || !formData.content.trim()
                  }
                >
                  {editingId ? 'Save Changes' : 'Create'}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {activeTab === 'templates' ? (
        templatesLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-1">
                  {searchQuery ? 'No templates found' : 'No Templates Yet'}
                </h3>
                <p className="text-sm">
                  {searchQuery ? 'Try adjusting your search criteria.' : 'Create message templates to reuse across campaigns.'}
                </p>
                {!searchQuery && (
                  <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template: any) => (
              <Card key={template.id} className="group">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium">{template.name}</h3>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleCopyContent(template.content)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingId(template.id);
                          setFormData({
                            name: template.name || '',
                            content: getContentText(template.content),
                            category: template.category || '',
                            shortcut: '',
                            title: '',
                          });
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => {
                          if (window.confirm('Delete this template?')) {
                            deleteTemplateFn(template.id).then(() => {
                              toast({ title: 'Template deleted', description: `"${template.name}" has been removed.` });
                            }).catch((err: any) => {
                              toast({ title: 'Failed to delete', description: err?.message || 'An error occurred.', variant: 'destructive' });
                            });
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {template.category && (
                    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground mb-2">
                      <Tag className="h-2.5 w-2.5 mr-1" />
                      {template.category}
                    </span>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {getContentText(template.content)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        cannedLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCanned.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-1">
                  {searchQuery ? 'No canned responses found' : 'No Canned Responses Yet'}
                </h3>
                <p className="text-sm">
                  {searchQuery ? 'Try adjusting your search criteria.' : 'Create quick responses accessible via /shortcut in the inbox.'}
                </p>
                {!searchQuery && (
                  <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Canned Response
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredCanned.map((cr: any) => (
              <Card key={cr.id} className="group">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono font-bold text-primary">/{cr.shortcut}</span>
                        <span className="text-sm text-muted-foreground">— {cr.title}</span>
                        {cr.category && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {cr.category}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{cr.content}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleCopyContent(cr.content)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingId(cr.id);
                          setFormData({
                            name: '',
                            content: cr.content || '',
                            category: cr.category || '',
                            shortcut: cr.shortcut || '',
                            title: cr.title || '',
                          });
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => {
                          if (window.confirm('Delete this canned response?')) {
                            deleteCannedFn(cr.id).then(() => {
                              toast({ title: 'Canned response deleted', description: `"/${cr.shortcut}" has been removed.` });
                            }).catch((err: any) => {
                              toast({ title: 'Failed to delete', description: err?.message || 'An error occurred.', variant: 'destructive' });
                            });
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Facebook Message Tags Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Facebook Message Tags (Beyond 24-Hour Window)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Facebook allows sending messages outside the 24-hour messaging window using these approved message tags:
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">CONFIRMED_EVENT_UPDATE</p>
                <p className="text-xs text-muted-foreground">Event reminders, cancellations, schedule changes</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">POST_PURCHASE_UPDATE</p>
                <p className="text-xs text-muted-foreground">Order confirmations, shipping updates, receipts</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">ACCOUNT_UPDATE</p>
                <p className="text-xs text-muted-foreground">Account status, payment issues, profile updates</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">HUMAN_AGENT</p>
                <p className="text-xs text-muted-foreground">Live agent support responses (7-day window)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
