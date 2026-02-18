import { analyticsService } from './analytics.service';
import api from '@/lib/api-client';
import { conversationService, messageService } from './conversation.service';

jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('./conversation.service', () => ({
  conversationService: {
    getStats: jest.fn(),
  },
  messageService: {
    getStats: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockConversationService = conversationService as jest.Mocked<typeof conversationService>;
const mockMessageService = messageService as jest.Mocked<typeof messageService>;

describe('AnalyticsService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('getOverview', () => {
    it('should combine conversation and message stats', async () => {
      const convStats = { total: 50, open: 10, pending: 5, resolved: 35 };
      const msgStats = { total: 500, sent: 300, received: 200 };
      mockConversationService.getStats.mockResolvedValue(convStats as any);
      mockMessageService.getStats.mockResolvedValue(msgStats as any);

      const result = await analyticsService.getOverview();

      expect(result.conversations).toEqual(convStats);
      expect(result.messages).toEqual(msgStats);
      // Both are called in parallel via Promise.all
      expect(mockConversationService.getStats).toHaveBeenCalledTimes(1);
      expect(mockMessageService.getStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCampaignAnalytics', () => {
    it('should fetch campaign analytics from API', async () => {
      const stats = { totalCampaigns: 10, averageDeliveryRate: 0.95 };
      mockApi.get.mockResolvedValue(stats);

      const result = await analyticsService.getCampaignAnalytics();

      expect(mockApi.get).toHaveBeenCalledWith('/analytics/campaigns');
      expect(result).toEqual(stats);
    });
  });

  describe('getContactGrowth', () => {
    it('should fetch contact growth with days param', async () => {
      mockApi.get.mockResolvedValue({ totalContacts: 100 });

      await analyticsService.getContactGrowth(30);

      expect(mockApi.get).toHaveBeenCalledWith('/analytics/contacts?days=30');
    });

    it('should fetch without days param', async () => {
      mockApi.get.mockResolvedValue({ totalContacts: 100 });

      await analyticsService.getContactGrowth();

      expect(mockApi.get).toHaveBeenCalledWith('/analytics/contacts');
    });
  });

  describe('getPagePerformance', () => {
    it('should fetch page performance', async () => {
      mockApi.get.mockResolvedValue([{ pageId: 'p-1', totalContacts: 50 }]);

      const result = await analyticsService.getPagePerformance();

      expect(mockApi.get).toHaveBeenCalledWith('/analytics/pages');
      expect(result).toHaveLength(1);
    });
  });

  describe('getEngagementMetrics', () => {
    it('should fetch engagement metrics', async () => {
      mockApi.get.mockResolvedValue({ messagesPerContact: 5 });

      const result = await analyticsService.getEngagementMetrics();

      expect(mockApi.get).toHaveBeenCalledWith('/analytics/engagement');
      expect(result.messagesPerContact).toBe(5);
    });
  });
});
