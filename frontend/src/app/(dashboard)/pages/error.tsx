'use client';

import { ErrorFallback } from '@/components/ui/error-boundary';

export default function PagesError({
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
      title="Pages Error"
      description="Failed to load Facebook pages. Your page connections are intact — please try again."
    />
  );
}
