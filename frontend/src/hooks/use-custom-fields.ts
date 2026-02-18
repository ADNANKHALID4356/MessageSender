import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  customFieldsService,
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
} from '@/services/custom-fields.service';

const KEYS = {
  definitions: ['custom-field-definitions'] as const,
  contactValues: (contactId: string) => ['custom-field-values', contactId] as const,
};

/** Hook for custom field definition CRUD */
export function useCustomFields() {
  const qc = useQueryClient();

  const definitionsQuery = useQuery({
    queryKey: KEYS.definitions,
    queryFn: customFieldsService.getDefinitions,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateCustomFieldDto) => customFieldsService.createDefinition(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.definitions }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ fieldId, dto }: { fieldId: string; dto: UpdateCustomFieldDto }) =>
      customFieldsService.updateDefinition(fieldId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.definitions }),
  });

  const deleteMutation = useMutation({
    mutationFn: (fieldId: string) => customFieldsService.deleteDefinition(fieldId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.definitions }),
  });

  const reorderMutation = useMutation({
    mutationFn: (fieldIds: string[]) => customFieldsService.reorderDefinitions(fieldIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.definitions }),
  });

  return {
    definitions: definitionsQuery.data ?? [],
    isLoading: definitionsQuery.isLoading,
    error: definitionsQuery.error,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    reorder: reorderMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/** Hook for a contact's custom field values */
export function useContactCustomFields(contactId: string | null) {
  const qc = useQueryClient();

  const valuesQuery = useQuery({
    queryKey: KEYS.contactValues(contactId!),
    queryFn: () => customFieldsService.getContactValues(contactId!),
    enabled: !!contactId,
  });

  const setValuesMutation = useMutation({
    mutationFn: (fields: Record<string, unknown>) =>
      customFieldsService.setContactValues(contactId!, fields),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.contactValues(contactId!) });
      qc.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  return {
    fields: valuesQuery.data ?? [],
    isLoading: valuesQuery.isLoading,
    error: valuesQuery.error,
    setValues: setValuesMutation.mutateAsync,
    isSaving: setValuesMutation.isPending,
  };
}
