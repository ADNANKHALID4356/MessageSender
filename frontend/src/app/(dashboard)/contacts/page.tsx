'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Download,
  Upload,
  UserPlus,
  Tag,
  Trash2,
  Mail,
  Clock,
  Loader2,
  AlertCircle,
  MessageSquare,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContactsSkeleton } from '@/components/skeletons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn, formatTimeAgo, getInitials, formatNumber } from '@/lib/utils';
import { useContacts, useContactStats, useBulkDeleteContacts, useCreateContact, useDeleteContact, useBulkTagContacts } from '@/hooks/use-contacts';
import { useTags } from '@/hooks/use-tags';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { EngagementLevel, Contact } from '@/services/contact.service';
import { contactService } from '@/services/contact.service';

const engagementStyles: Record<string, string> = {
  HOT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  WARM: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  COLD: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  NEW: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export default function ContactsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { currentWorkspace } = useWorkspaceStore();
  const workspaceId = currentWorkspace?.id || '';
  
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [engagementFilter, setEngagementFilter] = useState<EngagementLevel | undefined>();

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [bulkTagDialogOpen, setBulkTagDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [contactToManageTags, setContactToManageTags] = useState<Contact | null>(null);

  // Add contact form state
  const [newContactPsid, setNewContactPsid] = useState('');
  const [newContactFirstName, setNewContactFirstName] = useState('');
  const [newContactLastName, setNewContactLastName] = useState('');
  const [newContactPageId, setNewContactPageId] = useState('');
  const [contactFormErrors, setContactFormErrors] = useState<Record<string, string>>({});

  // Tag management state
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Fetch contacts
  const { data, isLoading, isError, error, refetch } = useContacts(
    workspaceId,
    { page, limit: 20, search: searchQuery || undefined, engagementLevel: engagementFilter },
    { enabled: !!workspaceId }
  );

  // Fetch stats
  const { data: stats } = useContactStats(workspaceId, { enabled: !!workspaceId });

  // Bulk delete mutation
  const bulkDelete = useBulkDeleteContacts(workspaceId, {
    onSuccess: (result) => {
      toast({ title: 'Success', description: `${result.deleted} contacts deleted` });
      setSelectedContacts([]);
      refetch();
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message || 'Failed to delete contacts', variant: 'destructive' });
    },
  });

  // Create contact mutation
  const createContact = useCreateContact(workspaceId, {
    onSuccess: () => {
      toast({ title: 'Contact created', description: 'New contact has been added successfully.' });
      setAddDialogOpen(false);
      setNewContactPsid('');
      setNewContactFirstName('');
      setNewContactLastName('');
      setNewContactPageId('');
      refetch();
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message || 'Failed to create contact', variant: 'destructive' });
    },
  });

  // Delete contact mutation
  const deleteContact = useDeleteContact(workspaceId, {
    onSuccess: () => {
      toast({ title: 'Contact deleted', description: 'The contact has been removed.' });
      setDeleteDialogOpen(false);
      setContactToDelete(null);
      refetch();
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message || 'Failed to delete contact', variant: 'destructive' });
    },
  });

  // Bulk tag mutation
  const bulkTag = useBulkTagContacts(workspaceId, {
    onSuccess: (result) => {
      toast({ title: 'Tags updated', description: `${result.updated} contacts updated.` });
      setBulkTagDialogOpen(false);
      setSelectedTagIds([]);
      refetch();
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message || 'Failed to update tags', variant: 'destructive' });
    },
  });

  // Fetch tags for tag management
  const { data: tags } = useTags(workspaceId, { enabled: !!workspaceId });

  const contacts = data?.data || [];
  const meta = data?.meta;

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedContacts((prev) =>
      prev.length === contacts.length ? [] : contacts.map((c) => c.id)
    );
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedContacts.length} contacts?`)) {
      bulkDelete.mutate(selectedContacts);
    }
  };

  const handleAddContact = () => {
    const errors: Record<string, string> = {};
    if (!newContactPsid.trim()) errors.psid = 'PSID is required';
    if (!newContactPageId.trim()) errors.pageId = 'Page ID is required';
    if (Object.keys(errors).length > 0) {
      setContactFormErrors(errors);
      return;
    }
    setContactFormErrors({});
    createContact.mutate({
      psid: newContactPsid.trim(),
      pageId: newContactPageId.trim(),
      firstName: newContactFirstName.trim() || undefined,
      lastName: newContactLastName.trim() || undefined,
    });
  };

  const handleDeleteContact = (contact: Contact) => {
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteContact = () => {
    if (contactToDelete) {
      deleteContact.mutate(contactToDelete.id);
    }
  };

  const handleManageTags = (contact: Contact) => {
    setContactToManageTags(contact);
    setSelectedTagIds(contact.tags?.map(t => t.tag.id) || []);
    setTagsDialogOpen(true);
  };

  const handleSaveTags = async () => {
    if (!contactToManageTags) return;
    const currentTagIds = contactToManageTags.tags?.map(t => t.tag.id) || [];
    const toAdd = selectedTagIds.filter(id => !currentTagIds.includes(id));
    const toRemove = currentTagIds.filter(id => !selectedTagIds.includes(id));

    try {
      if (toAdd.length > 0) {
        await contactService.addTags(workspaceId, contactToManageTags.id, toAdd);
      }
      if (toRemove.length > 0) {
        await contactService.removeTags(workspaceId, contactToManageTags.id, toRemove);
      }
      toast({ title: 'Tags updated', description: 'Contact tags have been updated.' });
      setTagsDialogOpen(false);
      setContactToManageTags(null);
      setSelectedTagIds([]);
      refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update tags';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleBulkTagOpen = () => {
    setSelectedTagIds([]);
    setBulkTagDialogOpen(true);
  };

  const handleBulkTagSave = () => {
    if (selectedTagIds.length === 0) {
      toast({ title: 'Error', description: 'Select at least one tag.', variant: 'destructive' });
      return;
    }
    bulkTag.mutate({ contactIds: selectedContacts, addTagIds: selectedTagIds });
  };

  const handleSendMessage = (contact: Contact) => {
    router.push(`/send-message?contactId=${contact.id}`);
  };

  const toggleTagSelection = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  // No workspace selected
  if (!workspaceId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">Select a workspace to view contacts</p>
        </div>
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-medium mb-1">No workspace selected</h3>
            <p className="text-sm">Please select a workspace from the header to view contacts.</p>
          </div>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return <ContactsSkeleton />;
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">Manage your contacts</p>
        </div>
        <Card className="p-8">
          <div className="text-center text-destructive">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <h3 className="font-medium mb-1">Failed to load contacts</h3>
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
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your {formatNumber(stats?.total || meta?.total || 0)} contacts in {currentWorkspace?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast({ title: 'Coming Soon', description: 'Contact import will be available in a future update.' })}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={() => toast({ title: 'Coming Soon', description: 'Contact export will be available in a future update.' })}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats?.total || 0)}</div>
            <p className="text-xs text-muted-foreground">All contacts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Within 24h Window</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(stats?.withinWindow || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Can message now</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscribed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats?.subscribed || 0)}
            </div>
            <p className="text-xs text-muted-foreground">OTN/Recurring enabled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hot Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatNumber(stats?.byEngagement?.HOT || 0)}
            </div>
            <p className="text-xs text-muted-foreground">High engagement</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-8"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  {engagementFilter || 'All Engagement'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setEngagementFilter(undefined)}>
                  All Engagement
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {(['HOT', 'WARM', 'COLD', 'INACTIVE', 'NEW'] as EngagementLevel[]).map((level) => (
                  <DropdownMenuItem key={level} onClick={() => setEngagementFilter(level)}>
                    {level}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {selectedContacts.length > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-muted-foreground">
                  {selectedContacts.length} selected
                </span>
                <Button variant="outline" size="sm" onClick={handleBulkTagOpen}>
                  <Tag className="h-4 w-4 mr-2" />
                  Add Tag
                </Button>
                <Button variant="outline" size="sm" onClick={() => toast({ title: 'Coming Soon', description: 'Bulk messaging will be available in a future update.' })}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={handleBulkDelete}
                  disabled={bulkDelete.isPending}
                >
                  {bulkDelete.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete
                </Button>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left w-12">
                    <Checkbox
                      checked={contacts.length > 0 && selectedContacts.length === contacts.length}
                      onCheckedChange={toggleAll}
                    />
                  </th>
                  <th className="p-3 text-left text-sm font-medium">Contact</th>
                  <th className="p-3 text-left text-sm font-medium">PSID</th>
                  <th className="p-3 text-left text-sm font-medium">Engagement</th>
                  <th className="p-3 text-left text-sm font-medium">Tags</th>
                  <th className="p-3 text-left text-sm font-medium">24h Window</th>
                  <th className="p-3 text-left text-sm font-medium">Last Interaction</th>
                  <th className="p-3 text-left w-12"></th>
                </tr>
              </thead>
              <tbody>
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No contacts found
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => (
                    <tr key={contact.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <Checkbox
                          checked={selectedContacts.includes(contact.id)}
                          onCheckedChange={() => toggleContact(contact.id)}
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium overflow-hidden">
                            {contact.profilePictureUrl ? (
                              <img src={contact.profilePictureUrl} alt={contact.fullName || ''} className="h-full w-full object-cover" />
                            ) : (
                              getInitials(contact.fullName || contact.firstName || 'U')
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{contact.page?.name || 'No page'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {contact.psid}
                        </code>
                      </td>
                      <td className="p-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium capitalize',
                            engagementStyles[contact.engagementLevel] || engagementStyles.NEW
                          )}
                        >
                          {contact.engagementLevel?.toLowerCase() || 'new'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {contact.tags?.slice(0, 2).map((t) => (
                            <span
                              key={t.tag.id}
                              className="px-2 py-0.5 rounded text-xs"
                              style={{ backgroundColor: t.tag.color + '20', color: t.tag.color }}
                            >
                              {t.tag.name}
                            </span>
                          ))}
                          {(contact.tags?.length || 0) > 2 && (
                            <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs">
                              +{(contact.tags?.length || 0) - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'h-2 w-2 rounded-full',
                              contact.lastMessageFromContactAt &&
                              new Date(contact.lastMessageFromContactAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
                                ? 'bg-green-500'
                                : 'bg-gray-400'
                            )}
                          />
                          <span className="text-sm">
                            {contact.lastMessageFromContactAt &&
                            new Date(contact.lastMessageFromContactAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
                              ? 'Active'
                              : 'Expired'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {contact.lastInteractionAt ? formatTimeAgo(new Date(contact.lastInteractionAt)) : 'Never'}
                      </td>
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleSendMessage(contact)}>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Send Message
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleManageTags(contact)}>
                              <Tag className="h-4 w-4 mr-2" />
                              Manage Tags
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteContact(contact)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {contacts.length} of {meta?.total || 0} contacts
              {meta && ` (Page ${meta.page} of ${meta.totalPages})`}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!meta || meta.page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!meta || meta.page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Contact Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>
              Create a new contact by entering their Facebook Page-Scoped ID (PSID) and associated page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="psid" className={cn(contactFormErrors.psid && 'text-destructive')}>PSID *</Label>
              <Input
                id="psid"
                placeholder="Enter Page-Scoped User ID"
                value={newContactPsid}
                onChange={(e) => { setNewContactPsid(e.target.value); if (contactFormErrors.psid) setContactFormErrors(prev => { const n = { ...prev }; delete n.psid; return n; }); }}
                aria-invalid={!!contactFormErrors.psid}
                className={cn(contactFormErrors.psid && 'border-destructive focus-visible:ring-destructive')}
              />
              {contactFormErrors.psid && (
                <p className="text-sm text-destructive flex items-center gap-1 animate-in slide-in-from-top-1 fade-in duration-200">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {contactFormErrors.psid}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pageId" className={cn(contactFormErrors.pageId && 'text-destructive')}>Page ID *</Label>
              <Input
                id="pageId"
                placeholder="Enter Facebook Page ID"
                value={newContactPageId}
                onChange={(e) => { setNewContactPageId(e.target.value); if (contactFormErrors.pageId) setContactFormErrors(prev => { const n = { ...prev }; delete n.pageId; return n; }); }}
                aria-invalid={!!contactFormErrors.pageId}
                className={cn(contactFormErrors.pageId && 'border-destructive focus-visible:ring-destructive')}
              />
              {contactFormErrors.pageId && (
                <p className="text-sm text-destructive flex items-center gap-1 animate-in slide-in-from-top-1 fade-in duration-200">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {contactFormErrors.pageId}
                </p>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="First name"
                  value={newContactFirstName}
                  onChange={(e) => setNewContactFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Last name"
                  value={newContactLastName}
                  onChange={(e) => setNewContactLastName(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddContact} disabled={createContact.isPending}>
              {createContact.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Contact Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{contactToDelete?.fullName || contactToDelete?.firstName || 'this contact'}&rdquo;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteContact} disabled={deleteContact.isPending}>
              {deleteContact.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Tags Dialog */}
      <Dialog open={tagsDialogOpen} onOpenChange={setTagsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Tags</DialogTitle>
            <DialogDescription>
              Select tags for &ldquo;{contactToManageTags?.fullName || contactToManageTags?.firstName || 'contact'}&rdquo;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {tags && tags.length > 0 ? (
              tags.map((tag) => (
                <div
                  key={tag.id}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-md cursor-pointer border transition-colors',
                    selectedTagIds.includes(tag.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:bg-muted'
                  )}
                  onClick={() => toggleTagSelection(tag.id)}
                >
                  <Checkbox checked={selectedTagIds.includes(tag.id)} />
                  <span
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color || '#6B7280' }}
                  />
                  <span className="text-sm">{tag.name}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No tags available. Create tags first.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTags}>
              <Tag className="h-4 w-4 mr-2" />
              Save Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Tag Dialog */}
      <Dialog open={bulkTagDialogOpen} onOpenChange={setBulkTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tags to {selectedContacts.length} Contacts</DialogTitle>
            <DialogDescription>
              Select tags to add to the selected contacts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {tags && tags.length > 0 ? (
              tags.map((tag) => (
                <div
                  key={tag.id}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-md cursor-pointer border transition-colors',
                    selectedTagIds.includes(tag.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:bg-muted'
                  )}
                  onClick={() => toggleTagSelection(tag.id)}
                >
                  <Checkbox checked={selectedTagIds.includes(tag.id)} />
                  <span
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color || '#6B7280' }}
                  />
                  <span className="text-sm">{tag.name}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No tags available. Create tags first.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkTagDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkTagSave} disabled={bulkTag.isPending || selectedTagIds.length === 0}>
              {bulkTag.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Tag className="h-4 w-4 mr-2" />}
              Add Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
