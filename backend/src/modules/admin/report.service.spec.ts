import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from './report.service';
import { PrismaService } from '../../prisma/prisma.service';

// =============================================
// Report Service - Unit Tests
// =============================================

describe('ReportService', () => {
  let service: ReportService;
  let prisma: any;

  const mockPrisma = {
    campaign: {
      findMany: jest.fn(),
    },
    contact: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    message: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    conversation: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('generateReport', () => {
    it('should generate campaign_summary report', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([
        {
          id: 'c1',
          name: 'Test Campaign',
          campaignType: 'ONE_TIME',
          status: 'COMPLETED',
          totalRecipients: 100,
          sentCount: 95,
          deliveredCount: 90,
          failedCount: 5,
          openedCount: 50,
          clickedCount: 20,
          createdAt: new Date('2026-01-01'),
          completedAt: new Date('2026-01-02'),
        },
      ]);

      const result = await service.generateReport({
        workspaceId: 'ws1',
        reportType: 'campaign_summary',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-02-01'),
      });

      expect(result.reportType).toBe('campaign_summary');
      expect(result.data.totalCampaigns).toBe(1);
      expect(result.data.totalRecipients).toBe(100);
      expect(result.data.totalDelivered).toBe(90);
      expect(result.data.campaigns).toHaveLength(1);
      expect(result.generatedAt).toBeDefined();
    });

    it('should generate contact_growth report', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([
        { id: 'ct1', source: 'ORGANIC', engagementLevel: 'ACTIVE', createdAt: new Date('2026-01-15') },
        { id: 'ct2', source: 'IMPORT', engagementLevel: 'NEW', createdAt: new Date('2026-01-16') },
      ]);
      mockPrisma.contact.count.mockResolvedValue(50);

      const result = await service.generateReport({
        workspaceId: 'ws1',
        reportType: 'contact_growth',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-02-01'),
      });

      expect(result.data.totalNewContacts).toBe(2);
      expect(result.data.totalContactsBefore).toBe(50);
      expect(result.data.totalContactsAfter).toBe(52);
      expect(result.data.bySource.ORGANIC).toBe(1);
      expect(result.data.bySource.IMPORT).toBe(1);
    });

    it('should generate engagement report', async () => {
      mockPrisma.message.count
        .mockResolvedValueOnce(200)  // total
        .mockResolvedValueOnce(80)   // inbound
        .mockResolvedValueOnce(120)  // outbound
        .mockResolvedValueOnce(100)  // delivered
        .mockResolvedValueOnce(5);   // failed (compliance)
      mockPrisma.conversation.findMany.mockResolvedValue([
        { status: 'OPEN', unreadCount: 2 },
        { status: 'CLOSED', unreadCount: 0 },
      ]);
      mockPrisma.contact.count.mockResolvedValue(30);
      mockPrisma.message.groupBy.mockResolvedValue([
        { bypassMethod: 'OTN_TOKEN', _count: 5 },
      ]);

      const result = await service.generateReport({
        workspaceId: 'ws1',
        reportType: 'engagement',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-02-01'),
      });

      expect(result.data.totalMessages).toBe(200);
      expect(result.data.inboundMessages).toBe(80);
      expect(result.data.outboundMessages).toBe(120);
      expect(result.data.activeContacts).toBe(30);
    });

    it('should generate CSV when format is csv', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([]);

      const result = await service.generateReport({
        workspaceId: 'ws1',
        reportType: 'campaign_summary',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-02-01'),
        format: 'csv',
      });

      expect(result.csvContent).toBeDefined();
      expect(typeof result.csvContent).toBe('string');
    });

    it('should handle empty data gracefully', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([]);

      const result = await service.generateReport({
        workspaceId: 'ws1',
        reportType: 'campaign_summary',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-02-01'),
      });

      expect(result.data.totalCampaigns).toBe(0);
      expect(result.data.campaigns).toEqual([]);
    });

    it('should generate PDF when format is pdf', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([
        {
          id: 'c1',
          name: 'PDF Campaign',
          campaignType: 'ONE_TIME',
          status: 'COMPLETED',
          totalRecipients: 50,
          sentCount: 48,
          deliveredCount: 45,
          failedCount: 3,
          openedCount: 20,
          clickedCount: 5,
          createdAt: new Date('2026-01-15'),
          completedAt: new Date('2026-01-16'),
        },
      ]);

      const result = await service.generateReport({
        workspaceId: 'ws1',
        reportType: 'campaign_summary',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-02-01'),
        format: 'pdf',
      });

      expect(result.pdfBuffer).toBeDefined();
      expect(result.pdfBuffer).toBeInstanceOf(Buffer);
      expect(result.pdfBuffer!.length).toBeGreaterThan(0);
      // PDF files start with %PDF
      expect(result.pdfBuffer!.toString('utf8', 0, 5)).toContain('%PDF');
    });

    it('should generate PDF for engagement report', async () => {
      mockPrisma.message.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(40)
        .mockResolvedValueOnce(60)
        .mockResolvedValueOnce(55)
        .mockResolvedValueOnce(2);
      mockPrisma.conversation.findMany.mockResolvedValue([]);
      mockPrisma.contact.count.mockResolvedValue(15);
      mockPrisma.message.groupBy.mockResolvedValue([]);

      const result = await service.generateReport({
        workspaceId: 'ws1',
        reportType: 'engagement',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-02-01'),
        format: 'pdf',
      });

      expect(result.pdfBuffer).toBeInstanceOf(Buffer);
      expect(result.pdfBuffer!.length).toBeGreaterThan(0);
    });

    it('should generate PDF for contact_growth report with daily data', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([
        { id: 'ct1', source: 'ORGANIC', engagementLevel: 'ACTIVE', createdAt: new Date('2026-01-10') },
        { id: 'ct2', source: 'AD', engagementLevel: 'NEW', createdAt: new Date('2026-01-11') },
        { id: 'ct3', source: 'ORGANIC', engagementLevel: 'NEW', createdAt: new Date('2026-01-11') },
      ]);
      mockPrisma.contact.count.mockResolvedValue(20);

      const result = await service.generateReport({
        workspaceId: 'ws1',
        reportType: 'contact_growth',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-02-01'),
        format: 'pdf',
      });

      expect(result.pdfBuffer).toBeInstanceOf(Buffer);
      expect(result.data.totalNewContacts).toBe(3);
      expect(result.data.dailyGrowth).toHaveLength(2);
    });

    it('should generate compliance report', async () => {
      // Reset count mock completely
      mockPrisma.message.count.mockReset();
      mockPrisma.message.groupBy.mockReset();
      mockPrisma.message.groupBy.mockResolvedValueOnce([
        { messageTag: 'CONFIRMED_EVENT_UPDATE', _count: 10 },
      ]);
      mockPrisma.message.count
        .mockResolvedValueOnce(5)   // bypassMessages
        .mockResolvedValueOnce(100) // totalOutbound
        .mockResolvedValueOnce(3);  // failedMessages

      const result = await service.generateReport({
        workspaceId: 'ws1',
        reportType: 'compliance',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-02-01'),
      });

      expect(result.data.totalOutboundMessages).toBe(100);
      expect(result.data.failedMessages).toBe(3);
    });
  });
});
