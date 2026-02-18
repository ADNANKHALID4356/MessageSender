'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Globe,
  Clock,
  Tag,
  Send,
  MessageSquare,
  Calendar,
  AlertCircle,
  Edit,
  Trash2,
  Loader2,
  RefreshCw,
  Plus,
  Shield,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn, formatNumber } from '@/lib/utils';
import { ContactDetailSkeleton } from '@/components/skeletons';
import { useWorkspaceStore } from '@/stores';
import { useContact, useUpdateContact, useDeleteContact, useTags } from '@/hooks';
import { useSendMessage } from '@/hooks/use-conversations';

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.contactId as string;
  const { currentWorkspace } = useWorkspaceStore();

  const workspaceId = currentWorkspace?.id || '';

  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [messageText, setMessageText] = useState('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editFieldValue, setEditFieldValue] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  // Fetch contact
  const {
    data: contact,
    isLoading,
    isError,
    error,
    refetch,
  } = useContact(workspaceId, contactId);

  // Fetch recent messages for this contact
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const { data: tags } = useTags(workspaceId);
  const updateContact = useUpdateContact(workspaceId);
  const deleteContact = useDeleteContact(workspaceId);
  const sendMessage = useSendMessage();

  // Calculate 24-hour window status
  const windowStatus = useMemo(() => {
    if (!contact?.lastMessageFromContactAt) return { active: false, label: 'No interaction' };
    const lastMsg = new Date(contact.lastMessageFromContactAt);
    const now = new Date();
    const diff = now.getTime() - lastMsg.getTime();
    const hoursRemaining = Math.max(0, 24 - diff / (1000 * 60 * 60));

    if (hoursRemaining > 0) {
      return {
        active: true,
        label: `${hoursRemaining.toFixed(1)}h remaining`,
        hoursRemaining,
      };
    }
    return { active: false, label: 'Window expired' };
  }, [contact?.lastMessageFromContactAt]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !contact) return;
    try {
      await sendMessage.mutateAsync({
        conversationId: '', // Will auto-create
        content: { text: messageText },
      });
      setMessageText('');
    } catch {
      // Error handled by hook
    }
  };

  const handleUpdateNotes = async () => {
    if (!contact) return;
    try {
      await updateContact.mutateAsync({
        id: contact.id,
        data: { notes: editNotes },
      });
      setIsEditing(false);
    } catch {
      // Error handled by hook
    }
  };

  const handleDelete = async () => {
    if (!contact) return;
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    try {
      await deleteContact.mutateAsync(contact.id);
      router.push('/contacts');
    } catch {
      // Error handled by hook
    }
  };

  const handleSaveCustomField = async (key: string, value: string) => {
    if (!contact) return;
    const updatedFields = { ...(contact.customFields || {}), [key]: value };
    try {
      await updateContact.mutateAsync({
        id: contact.id,
        data: { customFields: updatedFields },
      });
      setEditingField(null);
    } catch {
      // Error handled by hook
    }
  };

  const handleAddCustomField = async () => {
    if (!contact || !newFieldKey.trim()) return;
    const updatedFields = { ...(contact.customFields || {}), [newFieldKey.trim()]: newFieldValue };
    try {
      await updateContact.mutateAsync({
        id: contact.id,
        data: { customFields: updatedFields },
      });
      setNewFieldKey('');
      setNewFieldValue('');
    } catch {
      // Error handled by hook
    }
  };

  const handleDeleteCustomField = async (key: string) => {
    if (!contact) return;
    const updatedFields = { ...(contact.customFields || {}) };
    delete updatedFields[key];
    try {
      await updateContact.mutateAsync({
        id: contact.id,
        data: { customFields: updatedFields },
      });
    } catch {
      // Error handled by hook
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No Workspace Selected</h2>
          <p className="text-muted-foreground">Please select a workspace first.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <ContactDetailSkeleton />;
  }

  if (isError || !contact) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Contact Not Found</h2>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'Unable to load contact'}
          </p>
          <Button onClick={() => router.push('/contacts')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contacts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/contacts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            {contact.profilePictureUrl ? (
              <img
                src={contact.profilePictureUrl}
                alt={contact.fullName || 'Contact'}
                className="h-12 w-12 rounded-full"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {contact.fullName || contact.firstName || 'Unknown Contact'}
              </h1>
              <p className="text-sm text-muted-foreground">
                PSID: {contact.psid} · {contact.page?.name || 'Unknown Page'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column — Contact Info */}
        <div className="space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">
                    {contact.firstName} {contact.lastName || ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Source</p>
                  <p className="font-medium capitalize">{contact.source.toLowerCase()}</p>
                </div>
              </div>
              {contact.locale && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Locale</p>
                    <p className="font-medium">{contact.locale}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">First Interaction</p>
                  <p className="font-medium">
                    {contact.firstInteractionAt
                      ? new Date(contact.firstInteractionAt).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Last Interaction</p>
                  <p className="font-medium">
                    {contact.lastInteractionAt
                      ? new Date(contact.lastInteractionAt).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Engagement Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Engagement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Level</span>
                <span
                  className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    contact.engagementLevel === 'HOT' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                    contact.engagementLevel === 'WARM' && 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                    contact.engagementLevel === 'COLD' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                    contact.engagementLevel === 'INACTIVE' && 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
                    contact.engagementLevel === 'NEW' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                  )}
                >
                  {contact.engagementLevel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Score</span>
                <span className="font-bold text-lg">{contact.engagementScore}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subscribed</span>
                <span className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  contact.isSubscribed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                )}>
                  {contact.isSubscribed ? 'Yes' : 'No'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 24-Hour Window Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-4 w-4" />
                24-Hour Window
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                'p-4 rounded-lg text-center',
                windowStatus.active
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800',
              )}>
                <Zap className={cn(
                  'h-8 w-8 mx-auto mb-2',
                  windowStatus.active ? 'text-green-600' : 'text-red-600',
                )} />
                <p className={cn(
                  'text-lg font-bold',
                  windowStatus.active ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400',
                )}>
                  {windowStatus.active ? 'Window Active' : 'Window Expired'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{windowStatus.label}</p>
              </div>
              {!windowStatus.active && (
                <div className="mt-3 text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Bypass options available:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Message Tags (HUMAN_AGENT, etc.)</li>
                    <li>One-Time Notification (OTN)</li>
                    <li>Recurring Notification</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contact.tags && contact.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map((ct) => (
                    <span
                      key={ct.tag.id}
                      className="px-3 py-1 text-sm rounded-full border"
                      style={{
                        backgroundColor: `${ct.tag.color}20`,
                        borderColor: ct.tag.color,
                        color: ct.tag.color,
                      }}
                    >
                      {ct.tag.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tags assigned</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column — Notes + Quick Send + Custom Fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Message */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-4 w-4" />
                Send Quick Message
              </CardTitle>
              <CardDescription>
                {windowStatus.active
                  ? 'Within 24-hour window — direct messaging available'
                  : 'Window expired — bypass method required'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={sendMessage.isPending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendMessage.isPending}
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Custom Fields */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Custom Fields</CardTitle>
            </CardHeader>
            <CardContent>
              {contact.customFields && Object.keys(contact.customFields).length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(contact.customFields).map(([key, value]) => (
                    <div key={key} className="p-3 border rounded-lg group">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                        {key}
                        <span className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingField(key);
                              setEditFieldValue(String(value));
                            }}
                            className="text-primary hover:text-primary/80"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomField(key)}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </span>
                      </p>
                      {editingField === key ? (
                        <div className="flex gap-1 mt-1">
                          <Input
                            className="h-7 text-sm"
                            value={editFieldValue}
                            onChange={(e) => setEditFieldValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveCustomField(key, editFieldValue)}
                          />
                          <Button size="sm" className="h-7 px-2" onClick={() => handleSaveCustomField(key, editFieldValue)}>
                            Save
                          </Button>
                        </div>
                      ) : (
                        <p className="font-medium mt-1">{String(value)}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-3">No custom fields set</p>
              )}
              <div className="mt-4 p-3 border rounded-lg border-dashed">
                <p className="text-xs text-muted-foreground mb-2">Add New Field</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Field name"
                    className="h-8 text-sm"
                    value={newFieldKey}
                    onChange={(e) => setNewFieldKey(e.target.value)}
                  />
                  <Input
                    placeholder="Value"
                    className="h-8 text-sm"
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="h-8 px-3"
                    disabled={!newFieldKey.trim()}
                    onClick={handleAddCustomField}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Notes</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditing(!isEditing);
                  setEditNotes(contact.notes || '');
                }}
              >
                <Edit className="h-4 w-4 mr-1" />
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-3">
                  <textarea
                    className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Add notes about this contact..."
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleUpdateNotes}>
                      Save Notes
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {contact.notes || 'No notes yet. Click Edit to add notes.'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Message History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Recent Message History
              </CardTitle>
              <CardDescription>
                Latest messages exchanged with this contact
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(contact._count?.messages ?? 0) > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {/* Placeholder showing message count since messages API doesn't support contact-level fetch */}
                  <div className="text-center p-6 border rounded-lg bg-muted/50">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="font-medium">{contact._count?.messages ?? 0} messages total</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      View full conversation thread in the{' '}
                      <button
                        onClick={() => router.push('/inbox')}
                        className="text-primary underline hover:no-underline"
                      >
                        Inbox
                      </button>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Activity Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {contact._count?.messages || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Messages</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {contact._count?.conversations || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Conversations</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {contact.engagementScore}
                  </div>
                  <div className="text-sm text-muted-foreground">Engagement Score</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
