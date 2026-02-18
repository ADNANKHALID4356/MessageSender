'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import * as segmentService from '@/services/segment.service';
import type {
  SegmentListQuery,
  SegmentContactsQuery,
  CreateSegmentDto,
  UpdateSegmentDto,
  SegmentFilters,
} from '@/services/segment.service';

// Query keys
export const segmentKeys = {
  all: ['segments'] as const,
  lists: () => [...segmentKeys.all, 'list'] as const,
  list: (params: SegmentListQuery) => [...segmentKeys.lists(), params] as const,
  details: () => [...segmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...segmentKeys.details(), id] as const,
  contacts: (id: string) => [...segmentKeys.all, 'contacts', id] as const,
  contactsList: (id: string, params: SegmentContactsQuery) => 
    [...segmentKeys.contacts(id), params] as const,
};

/**
 * Hook to fetch all segments
 */
export function useSegments(params?: SegmentListQuery) {
  return useQuery({
    queryKey: segmentKeys.list(params || {}),
    queryFn: () => segmentService.getSegments(params),
  });
}

/**
 * Hook to fetch a single segment by ID
 */
export function useSegment(segmentId: string | null) {
  return useQuery({
    queryKey: segmentKeys.detail(segmentId || ''),
    queryFn: () => segmentService.getSegmentById(segmentId!),
    enabled: !!segmentId,
  });
}

/**
 * Hook to fetch contacts in a segment
 */
export function useSegmentContacts(segmentId: string | null, params?: SegmentContactsQuery) {
  return useQuery({
    queryKey: segmentKeys.contactsList(segmentId || '', params || {}),
    queryFn: () => segmentService.getSegmentContacts(segmentId!, params),
    enabled: !!segmentId,
  });
}

/**
 * Hook to preview segment filters
 */
export function usePreviewSegment() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (filters: SegmentFilters) => segmentService.previewSegment(filters),
    onError: (error: Error) => {
      toast({
        title: 'Preview Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to create a new segment
 */
export function useCreateSegment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateSegmentDto) => segmentService.createSegment(data),
    onSuccess: (newSegment) => {
      queryClient.invalidateQueries({ queryKey: segmentKeys.lists() });
      toast({
        title: 'Segment Created',
        description: `"${newSegment.name}" has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Creation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update a segment
 */
export function useUpdateSegment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ segmentId, data }: { segmentId: string; data: UpdateSegmentDto }) =>
      segmentService.updateSegment(segmentId, data),
    onSuccess: (updatedSegment) => {
      queryClient.invalidateQueries({ queryKey: segmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: segmentKeys.detail(updatedSegment.id) });
      toast({
        title: 'Segment Updated',
        description: `"${updatedSegment.name}" has been updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a segment
 */
export function useDeleteSegment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (segmentId: string) => segmentService.deleteSegment(segmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: segmentKeys.lists() });
      toast({
        title: 'Segment Deleted',
        description: 'The segment has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Deletion Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to add contacts to a static segment
 */
export function useAddContactsToSegment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ segmentId, contactIds }: { segmentId: string; contactIds: string[] }) =>
      segmentService.addContactsToSegment(segmentId, contactIds),
    onSuccess: (_, { segmentId, contactIds }) => {
      queryClient.invalidateQueries({ queryKey: segmentKeys.detail(segmentId) });
      queryClient.invalidateQueries({ queryKey: segmentKeys.contacts(segmentId) });
      queryClient.invalidateQueries({ queryKey: segmentKeys.lists() });
      toast({
        title: 'Contacts Added',
        description: `${contactIds.length} contact(s) added to the segment.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Add Contacts',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to remove contacts from a static segment
 */
export function useRemoveContactsFromSegment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ segmentId, contactIds }: { segmentId: string; contactIds: string[] }) =>
      segmentService.removeContactsFromSegment(segmentId, contactIds),
    onSuccess: (_, { segmentId, contactIds }) => {
      queryClient.invalidateQueries({ queryKey: segmentKeys.detail(segmentId) });
      queryClient.invalidateQueries({ queryKey: segmentKeys.contacts(segmentId) });
      queryClient.invalidateQueries({ queryKey: segmentKeys.lists() });
      toast({
        title: 'Contacts Removed',
        description: `${contactIds.length} contact(s) removed from the segment.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Remove Contacts',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to recalculate a dynamic segment
 */
export function useRecalculateSegment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (segmentId: string) => segmentService.recalculateSegment(segmentId),
    onSuccess: (_, segmentId) => {
      queryClient.invalidateQueries({ queryKey: segmentKeys.detail(segmentId) });
      queryClient.invalidateQueries({ queryKey: segmentKeys.contacts(segmentId) });
      queryClient.invalidateQueries({ queryKey: segmentKeys.lists() });
      toast({
        title: 'Segment Recalculated',
        description: 'The segment has been recalculated with the latest data.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Recalculation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to recalculate all dynamic segments
 */
export function useRecalculateAllSegments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => segmentService.recalculateAllSegments(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: segmentKeys.all });
      toast({
        title: 'All Segments Recalculated',
        description: 'All dynamic segments have been recalculated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Recalculation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
