'use client';

import { Shield, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BypassMethod =
  | 'WITHIN_WINDOW'
  | 'MESSAGE_TAG_CONFIRMED_EVENT'
  | 'MESSAGE_TAG_POST_PURCHASE'
  | 'MESSAGE_TAG_ACCOUNT_UPDATE'
  | 'MESSAGE_TAG_HUMAN_AGENT'
  | 'OTN_TOKEN'
  | 'RECURRING_NOTIFICATION';

interface BypassOption {
  value: BypassMethod;
  label: string;
  shortLabel: string;
  description: string;
  warning?: string;
}

const BYPASS_OPTIONS: BypassOption[] = [
  { value: 'WITHIN_WINDOW', label: 'Within 24-Hour Window', shortLabel: 'Standard', description: 'Send normally within window' },
  { value: 'MESSAGE_TAG_CONFIRMED_EVENT', label: 'Confirmed Event Update', shortLabel: 'Event', description: 'Event reminders', warning: 'Events only' },
  { value: 'MESSAGE_TAG_POST_PURCHASE', label: 'Post-Purchase Update', shortLabel: 'Purchase', description: 'Order updates', warning: 'Orders only' },
  { value: 'MESSAGE_TAG_ACCOUNT_UPDATE', label: 'Account Update', shortLabel: 'Account', description: 'Account alerts', warning: 'Alerts only' },
  { value: 'MESSAGE_TAG_HUMAN_AGENT', label: 'Human Agent', shortLabel: 'Agent', description: 'Support response (7-day)', warning: '7-day limit' },
  { value: 'OTN_TOKEN', label: 'One-Time Notification', shortLabel: 'OTN', description: 'Uses an OTN token' },
  { value: 'RECURRING_NOTIFICATION', label: 'Recurring Notification', shortLabel: 'Recurring', description: 'Recurring subscription' },
];

interface BypassMethodSelectorProps {
  value?: BypassMethod;
  onChange: (method: BypassMethod) => void;
  isWindowOpen?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * A selector component for choosing the 24h window bypass method.
 * Shows as a compact dropdown for inline use, or as a list for full mode.
 */
export function BypassMethodSelector({
  value,
  onChange,
  isWindowOpen = true,
  compact = false,
  className,
}: BypassMethodSelectorProps) {
  if (compact) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <Shield className="h-3.5 w-3.5 text-muted-foreground" />
        <select
          value={value || 'WITHIN_WINDOW'}
          onChange={(e) => onChange(e.target.value as BypassMethod)}
          className="h-7 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {BYPASS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.shortLabel}
              {opt.value === 'WITHIN_WINDOW' && isWindowOpen ? ' ✓' : ''}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Bypass Method</span>
      </div>
      <div className="space-y-1.5">
        {BYPASS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'w-full flex items-start gap-3 p-2.5 rounded-lg border text-left transition-colors text-sm',
              value === opt.value ? 'border-primary bg-primary/5' : 'hover:border-primary/50',
            )}
          >
            <div className={cn(
              'mt-1 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0',
              value === opt.value ? 'border-primary' : 'border-gray-300',
            )}>
              {value === opt.value && <div className="h-2 w-2 rounded-full bg-primary" />}
            </div>
            <div>
              <p className="font-medium">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.description}</p>
              {opt.warning && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                  <AlertCircle className="h-3 w-3" />
                  {opt.warning}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
