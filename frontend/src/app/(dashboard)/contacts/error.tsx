'use client';

import { ErrorFallback } from '@/components/ui/error-boundary';

export default function ContactsError({
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
      title="Contacts Error"
      description="Failed to load contacts. Your contact data is safe — please try again."
    />
  );
}
