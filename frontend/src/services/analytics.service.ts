import api from '@/lib/api-client';
import { conversationService, messageService } from './conversation.service';
import type { ConversationStats, MessageStats } from './conversation.service';

// ===========================================
// Types
// ===========================================

export interface AnalyticsOverview {
  conversations: ConversationStats;
  messages: MessageStats;
}

export interface DailyStats {
  date: string;
  sent: number;
  delivered: number;
  read: number;
}

export interface CampaignPerformance {
  id: string;
  name: string;
  type: string;
  status: string;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  deliveryRate: number;
  createdAt: string;
}

export interface CampaignAnalytics {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  draftCampaigns: number;
  scheduledCampaigns: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  averageDeliveryRate: number;
  topCampaigns: CampaignPerformance[];
}

export interface ContactGrowth {
  totalContacts: number;
  newContactsToday: number;
  newContactsThisWeek: number;
  newContactsThisMonth: number;
  contactsByDay: { date: string; count: number; cumulative: number }[];
  contactsBySource: { source: string; count: number }[];
  contactsByEngagement: { level: string; count: number }[];
  subscribedContacts: number;
  unsubscribedContacts: number;
}

export interface PagePerformance {
  pageId: string;
  pageName: string;
  profilePictureUrl: string | null;
  totalContacts: number;
  totalMessages: number;
  totalConversations: number;
  followersCount: number;
  isActive: boolean;
}

export interface EngagementMetrics {
  averageResponseTimeMinutes: number;
  messagesPerContact: number;
  activeContactsLast24h: number;
  activeContactsLast7d: number;
  activeContactsLast30d: number;
  bypassMethodUsage: { method: string; count: number }[];
}

export interface EngagementBreakdown {
  hot: number;
  warm: number;
  cold: number;
  inactive: number;
}

export interface DeliveryRates {
  deliveryRate: number;
  readRate: number;
  replyRate: number;
  unsubscribeRate: number;
}

// ===========================================
// Analytics Service
// ===========================================

export const analyticsService = {
  /**
   * Get analytics overview (conversations + messages)
   */
  async getOverview(days?: number): Promise<AnalyticsOverview> {
    const [conversations, messages] = await Promise.all([
      conversationService.getStats(),
      messageService.getStats(days),
    ]);
    
    return {
      conversations,
      messages,
    };
  },

  /**
   * Get conversation stats
   */
  async getConversationStats(): Promise<ConversationStats> {
    return conversationService.getStats();
  },

  /**
   * Get message stats
   */
  async getMessageStats(days?: number): Promise<MessageStats> {
    return messageService.getStats(days);
  },

  /**
   * Get campaign analytics from dedicated endpoint
   */
  async getCampaignAnalytics(): Promise<CampaignAnalytics> {
    return api.get<CampaignAnalytics>('/analytics/campaigns');
  },

  /**
   * Get contact growth analytics from dedicated endpoint
   */
  async getContactGrowth(days?: number): Promise<ContactGrowth> {
    const queryParams = days ? `?days=${days}` : '';
    return api.get<ContactGrowth>(`/analytics/contacts${queryParams}`);
  },

  /**
   * Get page performance from dedicated endpoint
   */
  async getPagePerformance(): Promise<PagePerformance[]> {
    return api.get<PagePerformance[]>('/analytics/pages');
  },

  /**
   * Get engagement metrics from dedicated endpoint
   */
  async getEngagementMetrics(): Promise<EngagementMetrics> {
    return api.get<EngagementMetrics>('/analytics/engagement');
  },
};

export default analyticsService;
