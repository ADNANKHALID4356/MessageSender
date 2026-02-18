'use client';

import { ErrorFallback } from '@/components/ui/error-boundary';

export default function InboxError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Inbox Error"
      description="Failed to load conversations. Your messages are safe — please try again."
    />
  );
}
