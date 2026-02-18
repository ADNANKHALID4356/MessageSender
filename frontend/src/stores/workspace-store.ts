import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface WorkspaceInfo {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  colorTheme?: string;
  isActive: boolean;
}

export interface WorkspaceState {
  // State
  currentWorkspace: WorkspaceInfo | null;
  workspaces: WorkspaceInfo[];
  isLoading: boolean;
  
  // Actions
  setCurrentWorkspace: (workspace: WorkspaceInfo | null) => void;
  setWorkspaces: (workspaces: WorkspaceInfo[]) => void;
  setLoading: (loading: boolean) => void;
  selectWorkspaceById: (id: string) => void;
  clearWorkspace: () => void;
  reset: () => void;
}

const initialState = {
  currentWorkspace: null,
  workspaces: [],
  isLoading: false,
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
      
      setWorkspaces: (workspaces) => {
        const current = get().currentWorkspace;
        // If current workspace is no longer valid, select the first one
        if (current && !workspaces.find(w => w.id === current.id)) {
          set({ 
            workspaces, 
            currentWorkspace: workspaces[0] || null 
          });
        } else {
          set({ workspaces });
        }
      },
      
      setLoading: (isLoading) => set({ isLoading }),
      
      selectWorkspaceById: (id) => {
        const workspace = get().workspaces.find(w => w.id === id);
        if (workspace) {
          set({ currentWorkspace: workspace });
        }
      },
      
      clearWorkspace: () => set({ currentWorkspace: null }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'workspace-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentWorkspace: state.currentWorkspace,
      }),
    }
  )
);

// Selectors
export const selectCurrentWorkspaceId = (state: WorkspaceState) => 
  state.currentWorkspace?.id;

export const selectCurrentWorkspaceName = (state: WorkspaceState) => 
  state.currentWorkspace?.name;

export const selectHasWorkspace = (state: WorkspaceState) => 
  !!state.currentWorkspace;
