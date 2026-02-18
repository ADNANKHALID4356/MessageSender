'use client';

import { ErrorFallback } from '@/components/ui/error-boundary';

export default function CampaignsError({
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
      title="Campaigns Error"
      description="Failed to load campaigns. No campaigns were affected — please try again."
    />
  );
}
