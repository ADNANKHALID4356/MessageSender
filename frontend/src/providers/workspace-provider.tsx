'use client';

import { useEffect } from 'react';
import { useWorkspaces } from '@/hooks/use-workspace';
import { useWorkspaceStore, WorkspaceInfo } from '@/stores/workspace-store';
import { useAuthStore } from '@/stores/auth-store';
import { setWorkspaceIdResolver } from '@/lib/api-client';

// Register workspace resolver once at module load so every API request
// automatically includes the X-Workspace-Id header.
setWorkspaceIdResolver(() => useWorkspaceStore.getState().currentWorkspace?.id ?? null);

interface WorkspaceProviderProps {
  children: React.ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const { isAuthenticated, user } = useAuthStore();
  const { setWorkspaces, setCurrentWorkspace, currentWorkspace, setLoading } = useWorkspaceStore();
  
  const { data, isLoading, isSuccess } = useWorkspaces(
    { limit: 10 },
    { enabled: isAuthenticated }
  );

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  useEffect(() => {
    if (isSuccess && data?.data) {
      const workspaces: WorkspaceInfo[] = data.data.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        isActive: w.status === 'active',
      }));
      
      setWorkspaces(workspaces);
      
      // Auto-select first workspace if none selected
      if (!currentWorkspace && workspaces.length > 0) {
        setCurrentWorkspace(workspaces[0]);
      }
    }
  }, [isSuccess, data, currentWorkspace, setWorkspaces, setCurrentWorkspace]);

  // Reset workspace when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
    }
  }, [isAuthenticated, setWorkspaces, setCurrentWorkspace]);

  return <>{children}</>;
}

export default WorkspaceProvider;
