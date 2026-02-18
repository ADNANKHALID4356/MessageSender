import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: any;

  const mockPrisma = {
    contact: { count: jest.fn(), groupBy: jest.fn() },
    conversation: { count: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
    message: { count: jest.fn(), groupBy: jest.fn() },
    campaign: { count: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
    page: { count: jest.fn(), findMany: jest.fn() },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===========================================
  // getOverview
  // ===========================================
  describe('getOverview', () => {
    it('should return complete overview stats', async () => {
      mockPrisma.contact.count.mockResolvedValue(100);
      mockPrisma.conversation.count
        .mockResolvedValueOnce(50)  // totalConversations
        .mockResolvedValueOnce(5);  // unreadConversations
      mockPrisma.message.count.mockResolvedValue(500);
      mockPrisma.campaign.count.mockResolvedValue(10);
      mockPrisma.page.count.mockResolvedValue(3);
      mockPrisma.conversation.groupBy.mockResolvedValue([
        { status: 'OPEN', _count: 20 },
        { status: 'PENDING', _count: 10 },
        { status: 'RESOLVED', _count: 15 },
      ]);

      const result = await service.getOverview('ws-1');

      expect(result.totalContacts).toBe(100);
      expect(result.totalConversations).toBe(50);
      expect(result.totalMessages).toBe(500);
      expect(result.totalCampaigns).toBe(10);
      expect(result.activePages).toBe(3);
      expect(result.openConversations).toBe(20);
      expect(result.pendingConversations).toBe(10);
      expect(result.resolvedConversations).toBe(15);
      expect(result.unreadConversations).toBe(5);
    });

    it('should handle empty workspace with zero counts', async () => {
      mockPrisma.contact.count.mockResolvedValue(0);
      mockPrisma.conversation.count.mockResolvedValue(0);
      mockPrisma.message.count.mockResolvedValue(0);
      mockPrisma.campaign.count.mockResolvedValue(0);
      mockPrisma.page.count.mockResolvedValue(0);
      mockPrisma.conversation.groupBy.mockResolvedValue([]);

      const result = await service.getOverview('ws-empty');

      expect(result.totalContacts).toBe(0);
      expect(result.openConversations).toBe(0);
      expect(result.pendingConversations).toBe(0);
      expect(result.resolvedConversations).toBe(0);
    });
  });

  // ===========================================
  // getMessageStats
  // ===========================================
  describe('getMessageStats', () => {
    it('should return message statistics with daily breakdown', async () => {
      mockPrisma.message.count
        .mockResolvedValueOnce(1000)  // totalMessages
        .mockResolvedValueOnce(400)   // inboundMessages
        .mockResolvedValueOnce(600);  // outboundMessages
      mockPrisma.message.groupBy.mockResolvedValue([
        { status: 'SENT', _count: 600 },
        { status: 'DELIVERED', _count: 550 },
        { status: 'READ', _count: 300 },
        { status: 'FAILED', _count: 10 },
      ]);
      mockPrisma.$queryRaw.mockResolvedValue([
        { date: '2026-02-01', inbound: 10, outbound: 20 },
        { date: '2026-02-02', inbound: 15, outbound: 25 },
      ]);

      const result = await service.getMessageStats('ws-1', 30);

      expect(result.totalMessages).toBe(1000);
      expect(result.inboundMessages).toBe(400);
      expect(result.outboundMessages).toBe(600);
      expect(result.sentMessages).toBe(600);
      expect(result.deliveredMessages).toBe(550);
      expect(result.failedMessages).toBe(10);
      expect(result.messagesByDay).toHaveLength(2);
      expect(result.messagesByDay[0].total).toBe(30); // 10+20
    });

    it('should calculate response rate correctly', async () => {
      mockPrisma.message.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(80)   // inbound
        .mockResolvedValueOnce(100); // outbound
      mockPrisma.message.groupBy.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getMessageStats('ws-1');

      expect(result.responseRate).toBe(0.8);
    });

    it('should handle zero outbound messages without division error', async () => {
      mockPrisma.message.count.mockResolvedValue(0);
      mockPrisma.message.groupBy.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getMessageStats('ws-1');

      expect(result.responseRate).toBe(0);
    });
  });

  // ===========================================
  // getCampaignStats
  // ===========================================
  describe('getCampaignStats', () => {
    it('should return campaign stats with delivery rate', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([
        {
          id: 'c-1', name: 'Campaign 1', campaignType: 'ONE_TIME', status: 'COMPLETED',
          sentCount: 100, deliveredCount: 90, failedCount: 10, createdAt: new Date(),
        },
      ]);
      mockPrisma.campaign.groupBy.mockResolvedValue([
        {
          status: 'COMPLETED', _count: 1,
          _sum: { sentCount: 100, deliveredCount: 90, failedCount: 10 },
        },
        {
          status: 'DRAFT', _count: 2,
          _sum: { sentCount: 0, deliveredCount: 0, failedCount: 0 },
        },
      ]);

      const result = await service.getCampaignStats('ws-1');

      expect(result.totalCampaigns).toBe(3);
      expect(result.completedCampaigns).toBe(1);
      expect(result.draftCampaigns).toBe(2);
      expect(result.totalSent).toBe(100);
      expect(result.totalDelivered).toBe(90);
      expect(result.averageDeliveryRate).toBe(0.9);
      expect(result.topCampaigns).toHaveLength(1);
    });
  });

  // ===========================================
  // getContactGrowth
  // ===========================================
  describe('getContactGrowth', () => {
    it('should return contact growth with daily data', async () => {
      mockPrisma.contact.count
        .mockResolvedValueOnce(200)  // total
        .mockResolvedValueOnce(5)    // today
        .mockResolvedValueOnce(30)   // week
        .mockResolvedValueOnce(100)  // month
        .mockResolvedValueOnce(180); // subscribed
      mockPrisma.contact.groupBy
        .mockResolvedValueOnce([{ source: 'MESSENGER', _count: 150 }, { source: 'IMPORT', _count: 50 }])
        .mockResolvedValueOnce([{ engagementLevel: 'HOT', _count: 50 }, { engagementLevel: 'WARM', _count: 100 }]);
      mockPrisma.$queryRaw.mockResolvedValue([
        { date: '2026-02-08', count: 3 },
        { date: '2026-02-09', count: 5 },
      ]);

      const result = await service.getContactGrowth('ws-1', 30);

      expect(result.totalContacts).toBe(200);
      expect(result.newContactsToday).toBe(5);
      expect(result.newContactsThisWeek).toBe(30);
      expect(result.subscribedContacts).toBe(180);
      expect(result.unsubscribedContacts).toBe(20);
      expect(result.contactsBySource).toHaveLength(2);
      expect(result.contactsByEngagement).toHaveLength(2);
    });
  });

  // ===========================================
  // getPagePerformance
  // ===========================================
  describe('getPagePerformance', () => {
    it('should return page performance metrics', async () => {
      mockPrisma.page.findMany.mockResolvedValue([
        {
          id: 'p-1', name: 'Test Page', profilePictureUrl: null,
          followersCount: 500, isActive: true,
          _count: { contacts: 200, messages: 1000, conversations: 50 },
        },
      ]);

      const result = await service.getPagePerformance('ws-1');

      expect(result).toHaveLength(1);
      expect(result[0].pageName).toBe('Test Page');
      expect(result[0].totalContacts).toBe(200);
      expect(result[0].totalMessages).toBe(1000);
      expect(result[0].followersCount).toBe(500);
    });
  });

  // ===========================================
  // getEngagementMetrics
  // ===========================================
  describe('getEngagementMetrics', () => {
    it('should return engagement metrics with bypass usage', async () => {
      mockPrisma.contact.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(20)  // 24h
        .mockResolvedValueOnce(50)  // 7d
        .mockResolvedValueOnce(80); // 30d
      mockPrisma.message.count.mockResolvedValue(500);
      mockPrisma.message.groupBy.mockResolvedValue([
        { bypassMethod: 'WITHIN_WINDOW', _count: 300 },
        { bypassMethod: 'OTN_TOKEN', _count: 50 },
      ]);
      mockPrisma.conversation.findMany.mockResolvedValue([
        { createdAt: new Date('2026-02-09T10:00:00'), lastMessageAt: new Date('2026-02-09T10:10:00') },
        { createdAt: new Date('2026-02-09T11:00:00'), lastMessageAt: new Date('2026-02-09T11:20:00') },
      ]);

      const result = await service.getEngagementMetrics('ws-1');

      expect(result.activeContactsLast24h).toBe(20);
      expect(result.activeContactsLast7d).toBe(50);
      expect(result.activeContactsLast30d).toBe(80);
      expect(result.messagesPerContact).toBe(5);
      expect(result.bypassMethodUsage).toHaveLength(2);
    });

    it('should handle zero contacts without division errors', async () => {
      mockPrisma.contact.count.mockResolvedValue(0);
      mockPrisma.message.count.mockResolvedValue(0);
      mockPrisma.message.groupBy.mockResolvedValue([]);
      mockPrisma.conversation.findMany.mockResolvedValue([]);

      const result = await service.getEngagementMetrics('ws-1');

      expect(result.messagesPerContact).toBe(0);
      expect(result.averageResponseTimeMinutes).toBe(0);
    });
  });
});
