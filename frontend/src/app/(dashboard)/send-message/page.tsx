'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Send,
  Loader2,
  Search,
  Users,
  MessageSquare,
  FileCode,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Copy,
  Facebook,
  Globe,
  AlertCircle,
  Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, getInitials } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { usePages, useSendQuickMessage, useContacts } from '@/hooks';
import { useTemplates, useCannedResponses } from '@/hooks/use-templates';
import { WindowStatusIndicator } from '@/components/messaging/window-status-indicator';
import { BypassMethodSelector, type BypassMethod } from '@/components/messaging/bypass-method-selector';
import { SendMessageSkeleton } from '@/components/skeletons';
import { useToast } from '@/hooks/use-toast';
import type { Contact } from '@/services/contact.service';
import type { Page } from '@/services/page.service';

// Helper to extract text from template content (could be string or JSON)
function getContentText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object') {
    const obj = content as Record<string, unknown>;
    if (typeof obj.text === 'string') return obj.text;
    try {
      return JSON.stringify(content);
    } catch {
      return String(content);
    }
  }
  return '';
}

export default function SendMessagePage() {
  const { currentWorkspace } = useWorkspaceStore();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // State
  const [selectedPageId, setSelectedPageId] = useState<string>('all');
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [messageText, setMessageText] = useState('');
  const [bypassMethod, setBypassMethod] = useState<BypassMethod>('WITHIN_WINDOW');
  const [activeTab, setActiveTab] = useState<string>('compose');
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Pre-select contact from URL
  const preselectedContactId = searchParams.get('contactId');

  // Data fetching
  const workspaceId = currentWorkspace?.id || '';
  const { data: pages = [], isLoading: pagesLoading } = usePages(workspaceId);
  const { data: contactsData, isLoading: contactsLoading } = useContacts(workspaceId, {
    search: contactSearch || undefined,
    pageId: selectedPageId !== 'all' ? selectedPageId : undefined,
    limit: 50,
  });

  const { templates, isLoading: templatesLoading } = useTemplates();
  const { responses: cannedResponses, isLoading: cannedLoading } = useCannedResponses();
  const sendQuickMessage = useSendQuickMessage();

  const contacts: Contact[] = useMemo(() => contactsData?.data || [], [contactsData]);
  const activePages = useMemo(() => pages.filter((p: Page) => p.isActive), [pages]);

  // Auto-select contact from URL param
  useEffect(() => {
    if (preselectedContactId && contacts.length > 0 && selectedContacts.length === 0) {
      const found = contacts.find((c) => c.id === preselectedContactId);
      if (found) {
        setSelectedContacts([found]);
        if (found.pageId) setSelectedPageId(found.pageId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedContactId, contacts]);

  // Filter contacts based on selected page
  const filteredContacts = contacts;

  // Toggle contact selection
  const toggleContact = (contact: Contact) => {
    setSelectedContacts((prev) => {
      const exists = prev.find((c) => c.id === contact.id);
      if (exists) return prev.filter((c) => c.id !== contact.id);
      return [...prev, contact];
    });
  };

  const selectAllVisible = () => {
    setSelectedContacts((prev) => {
      const newSet = [...prev];
      for (const c of filteredContacts) {
        if (!newSet.find((s) => s.id === c.id)) newSet.push(c);
      }
      return newSet;
    });
  };

  const clearSelection = () => setSelectedContacts([]);

  // Apply a template
  const applyTemplate = (content: unknown) => {
    const text = getContentText(content);
    setMessageText(text);
    setActiveTab('compose');
    toast({ title: 'Template Applied', description: 'Template content loaded into composer.' });
  };

  // Apply a canned response
  const applyCanned = (content: string) => {
    setMessageText(content);
    setActiveTab('compose');
    toast({ title: 'Canned Response Applied', description: 'Response loaded into composer.' });
  };

  // Send message to all selected contacts
  const handleSendMessages = async () => {
    if (!messageText.trim() || selectedContacts.length === 0) return;

    const text = messageText.trim();
    let successCount = 0;
    let failCount = 0;

    for (const contact of selectedContacts) {
      setSendingTo(contact.id);
      try {
        await sendQuickMessage.mutateAsync({
          contactId: contact.id,
          text,
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    setSendingTo(null);

    if (successCount > 0) {
      toast({
        title: 'Messages Sent',
        description: `Successfully sent to ${successCount} contact${successCount > 1 ? 's' : ''}${failCount > 0 ? ` (${failCount} failed)` : ''}.`,
      });
      setMessageText('');
      setSelectedContacts([]);
    } else {
      toast({
        title: 'Sending Failed',
        description: `Failed to send messages. Please check contact status and try again.`,
        variant: 'destructive',
      });
    }
  };

  // Get window status for a contact
  const getWindowStatus = (contact: Contact) => {
    const lastInteraction = contact.lastInteractionAt;
    if (!lastInteraction) return 'expired';
    const hoursDiff = (Date.now() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24 ? 'open' : 'expired';
  };

  // Loading state
  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <Globe className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Please select a workspace first</p>
        </div>
      </div>
    );
  }

  if (pagesLoading || contactsLoading) {
    return <SendMessageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Send Message</h1>
          <p className="text-muted-foreground">
            Compose and send messages to your Facebook Page contacts
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedContacts.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''} selected
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Page selector + Contact list */}
        <div className="space-y-4">
          {/* Page Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Facebook className="h-4 w-4" />
                Select Page
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {activePages.length === 0 ? (
                <div className="text-center py-4 space-y-2">
                  <Facebook className="h-6 w-6 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No connected pages found.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/pages">Connect a Page</a>
                  </Button>
                </div>
              ) : (
                <Select value={selectedPageId} onValueChange={setSelectedPageId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Pages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pages ({contacts.length} contacts)</SelectItem>
                    {activePages.map((page: Page) => (
                      <SelectItem key={page.id} value={page.id}>
                        <span className="flex items-center gap-2">
                          {page.picture ? (
                            <img
                              src={page.picture}
                              alt=""
                              className="h-4 w-4 rounded-full inline-block"
                            />
                          ) : null}
                          {page.pageName}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {/* Contact List */}
          <Card className="flex flex-col max-h-[calc(100vh-20rem)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Contacts
                </CardTitle>
                <div className="flex items-center gap-2">
                  {filteredContacts.length > 0 && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={selectAllVisible}
                      >
                        Select All
                      </Button>
                      {selectedContacts.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-muted-foreground"
                          onClick={clearSelection}
                        >
                          Clear
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 flex-1 flex flex-col min-h-0">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 -mx-2 px-2">
                {filteredContacts.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <Users className="h-6 w-6 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {contactSearch ? 'No contacts match your search' : 'No contacts found'}
                    </p>
                  </div>
                ) : (
                  filteredContacts.map((contact) => {
                    const isSelected = selectedContacts.some((c) => c.id === contact.id);
                    const windowStatus = getWindowStatus(contact);

                    return (
                      <button
                        key={contact.id}
                        onClick={() => toggleContact(contact)}
                        className={cn(
                          'w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors',
                          isSelected
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-accent border border-transparent'
                        )}
                      >
                        {/* Avatar */}
                        <div className="relative">
                          {contact.profilePictureUrl ? (
                            <img
                              src={contact.profilePictureUrl}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                              {getInitials(contact.fullName || contact.firstName || '?')}
                            </div>
                          )}
                          {/* Window status dot */}
                          <div
                            className={cn(
                              'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
                              windowStatus === 'open'
                                ? 'bg-green-500'
                                : 'bg-gray-300'
                            )}
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {contact.engagementLevel?.toLowerCase() || 'new'}
                            {contact.isSubscribed && ' • subscribed'}
                          </p>
                        </div>

                        {/* Selection indicator */}
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column — Compose area + Templates */}
        <div className="lg:col-span-2 space-y-4">
          {/* Selected contacts summary */}
          {selectedContacts.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">
                  Sending to {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''}
                </h3>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearSelection}>
                  Clear All
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedContacts.slice(0, 10).map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => toggleContact(contact)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                  >
                    {contact.fullName || contact.firstName || 'Unknown'}
                    <span className="text-primary/60">×</span>
                  </button>
                ))}
                {selectedContacts.length > 10 && (
                  <span className="px-2.5 py-1 text-xs text-muted-foreground">
                    +{selectedContacts.length - 10} more
                  </span>
                )}
              </div>
            </Card>
          )}

          {/* Compose / Templates tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="compose" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Compose
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="canned" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Quick Replies
              </TabsTrigger>
            </TabsList>

            {/* Compose Tab */}
            <TabsContent value="compose" className="mt-4 space-y-4">
              <Card className="p-6">
                <div className="space-y-4">
                  {/* Bypass method */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">Messaging Method</label>
                    <BypassMethodSelector
                      value={bypassMethod}
                      onChange={setBypassMethod}
                      isWindowOpen={selectedContacts.some((c) => getWindowStatus(c) === 'open')}
                      compact
                    />
                  </div>

                  {/* Message textarea */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Message</label>
                    <textarea
                      ref={textareaRef}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type your message here... Use {{first_name}} for personalization."
                      className="w-full min-h-[160px] max-h-[400px] p-3 rounded-md border border-input bg-background text-sm 
                        placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring 
                        focus:ring-offset-2 resize-y"
                      rows={6}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-muted-foreground">
                        {messageText.length} characters
                        {messageText.includes('{{') && (
                          <span className="ml-2 text-blue-600">
                            • Contains personalization variables
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Send button */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {selectedContacts.length > 0 && (
                        <>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            {selectedContacts.filter((c) => getWindowStatus(c) === 'open').length} within window
                          </span>
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            {selectedContacts.filter((c) => getWindowStatus(c) === 'expired').length} window expired
                          </span>
                        </>
                      )}
                    </div>
                    <Button
                      size="lg"
                      onClick={handleSendMessages}
                      disabled={
                        !messageText.trim() ||
                        selectedContacts.length === 0 ||
                        sendQuickMessage.isPending
                      }
                    >
                      {sendQuickMessage.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending{sendingTo ? '...' : ''}
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send to {selectedContacts.length || 0} Contact{selectedContacts.length !== 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Window Status Info */}
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm space-y-1">
                    <p className="font-medium">Facebook 24-Hour Messaging Window</p>
                    <p className="text-muted-foreground">
                      You can send free-form messages to contacts within 24 hours of their last interaction.
                      After that, use approved Message Tags (Event Update, Post-Purchase, Account Update, Human Agent)
                      to reach them. The bypass method selector above lets you choose how to send outside the window.
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Message Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  {templatesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (templates as any[])?.length === 0 ? (
                    <div className="text-center py-8 space-y-2">
                      <FileCode className="h-6 w-6 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No templates yet.</p>
                      <Button variant="outline" size="sm" asChild>
                        <a href="/templates">Create Templates</a>
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {(templates as any[]).filter((t: any) => t.isActive !== false).map((template: any) => (
                        <div
                          key={template.id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0 mr-3">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{template.name}</p>
                              {template.category && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary flex-shrink-0">
                                  {template.category}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {getContentText(template.content)}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => applyTemplate(template.content)}
                          >
                            Use
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Canned Responses Tab */}
            <TabsContent value="canned" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Canned Responses (Quick Replies)</CardTitle>
                </CardHeader>
                <CardContent>
                  {cannedLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (cannedResponses as any[])?.length === 0 ? (
                    <div className="text-center py-8 space-y-2">
                      <Zap className="h-6 w-6 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No canned responses yet.</p>
                      <Button variant="outline" size="sm" asChild>
                        <a href="/templates">Create Responses</a>
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {(cannedResponses as any[]).map((cr: any) => (
                        <div
                          key={cr.id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0 mr-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-primary">/{cr.shortcut}</span>
                              <p className="text-sm font-medium truncate">{cr.title}</p>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{cr.content}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => applyCanned(cr.content)}
                          >
                            Use
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Recent Activity Summary */}
          {selectedContacts.length === 0 && (
            <Card className="p-6">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
                  <Send className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Send Messages to Your Contacts</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    Select a Facebook Page and choose one or more contacts from the list to compose and send messages.
                    You can also use templates and canned responses for quick messaging.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-4 pt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                    Within 24h Window
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                    Window Expired
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
