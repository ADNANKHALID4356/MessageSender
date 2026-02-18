import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sponsoredService } from '@/services/sponsored.service';

export function useSponsoredCampaigns() {
  return useQuery({
    queryKey: ['sponsored-campaigns'],
    queryFn: () => sponsoredService.list(),
  });
}

export function useSponsoredCampaign(campaignId: string) {
  return useQuery({
    queryKey: ['sponsored-campaign', campaignId],
    queryFn: () => sponsoredService.get(campaignId),
    enabled: !!campaignId,
  });
}

export function useSponsoredCampaignStats(campaignId: string) {
  return useQuery({
    queryKey: ['sponsored-campaign-stats', campaignId],
    queryFn: () => sponsoredService.getStats(campaignId),
    enabled: !!campaignId,
  });
}

export function useCreateSponsoredCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof sponsoredService.create>[0]) =>
      sponsoredService.create(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sponsored-campaigns'] });
    },
  });
}

export function useSubmitSponsoredCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: string) => sponsoredService.submitForReview(campaignId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sponsored-campaigns'] });
    },
  });
}

export function usePauseSponsoredCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: string) => sponsoredService.pause(campaignId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sponsored-campaigns'] });
    },
  });
}

export function useDeleteSponsoredCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: string) => sponsoredService.delete(campaignId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sponsored-campaigns'] });
    },
  });
}
