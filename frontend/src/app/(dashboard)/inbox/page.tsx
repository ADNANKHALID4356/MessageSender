'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search,
  MoreVertical,
  Star,
  Archive,
  Trash2,
  Clock,
  Check,
  CheckCheck,
  Send,
  Loader2,
  AlertCircle,
  RefreshCw,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { cn, formatTimeAgo, getInitials } from '@/lib/utils';
import { InboxSkeleton } from '@/components/skeletons';
import { useWorkspaceStore } from '@/stores';
import { WindowStatusIndicator } from '@/components/messaging/window-status-indicator';
import { BypassMethodSelector, type BypassMethod } from '@/components/messaging/bypass-method-selector';
import {
  useConversations,
  useConversation,
  useMessages,
  useUpdateConversation,
  useMarkAsRead,
  useSendMessage,
} from '@/hooks';
import { useCannedResponses } from '@/hooks/use-templates';
import type { Conversation, Message, ConversationStatus } from '@/services/conversation.service';

export default function InboxPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | ConversationStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [bypassMethod, setBypassMethod] = useState<BypassMethod>('WITHIN_WINDOW');
  const [showCannedPicker, setShowCannedPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const {
    data: conversationsData,
    isLoading: conversationsLoading,
    isError: conversationsError,
    refetch: refetchConversations,
  } = useConversations({
    status: filter !== 'all' && filter !== 'unread' ? filter : undefined,
    unreadOnly: filter === 'unread' ? true : undefined,
    search: searchQuery || undefined,
    sortBy: 'lastMessageAt',
    sortOrder: 'desc',
  });

  // Fetch selected conversation details
  const {
    data: selectedConversation,
    isLoading: conversationLoading,
  } = useConversation(selectedConversationId);

  // Fetch messages for selected conversation
  const {
    data: messagesData,
    isLoading: messagesLoading,
  } = useMessages(selectedConversationId);

  // Mutations
  const updateConversation = useUpdateConversation();
  const markAsRead = useMarkAsRead();
  const sendMessage = useSendMessage();

  // Canned responses
  const { responses: cannedResponsesList } = useCannedResponses();
  const cannedResponses = (cannedResponsesList as any[]) || [];

  const conversations = conversationsData?.data || [];
  const messages = messagesData?.data || [];

  // Auto-select first conversation on load
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  // Mark conversation as read when selected
  useEffect(() => {
    if (selectedConversationId && selectedConversation?.unreadCount && selectedConversation.unreadCount > 0) {
      markAsRead.mutate(selectedConversationId);
    }
  }, [selectedConversationId, selectedConversation?.unreadCount]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversationId) return;

    sendMessage.mutate(
      {
        conversationId: selectedConversationId,
        messageType: 'TEXT',
        content: { text: messageInput.trim() },
      },
      {
        onSuccess: () => {
          setMessageInput('');
        },
      }
    );
  };

  const handleUpdateStatus = (status: ConversationStatus) => {
    if (!selectedConversationId) return;
    updateConversation.mutate({
      conversationId: selectedConversationId,
      data: { status },
    });
  };

  // Get contact display name
  const getContactName = (conversation: Conversation) => {
    const { contact } = conversation;
    if (contact.fullName) return contact.fullName;
    if (contact.firstName || contact.lastName) {
      return `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
    }
    return 'Unknown Contact';
  };

  // Check workspace
  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No Workspace Selected</h2>
          <p className="text-muted-foreground">
            Please select a workspace to view conversations.
          </p>
        </div>
      </div>
    );
  }

  // Loading state for conversations list
  if (conversationsLoading) {
    return <InboxSkeleton />;
  }

  // Error state
  if (conversationsError) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Failed to Load Inbox</h2>
          <Button onClick={() => refetchConversations()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Conversation List */}
      <Card className="w-80 flex flex-col">
        {/* Search & Filter */}
        <div className="p-4 border-b space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filter === 'all' ? 'secondary' : 'ghost'}
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filter === 'unread' ? 'secondary' : 'ghost'}
              onClick={() => setFilter('unread')}
            >
              Unread
            </Button>
            <Button
              size="sm"
              variant={filter === 'OPEN' ? 'secondary' : 'ghost'}
              onClick={() => setFilter('OPEN')}
            >
              Open
            </Button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No conversations</p>
              <p className="text-sm">Conversations will appear here</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={cn(
                  'flex items-start gap-3 p-4 cursor-pointer border-b hover:bg-accent transition-colors',
                  selectedConversationId === conv.id && 'bg-accent'
                )}
              >
                {/* Avatar */}
                <div className="relative">
                  {conv.contact.profilePictureUrl ? (
                    <img
                      src={conv.contact.profilePictureUrl}
                      alt={getContactName(conv)}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                      {getInitials(getContactName(conv))}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{getContactName(conv)}</span>
                    <span className="text-xs text-muted-foreground">
                      {conv.lastMessageAt ? formatTimeAgo(new Date(conv.lastMessageAt)) : ''}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conv.lastMessagePreview || 'No messages yet'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {conv.status === 'RESOLVED' && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Resolved
                      </span>
                    )}
                    {conv.status === 'PENDING' && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Unread Badge */}
                {conv.unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        {selectedConversationId && selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                {selectedConversation.contact.profilePictureUrl ? (
                  <img
                    src={selectedConversation.contact.profilePictureUrl}
                    alt={getContactName(selectedConversation)}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                    {getInitials(getContactName(selectedConversation))}
                  </div>
                )}
                <div>
                  <h3 className="font-medium">{getContactName(selectedConversation)}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    via {selectedConversation.page?.name || 'Unknown Page'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleUpdateStatus('OPEN')}>
                      <Clock className="h-4 w-4 mr-2" />
                      Mark as Open
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateStatus('PENDING')}>
                      <Clock className="h-4 w-4 mr-2" />
                      Mark as Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateStatus('RESOLVED')}>
                      <Check className="h-4 w-4 mr-2" />
                      Mark as Resolved
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Spinner size="md" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      message.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[70%] px-4 py-2 rounded-lg',
                        message.direction === 'OUTBOUND'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <p className="text-sm">{message.content.text || '[Attachment]'}</p>
                      <div className={cn(
                        'flex items-center gap-1 mt-1',
                        message.direction === 'OUTBOUND' ? 'justify-end' : ''
                      )}>
                        <span className="text-xs opacity-70">
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {message.direction === 'OUTBOUND' && (
                          <>
                            {message.status === 'READ' && (
                              <CheckCheck className="h-3 w-3 opacity-70" />
                            )}
                            {message.status === 'DELIVERED' && (
                              <CheckCheck className="h-3 w-3 opacity-50" />
                            )}
                            {message.status === 'SENT' && (
                              <Check className="h-3 w-3 opacity-50" />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t space-y-2">
              {selectedConversation?.contact && (
                <div className="flex items-center justify-between">
                  <WindowStatusIndicator
                    lastMessageFromContactAt={selectedConversation.contact.lastMessageFromContactAt || null}
                  />
                  <BypassMethodSelector
                    value={bypassMethod}
                    onChange={setBypassMethod}
                    isWindowOpen={
                      selectedConversation.contact.lastMessageFromContactAt
                        ? (new Date().getTime() - new Date(selectedConversation.contact.lastMessageFromContactAt).getTime()) / (1000 * 60 * 60) <= 24
                        : false
                    }
                    compact
                  />
                </div>
              )}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  {/* Canned responses picker */}
                  {showCannedPicker && cannedResponses.length > 0 && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                      <div className="p-2 border-b">
                        <p className="text-xs font-medium text-muted-foreground">Canned Responses</p>
                      </div>
                      {cannedResponses
                        .filter((cr: any) =>
                          messageInput.length > 1
                            ? cr.shortcut?.toLowerCase().includes(messageInput.slice(1).toLowerCase()) ||
                              cr.title?.toLowerCase().includes(messageInput.slice(1).toLowerCase())
                            : true,
                        )
                        .map((cr: any) => (
                          <button
                            key={cr.id}
                            className="w-full text-left px-3 py-2 hover:bg-accent transition-colors text-sm"
                            onClick={() => {
                              setMessageInput(cr.content || cr.title || '');
                              setShowCannedPicker(false);
                            }}
                          >
                            <span className="font-medium text-primary">/{cr.shortcut}</span>
                            <span className="ml-2 text-muted-foreground">{cr.title}</span>
                          </button>
                        ))}
                      {cannedResponses.filter((cr: any) =>
                        messageInput.length > 1
                          ? cr.shortcut?.toLowerCase().includes(messageInput.slice(1).toLowerCase())
                          : true,
                      ).length === 0 && (
                        <p className="px-3 py-2 text-sm text-muted-foreground">No matching responses</p>
                      )}
                    </div>
                  )}
                  <Input
                    placeholder="Type a message... (/ for canned responses)"
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      setShowCannedPicker(e.target.value.startsWith('/'));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (showCannedPicker) {
                          setShowCannedPicker(false);
                        } else {
                          handleSendMessage();
                        }
                      }
                      if (e.key === 'Escape') {
                        setShowCannedPicker(false);
                      }
                    }}
                    onBlur={() => setTimeout(() => setShowCannedPicker(false), 200)}
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendMessage.isPending}
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to start messaging
          </div>
        )}
      </Card>

      {/* Contact Details Sidebar */}
      <Card className="w-72 hidden xl:flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Contact Details</h3>
        </div>
        {selectedConversation ? (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-center mb-6">
              {selectedConversation.contact.profilePictureUrl ? (
                <img
                  src={selectedConversation.contact.profilePictureUrl}
                  alt={getContactName(selectedConversation)}
                  className="h-16 w-16 mx-auto rounded-full object-cover mb-2"
                />
              ) : (
                <div className="h-16 w-16 mx-auto rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-medium mb-2">
                  {getInitials(getContactName(selectedConversation))}
                </div>
              )}
              <h4 className="font-medium">{getContactName(selectedConversation)}</h4>
              <p className="text-sm text-muted-foreground">
                Contact since {new Date(selectedConversation.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <span className="text-muted-foreground">Status</span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium capitalize',
                      selectedConversation.status === 'OPEN'
                        ? 'bg-blue-100 text-blue-700'
                        : selectedConversation.status === 'RESOLVED'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    )}
                  >
                    {selectedConversation.status.toLowerCase()}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Engagement</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded text-xs font-medium capitalize bg-primary/10 text-primary">
                    {selectedConversation.contact.engagementLevel?.toLowerCase() || 'Unknown'}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Page</span>
                <p className="mt-1">{selectedConversation.page?.name || 'Unknown'}</p>
              </div>
              {selectedConversation.assignedTo && (
                <div>
                  <span className="text-muted-foreground">Assigned To</span>
                  <p className="mt-1">
                    {selectedConversation.assignedTo.firstName} {selectedConversation.assignedTo.lastName}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
            <p className="text-center text-sm">Select a conversation to view contact details</p>
          </div>
        )}
      </Card>
    </div>
  );
}
