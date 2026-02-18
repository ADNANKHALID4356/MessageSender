'use client';

import { ErrorFallback } from '@/components/ui/error-boundary';

// ===========================================
// Dashboard Error Boundary (Next.js App Router)
// ===========================================
// Catches errors in any dashboard route. Falls back to a user-friendly
// error UI that allows retry or navigation home.
// ===========================================

export default function DashboardError({
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
      title="Dashboard Error"
      description="Something went wrong while loading this page. Please try again or navigate to a different section."
    />
  );
}
