'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analytics.service';
import { useConversationStats, useMessageStats } from './use-conversations';

// Query keys
export const analyticsKeys = {
  all: ['analytics'] as const,
  overview: (days?: number) => [...analyticsKeys.all, 'overview', days] as const,
  campaigns: () => [...analyticsKeys.all, 'campaigns'] as const,
  contactGrowth: (days?: number) => [...analyticsKeys.all, 'contactGrowth', days] as const,
  pagePerformance: () => [...analyticsKeys.all, 'pagePerformance'] as const,
  engagement: () => [...analyticsKeys.all, 'engagement'] as const,
};

/**
 * Hook to fetch analytics overview
 */
export function useAnalyticsOverview(days?: number) {
  return useQuery({
    queryKey: analyticsKeys.overview(days),
    queryFn: () => analyticsService.getOverview(days),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch campaign analytics
 */
export function useCampaignAnalytics() {
  return useQuery({
    queryKey: analyticsKeys.campaigns(),
    queryFn: () => analyticsService.getCampaignAnalytics(),
    staleTime: 60000,
  });
}

/**
 * Hook to fetch contact growth analytics
 */
export function useContactGrowth(days?: number) {
  return useQuery({
    queryKey: analyticsKeys.contactGrowth(days),
    queryFn: () => analyticsService.getContactGrowth(days),
    staleTime: 60000,
  });
}

/**
 * Hook to fetch page performance
 */
export function usePagePerformance() {
  return useQuery({
    queryKey: analyticsKeys.pagePerformance(),
    queryFn: () => analyticsService.getPagePerformance(),
    staleTime: 60000,
  });
}

/**
 * Hook to fetch engagement metrics
 */
export function useEngagementMetrics() {
  return useQuery({
    queryKey: analyticsKeys.engagement(),
    queryFn: () => analyticsService.getEngagementMetrics(),
    staleTime: 60000,
  });
}

// Re-export hooks from conversations for convenience
export { useConversationStats, useMessageStats };
