'use client';

import React, { useState } from 'react';
import {
  useSponsoredCampaigns,
  useCreateSponsoredCampaign,
  useSubmitSponsoredCampaign,
  usePauseSponsoredCampaign,
  useDeleteSponsoredCampaign,
} from '@/hooks/use-sponsored';
import type { SponsoredCampaign } from '@/services/sponsored.service';

// ===========================================
// Sponsored Messages Manager
// ===========================================

export function SponsoredMessagesManager({ pageId }: { pageId: string }) {
  const { data: campaigns, isLoading } = useSponsoredCampaigns();
  const createMutation = useCreateSponsoredCampaign();
  const submitMutation = useSubmitSponsoredCampaign();
  const pauseMutation = usePauseSponsoredCampaign();
  const deleteMutation = useDeleteSponsoredCampaign();

  const [showCreate, setShowCreate] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [dailyBudget, setDailyBudget] = useState('5.00');
  const [durationDays, setDurationDays] = useState('7');

  const handleCreate = async () => {
    if (!messageText.trim()) return;
    await createMutation.mutateAsync({
      pageId,
      messageText: messageText.trim(),
      dailyBudgetCents: Math.round(parseFloat(dailyBudget) * 100),
      durationDays: parseInt(durationDays),
    });
    setMessageText('');
    setShowCreate(false);
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    pending_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    paused: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Sponsored Messages</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Reach contacts outside the 24-hour window via paid messages
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showCreate ? 'Cancel' : 'New Campaign'}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-lg border bg-white p-4 space-y-3 dark:bg-gray-900 dark:border-gray-700">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Message Text
            </label>
            <textarea
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              placeholder="Enter your sponsored message..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Daily Budget ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={dailyBudget}
                onChange={e => setDailyBudget(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Duration (days)
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={durationDays}
                onChange={e => setDurationDays(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Total budget: ${(parseFloat(dailyBudget || '0') * parseInt(durationDays || '0')).toFixed(2)}
            </p>
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending || !messageText.trim()}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </div>
      )}

      {/* Campaign List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : !campaigns?.length ? (
        <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
          No sponsored campaigns yet
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign: SponsoredCampaign) => (
            <div
              key={campaign.id}
              className="rounded-lg border bg-white p-4 dark:bg-gray-900 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[campaign.status] || statusColors.draft}`}>
                    {campaign.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {campaign.id.slice(0, 12)}...
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(campaign.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Budget</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    ${(campaign.budgetCents / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{campaign.durationDays} days</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Est. Reach</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{campaign.estimatedReach.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {campaign.status === 'draft' && (
                  <>
                    <button
                      onClick={() => submitMutation.mutate(campaign.id)}
                      disabled={submitMutation.isPending}
                      className="rounded px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300"
                    >
                      Submit for Review
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(campaign.id)}
                      disabled={deleteMutation.isPending}
                      className="rounded px-2 py-1 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300"
                    >
                      Delete
                    </button>
                  </>
                )}
                {campaign.status === 'active' && (
                  <button
                    onClick={() => pauseMutation.mutate(campaign.id)}
                    disabled={pauseMutation.isPending}
                    className="rounded px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300"
                  >
                    Pause
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
