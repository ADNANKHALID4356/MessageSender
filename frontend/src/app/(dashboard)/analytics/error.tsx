'use client';

import { ErrorFallback } from '@/components/ui/error-boundary';

export default function AnalyticsError({
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
      title="Analytics Error"
      description="Failed to load analytics data. Please try again or check back later."
    />
  );
}
