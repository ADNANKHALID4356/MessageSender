'use client';

import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WindowStatusIndicatorProps {
  lastMessageFromContactAt: string | null;
  className?: string;
  showLabel?: boolean;
}

/**
 * Displays the 24-hour messaging window status for a contact.
 * Green = within window, Red = window expired, Gray = never interacted.
 */
export function WindowStatusIndicator({
  lastMessageFromContactAt,
  className,
  showLabel = true,
}: WindowStatusIndicatorProps) {
  const getStatus = () => {
    if (!lastMessageFromContactAt) {
      return { status: 'never', label: 'No interaction', color: 'text-muted-foreground', bg: 'bg-muted', icon: Clock };
    }
    const lastMsg = new Date(lastMessageFromContactAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastMsg.getTime()) / (1000 * 60 * 60);

    if (hoursDiff <= 24) {
      const remaining = Math.ceil(24 - hoursDiff);
      return {
        status: 'open',
        label: `Window open (${remaining}h left)`,
        color: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-100 dark:bg-green-900/30',
        icon: CheckCircle2,
      };
    }

    return {
      status: 'expired',
      label: 'Window expired',
      color: 'text-destructive',
      bg: 'bg-destructive/10',
      icon: AlertTriangle,
    };
  };

  const { label, color, bg, icon: Icon } = getStatus();

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className={cn('p-1 rounded-full', bg)}>
        <Icon className={cn('h-3 w-3', color)} />
      </div>
      {showLabel && <span className={cn('text-xs font-medium', color)}>{label}</span>}
    </div>
  );
}
