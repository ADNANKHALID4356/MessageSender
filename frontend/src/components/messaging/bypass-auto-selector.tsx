'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api-client';

// ===========================================
// Types
// ===========================================

interface ComplianceResult {
  allowed: boolean;
  withinWindow: boolean;
  windowExpiresAt: string | null;
  hoursRemaining: number | null;
  recommendedMethod: string | null;
  tagCompliance: {
    allowed: boolean;
    reason?: string;
    usageCount?: number;
    maxAllowed?: number;
    cooldownRemaining?: number;
  } | null;
  frequencyCheck: { allowed: boolean; reason?: string };
  warnings: string[];
}

const BYPASS_METHODS = [
  { value: 'WITHIN_WINDOW', label: '24-Hour Window', description: 'Message within the standard 24-hour reply window', color: 'green' },
  { value: 'OTN_TOKEN', label: 'One-Time Notification', description: 'Use a pre-approved OTN token', color: 'blue' },
  { value: 'RECURRING_NOTIFICATION', label: 'Recurring Notification', description: 'Use an active recurring subscription', color: 'purple' },
  { value: 'MESSAGE_TAG_CONFIRMED_EVENT_UPDATE', label: 'Event Update Tag', description: 'Send confirmed event updates', color: 'orange' },
  { value: 'MESSAGE_TAG_POST_PURCHASE_UPDATE', label: 'Post Purchase Tag', description: 'Send post-purchase updates', color: 'orange' },
  { value: 'MESSAGE_TAG_ACCOUNT_UPDATE', label: 'Account Update Tag', description: 'Send account-related updates', color: 'orange' },
  { value: 'MESSAGE_TAG_HUMAN_AGENT', label: 'Human Agent Tag', description: 'Human agent follow-up (7-day window)', color: 'yellow' },
  { value: 'SPONSORED_MESSAGE', label: 'Sponsored Message', description: 'Paid message via Facebook Ads', color: 'gray' },
];

// ===========================================
// Bypass Auto-Selection Component
// ===========================================

export function BypassAutoSelector({
  contactId,
  pageId,
}: {
  contactId: string;
  pageId: string;
}) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const complianceCheck = useMutation({
    mutationFn: (params: { contactId: string; pageId: string; bypassMethod?: string; messageTag?: string }) =>
      api.post<ComplianceResult>('/messages/compliance/check', params),
  });

  const handleCheck = async (method?: string) => {
    const params: any = { contactId, pageId };
    if (method) {
      params.bypassMethod = method;
      if (method.startsWith('MESSAGE_TAG_')) {
        params.messageTag = method.replace('MESSAGE_TAG_', '');
      }
    }
    complianceCheck.mutate(params);
  };

  // Auto-check on mount-like behavior
  React.useEffect(() => {
    if (contactId && pageId) {
      handleCheck();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, pageId]);

  const result = complianceCheck.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Message Delivery Method</h3>
        <button
          onClick={() => handleCheck()}
          disabled={complianceCheck.isPending}
          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          {complianceCheck.isPending ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      {/* Status Summary */}
      {result && (
        <div className={`rounded-lg border p-3 ${result.withinWindow ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800' : 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800'}`}>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${result.withinWindow ? 'bg-green-400' : 'bg-yellow-400'}`} />
            <span className="text-sm font-medium">
              {result.withinWindow
                ? `Within 24-hour window (${result.hoursRemaining?.toFixed(1)}h remaining)`
                : 'Outside 24-hour window — bypass method required'}
            </span>
          </div>
          {result.recommendedMethod && !result.withinWindow && (
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Recommended: <span className="font-medium">{BYPASS_METHODS.find(m => m.value === result.recommendedMethod)?.label || result.recommendedMethod}</span>
            </p>
          )}
        </div>
      )}

      {/* Warnings */}
      {result?.warnings && result.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:bg-amber-900/20 dark:border-amber-800">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">Warnings:</p>
          <ul className="space-y-1">
            {result.warnings.map((w: string, i: number) => (
              <li key={i} className="text-xs text-amber-700 dark:text-amber-300">- {w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Method Selection */}
      <div className="space-y-2">
        {BYPASS_METHODS.map(method => {
          const isSelected = selectedMethod === method.value;
          const isRecommended = result?.recommendedMethod === method.value;
          const isWindowMethod = method.value === 'WITHIN_WINDOW';
          const isDisabled = isWindowMethod && !result?.withinWindow;

          return (
            <button
              key={method.value}
              onClick={() => {
                setSelectedMethod(method.value);
                handleCheck(method.value);
              }}
              disabled={isDisabled}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                  : isRecommended
                    ? 'border-green-300 bg-green-50/50 dark:bg-green-900/10 dark:border-green-700'
                    : 'border-gray-200 bg-white hover:border-gray-300 dark:bg-gray-900 dark:border-gray-700 dark:hover:border-gray-600'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full border-2 ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                    {isSelected && <span className="block h-full w-full rounded-full bg-white scale-50" />}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{method.label}</span>
                  {isRecommended && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                      Recommended
                    </span>
                  )}
                </div>
                {isDisabled && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">Unavailable</span>
                )}
              </div>
              <p className="mt-1 ml-5 text-xs text-gray-500 dark:text-gray-400">
                {method.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Tag Compliance Result */}
      {result?.tagCompliance && selectedMethod?.startsWith('MESSAGE_TAG_') && (
        <div className={`rounded-lg border p-3 ${result.tagCompliance.allowed ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:bg-red-900/20'}`}>
          <p className="text-xs font-medium">
            {result.tagCompliance.allowed ? 'Tag usage allowed' : 'Tag usage restricted'}
          </p>
          {result.tagCompliance.reason && (
            <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">{result.tagCompliance.reason}</p>
          )}
          {result.tagCompliance.usageCount !== undefined && (
            <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
              Usage: {result.tagCompliance.usageCount} / {result.tagCompliance.maxAllowed} (30-day limit)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
