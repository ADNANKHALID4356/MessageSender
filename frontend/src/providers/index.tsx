'use client';

import { ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';
import { WorkspaceProvider } from './workspace-provider';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/ui/error-boundary';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <QueryProvider>
          <WorkspaceProvider>
            {children}
            <Toaster />
          </WorkspaceProvider>
        </QueryProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

// Export individual providers
export { QueryProvider } from './query-provider';
export { ThemeProvider } from './theme-provider';
export { WorkspaceProvider } from './workspace-provider';
