'use client';

import React, { useState } from 'react';
import {
  useOtnTokens,
  useOtnTokenCount,
  useRequestOtn,
  useUseOtnToken,
  useRecurringSubscriptions,
  useRequestRecurringSubscription,
  useSendRecurringMessage,
} from '@/hooks/use-bypass';

// ===========================================
// Bypass Method Manager Component
// Manages OTN tokens and Recurring Subscriptions for a contact
// ===========================================

interface BypassManagerProps {
  contactId: string;
  pageId: string;
}

export function BypassManager({ contactId, pageId }: BypassManagerProps) {
  const [activeTab, setActiveTab] = useState<'otn' | 'recurring'>('otn');

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      {/* Tab header */}
      <div className="flex border-b">
        <button
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === 'otn'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('otn')}
        >
          OTN Tokens
        </button>
        <button
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === 'recurring'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('recurring')}
        >
          Recurring Notifications
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'otn' ? (
          <OtnManager contactId={contactId} pageId={pageId} />
        ) : (
          <RecurringManager contactId={contactId} pageId={pageId} />
        )}
      </div>
    </div>
  );
}

// ===========================================
// OTN Manager Sub-component
// ===========================================

function OtnManager({ contactId, pageId }: { contactId: string; pageId: string }) {
  const { data: tokens, isLoading } = useOtnTokens(contactId, pageId);
  const { data: tokenCount } = useOtnTokenCount(contactId, pageId);
  const requestOtn = useRequestOtn();
  const useToken = useUseOtnToken();

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestTitle, setRequestTitle] = useState('');
  const [requestPayload, setRequestPayload] = useState('');

  const [showUseForm, setShowUseForm] = useState<string | null>(null);
  const [useMessage, setUseMessage] = useState('');

  const handleRequestOtn = () => {
    if (!requestTitle.trim()) return;
    requestOtn.mutate(
      { contactId, pageId, title: requestTitle, payload: requestPayload || undefined },
      {
        onSuccess: () => {
          setShowRequestForm(false);
          setRequestTitle('');
          setRequestPayload('');
        },
      },
    );
  };

  const handleUseToken = (tokenId: string) => {
    if (!useMessage.trim()) return;
    useToken.mutate(
      {
        otnTokenId: tokenId,
        contactId,
        pageId,
        messageContent: { text: useMessage },
      },
      {
        onSuccess: () => {
          setShowUseForm(null);
          setUseMessage('');
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">
            One-Time Notification Tokens
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Available tokens: {tokenCount ?? 0}
          </p>
        </div>
        <button
          onClick={() => setShowRequestForm(true)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Request OTN
        </button>
      </div>

      {/* Request form */}
      {showRequestForm && (
        <div className="bg-gray-50 p-3 rounded-lg space-y-3 border">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Title (max 65 chars)
            </label>
            <input
              type="text"
              value={requestTitle}
              onChange={e => setRequestTitle(e.target.value.slice(0, 65))}
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="Would you like to receive updates?"
            />
            <div className="text-xs text-gray-400 mt-1">{requestTitle.length}/65</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Payload (optional)
            </label>
            <input
              type="text"
              value={requestPayload}
              onChange={e => setRequestPayload(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="e.g., promo_campaign_2025"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRequestOtn}
              disabled={requestOtn.isPending || !requestTitle.trim()}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {requestOtn.isPending ? 'Sending...' : 'Send Request'}
            </button>
            <button
              onClick={() => setShowRequestForm(false)}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
          {requestOtn.isError && (
            <p className="text-xs text-red-600">Failed to send request</p>
          )}
        </div>
      )}

      {/* Token list */}
      {isLoading ? (
        <div className="text-center py-4 text-sm text-gray-500">Loading tokens...</div>
      ) : !tokens || tokens.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-500">
          No available OTN tokens. Request one to start.
        </div>
      ) : (
        <div className="space-y-2">
          {tokens.map(token => (
            <div key={token.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium text-sm">{token.title}</span>
                  <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    Available
                  </span>
                </div>
                <button
                  onClick={() => setShowUseForm(token.id)}
                  className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Use Token
                </button>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <div>Opted in: {token.optedInAt ? new Date(token.optedInAt).toLocaleString() : 'Pending'}</div>
                {token.expiresAt && (
                  <div>Expires: {new Date(token.expiresAt).toLocaleString()}</div>
                )}
              </div>

              {/* Use token form */}
              {showUseForm === token.id && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <textarea
                    value={useMessage}
                    onChange={e => setUseMessage(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    rows={2}
                    placeholder="Type your message..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUseToken(token.id)}
                      disabled={useToken.isPending || !useMessage.trim()}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {useToken.isPending ? 'Sending...' : 'Send Message'}
                    </button>
                    <button
                      onClick={() => setShowUseForm(null)}
                      className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================
// Recurring Manager Sub-component
// ===========================================

function RecurringManager({ contactId, pageId }: { contactId: string; pageId: string }) {
  const { data: subscriptions, isLoading } = useRecurringSubscriptions(contactId, pageId);
  const requestSub = useRequestRecurringSubscription();
  const sendMsg = useSendRecurringMessage();

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [subTitle, setSubTitle] = useState('');
  const [subFrequency, setSubFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [subTopic, setSubTopic] = useState('');

  const [sendingSubId, setSendingSubId] = useState<string | null>(null);
  const [sendMessage, setSendMessage] = useState('');

  const handleRequestSubscription = () => {
    if (!subTitle.trim()) return;
    requestSub.mutate(
      { contactId, pageId, title: subTitle, frequency: subFrequency, topic: subTopic || undefined },
      {
        onSuccess: () => {
          setShowRequestForm(false);
          setSubTitle('');
          setSubTopic('');
        },
      },
    );
  };

  const handleSendRecurring = (subscriptionId: string) => {
    if (!sendMessage.trim()) return;
    sendMsg.mutate(
      {
        subscriptionId,
        contactId,
        pageId,
        messageContent: { text: sendMessage },
      },
      {
        onSuccess: () => {
          setSendingSubId(null);
          setSendMessage('');
        },
      },
    );
  };

  const STATUS_BADGE: Record<string, string> = {
    ACTIVE: 'bg-green-50 text-green-700',
    PENDING: 'bg-yellow-50 text-yellow-700',
    CANCELLED: 'bg-red-50 text-red-700',
    EXPIRED: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">
            Recurring Notification Subscriptions
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Total subscriptions: {subscriptions?.length ?? 0}
          </p>
        </div>
        <button
          onClick={() => setShowRequestForm(true)}
          className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          New Subscription
        </button>
      </div>

      {/* Request form */}
      {showRequestForm && (
        <div className="bg-gray-50 p-3 rounded-lg space-y-3 border">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={subTitle}
              onChange={e => setSubTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="Weekly Updates"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Frequency</label>
              <select
                value={subFrequency}
                onChange={e => setSubFrequency(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Topic</label>
              <input
                type="text"
                value={subTopic}
                onChange={e => setSubTopic(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
                placeholder="news"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRequestSubscription}
              disabled={requestSub.isPending || !subTitle.trim()}
              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {requestSub.isPending ? 'Sending...' : 'Request Subscription'}
            </button>
            <button
              onClick={() => setShowRequestForm(false)}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Subscription list */}
      {isLoading ? (
        <div className="text-center py-4 text-sm text-gray-500">Loading...</div>
      ) : !subscriptions || subscriptions.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-500">
          No recurring subscriptions. Create one to start.
        </div>
      ) : (
        <div className="space-y-2">
          {subscriptions.map(sub => (
            <div key={sub.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{sub.title || sub.topic}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[sub.status] || 'bg-gray-100'}`}>
                    {sub.status}
                  </span>
                  <span className="text-xs text-gray-400">{sub.frequency}</span>
                </div>
                {sub.status === 'ACTIVE' && (
                  <button
                    onClick={() => setSendingSubId(sub.id)}
                    className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    Send Message
                  </button>
                )}
              </div>
              <div className="text-xs text-gray-500 grid grid-cols-2 gap-1">
                <div>Messages sent: {sub.messagesSent}</div>
                <div>Last sent: {sub.lastSentAt ? new Date(sub.lastSentAt).toLocaleDateString() : 'Never'}</div>
                <div>Next allowed: {sub.nextAllowedAt ? new Date(sub.nextAllowedAt).toLocaleString() : 'Now'}</div>
                <div>Opted in: {sub.optedInAt ? new Date(sub.optedInAt).toLocaleDateString() : 'Pending'}</div>
              </div>

              {/* Send form */}
              {sendingSubId === sub.id && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <textarea
                    value={sendMessage}
                    onChange={e => setSendMessage(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    rows={2}
                    placeholder="Type your recurring message..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSendRecurring(sub.id)}
                      disabled={sendMsg.isPending || !sendMessage.trim()}
                      className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                    >
                      {sendMsg.isPending ? 'Sending...' : 'Send'}
                    </button>
                    <button
                      onClick={() => setSendingSubId(null)}
                      className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
