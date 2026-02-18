import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templatesService } from '@/services/templates.service';
import { useWorkspaceStore } from '@/stores/workspace-store';

// Query keys — include workspaceId for proper cache isolation across workspaces
export const templateKeys = {
  all: (workspaceId?: string) => ['message-templates', workspaceId] as const,
  list: (workspaceId?: string, category?: string) => [...templateKeys.all(workspaceId), 'list', category] as const,
};

export const cannedKeys = {
  all: (workspaceId?: string) => ['canned-responses', workspaceId] as const,
  list: (workspaceId?: string, category?: string) => [...cannedKeys.all(workspaceId), 'list', category] as const,
};

/** Hook for message templates CRUD */
export function useTemplates(category?: string) {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id);

  const templatesQuery = useQuery({
    queryKey: templateKeys.list(workspaceId, category),
    queryFn: () => templatesService.getTemplates(category),
    enabled: !!workspaceId,
  });

  const createMutation = useMutation({
    mutationFn: (dto: { name: string; category?: string; content: any }) =>
      templatesService.createTemplate(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.all(workspaceId) }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<{ name: string; category: string; content: any; isActive: boolean }> }) =>
      templatesService.updateTemplate(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.all(workspaceId) }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesService.deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.all(workspaceId) }),
  });

  return {
    templates: templatesQuery.data ?? [],
    isLoading: templatesQuery.isLoading,
    error: templatesQuery.error,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/** Hook for canned responses CRUD */
export function useCannedResponses(category?: string) {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id);

  const responsesQuery = useQuery({
    queryKey: cannedKeys.list(workspaceId, category),
    queryFn: () => templatesService.getCannedResponses(category),
    enabled: !!workspaceId,
  });

  const createMutation = useMutation({
    mutationFn: (dto: { shortcut: string; title: string; content: string; category?: string }) =>
      templatesService.createCannedResponse(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: cannedKeys.all(workspaceId) }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<{ shortcut: string; title: string; content: string; category: string }> }) =>
      templatesService.updateCannedResponse(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: cannedKeys.all(workspaceId) }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesService.deleteCannedResponse(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: cannedKeys.all(workspaceId) }),
  });

  return {
    responses: responsesQuery.data ?? [],
    isLoading: responsesQuery.isLoading,
    error: responsesQuery.error,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
