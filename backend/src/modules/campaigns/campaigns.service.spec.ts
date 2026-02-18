import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageQueueService } from '../messages/message-queue.service';
import { RateLimitService } from '../messages/rate-limit.service';

describe('CampaignsService', () => {
  let service: CampaignsService;

  const mockPrisma = {
    campaign: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    contact: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    segment: {
      findFirst: jest.fn(),
    },
    segmentContact: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    page: {
      findFirst: jest.fn(),
    },
  };

  const mockMessageQueue = {
    addCampaignMessages: jest.fn(),
    pauseQueue: jest.fn(),
    resumeQueue: jest.fn(),
  };

  const mockRateLimit = {};

  const baseCampaign = {
    id: 'camp-1',
    workspaceId: 'ws-1',
    name: 'Test Campaign',
    description: 'A test',
    campaignType: 'ONE_TIME',
    status: 'DRAFT',
    audienceType: 'ALL',
    audienceSegmentId: null,
    audiencePageIds: [],
    audienceContactIds: [],
    messageContent: { text: 'Hello!' },
    bypassMethod: null,
    messageTag: null,
    scheduledAt: null,
    timezone: 'UTC',
    totalRecipients: 100,
    sentCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    openedCount: 0,
    clickedCount: 0,
    repliedCount: 0,
    unsubscribedCount: 0,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MessageQueueService, useValue: mockMessageQueue },
        { provide: RateLimitService, useValue: mockRateLimit },
      ],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===========================================
  // Create
  // ===========================================
  describe('create', () => {
    it('should create a campaign with ALL audience', async () => {
      mockPrisma.contact.count.mockResolvedValue(100);
      mockPrisma.campaign.create.mockResolvedValue(baseCampaign);

      const result = await service.create('ws-1', 'user-1', {
        name: 'Test Campaign',
        campaignType: 'ONE_TIME' as any,
        audienceType: 'ALL' as any,
        messageContent: { text: 'Hello!' },
      } as any);

      expect(result.id).toBe('camp-1');
      expect(mockPrisma.campaign.create).toHaveBeenCalled();
    });

    it('should throw when SEGMENT audience has no segmentId', async () => {
      await expect(
        service.create('ws-1', 'user-1', {
          name: 'Bad',
          campaignType: 'ONE_TIME' as any,
          audienceType: 'SEGMENT' as any,
          messageContent: { text: 'Hello!' },
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when SEGMENT not found', async () => {
      mockPrisma.segment.findFirst.mockResolvedValue(null);

      await expect(
        service.create('ws-1', 'user-1', {
          name: 'Bad',
          campaignType: 'ONE_TIME' as any,
          audienceType: 'SEGMENT' as any,
          audienceSegmentId: 'invalid-seg',
          messageContent: { text: 'Hello!' },
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when PAGES audience has no page IDs', async () => {
      await expect(
        service.create('ws-1', 'user-1', {
          name: 'Bad',
          campaignType: 'ONE_TIME' as any,
          audienceType: 'PAGES' as any,
          audiencePageIds: [],
          messageContent: { text: 'Hello!' },
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when MANUAL audience has no contact IDs', async () => {
      await expect(
        service.create('ws-1', 'user-1', {
          name: 'Bad',
          campaignType: 'ONE_TIME' as any,
          audienceType: 'MANUAL' as any,
          audienceContactIds: [],
          messageContent: { text: 'Hello!' },
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===========================================
  // findById
  // ===========================================
  describe('findById', () => {
    it('should return campaign by id', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(baseCampaign);

      const result = await service.findById('ws-1', 'camp-1');
      expect(result.id).toBe('camp-1');
    });

    it('should throw NotFoundException for missing campaign', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(null);

      await expect(service.findById('ws-1', 'bad')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ===========================================
  // findAll
  // ===========================================
  describe('findAll', () => {
    it('should return paginated campaigns', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([baseCampaign]);
      mockPrisma.campaign.count.mockResolvedValue(1);

      const result = await service.findAll('ws-1', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should apply status and search filters', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([]);
      mockPrisma.campaign.count.mockResolvedValue(0);

      await service.findAll('ws-1', { status: 'DRAFT' as any, search: 'test' });

      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'DRAFT',
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  // ===========================================
  // Update
  // ===========================================
  describe('update', () => {
    it('should update a DRAFT campaign', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(baseCampaign);
      mockPrisma.campaign.update.mockResolvedValue({ ...baseCampaign, name: 'Updated' });

      const result = await service.update('ws-1', 'camp-1', { name: 'Updated' } as any);

      expect(result.name).toBe('Updated');
    });

    it('should throw when updating non-DRAFT campaign', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({
        ...baseCampaign,
        status: 'RUNNING',
      });

      await expect(
        service.update('ws-1', 'camp-1', { name: 'x' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===========================================
  // Delete
  // ===========================================
  describe('delete', () => {
    it('should delete a DRAFT campaign', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(baseCampaign);
      mockPrisma.campaign.delete.mockResolvedValue({});

      await service.delete('ws-1', 'camp-1');
      expect(mockPrisma.campaign.delete).toHaveBeenCalled();
    });

    it('should throw when deleting RUNNING campaign', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({
        ...baseCampaign,
        status: 'RUNNING',
      });

      await expect(service.delete('ws-1', 'camp-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ===========================================
  // Duplicate
  // ===========================================
  describe('duplicate', () => {
    it('should create a copy with (Copy) suffix', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(baseCampaign);
      mockPrisma.campaign.create.mockResolvedValue({
        ...baseCampaign,
        id: 'camp-2',
        name: 'Test Campaign (Copy)',
        status: 'DRAFT',
      });

      const result = await service.duplicate('ws-1', 'camp-1', 'user-1');

      expect(result.name).toBe('Test Campaign (Copy)');
      expect(result.status).toBe('DRAFT');
    });
  });

  // ===========================================
  // Launch
  // ===========================================
  describe('launch', () => {
    it('should launch a DRAFT campaign with recipients', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(baseCampaign);
      mockPrisma.contact.findMany.mockResolvedValue([
        { id: 'c-1' },
        { id: 'c-2' },
      ]);
      mockPrisma.page.findFirst.mockResolvedValue({ id: 'p-1' });
      mockPrisma.campaign.update.mockResolvedValue({
        ...baseCampaign,
        status: 'RUNNING',
      });

      const result = await service.launch('ws-1', 'camp-1');

      expect(result.status).toBe('RUNNING');
      expect(mockMessageQueue.addCampaignMessages).toHaveBeenCalled();
    });

    it('should throw when campaign has zero recipients', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({
        ...baseCampaign,
        totalRecipients: 0,
      });

      await expect(service.launch('ws-1', 'camp-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when no page available', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(baseCampaign);
      mockPrisma.contact.findMany.mockResolvedValue([{ id: 'c-1' }]);
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await expect(service.launch('ws-1', 'camp-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when launching non-DRAFT/SCHEDULED campaign', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({
        ...baseCampaign,
        status: 'COMPLETED',
      });

      await expect(service.launch('ws-1', 'camp-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ===========================================
  // Schedule
  // ===========================================
  describe('schedule', () => {
    it('should schedule a DRAFT campaign', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      mockPrisma.campaign.findFirst.mockResolvedValue(baseCampaign);
      mockPrisma.campaign.update.mockResolvedValue({
        ...baseCampaign,
        status: 'SCHEDULED',
        scheduledAt: futureDate,
      });

      const result = await service.schedule('ws-1', 'camp-1', futureDate);

      expect(result.status).toBe('SCHEDULED');
    });

    it('should throw when scheduling in the past', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(baseCampaign);
      const pastDate = new Date(Date.now() - 86400000);

      await expect(
        service.schedule('ws-1', 'camp-1', pastDate),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===========================================
  // Pause / Resume / Cancel
  // ===========================================
  describe('pause', () => {
    it('should pause a RUNNING campaign', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({
        ...baseCampaign,
        status: 'RUNNING',
      });
      mockPrisma.campaign.update.mockResolvedValue({
        ...baseCampaign,
        status: 'PAUSED',
      });

      const result = await service.pause('ws-1', 'camp-1');

      expect(result.status).toBe('PAUSED');
      expect(mockMessageQueue.pauseQueue).toHaveBeenCalled();
    });

    it('should throw when pausing non-RUNNING campaign', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(baseCampaign); // DRAFT

      await expect(service.pause('ws-1', 'camp-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resume', () => {
    it('should resume a PAUSED campaign', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({
        ...baseCampaign,
        status: 'PAUSED',
      });
      mockPrisma.campaign.update.mockResolvedValue({
        ...baseCampaign,
        status: 'RUNNING',
      });

      const result = await service.resume('ws-1', 'camp-1');

      expect(result.status).toBe('RUNNING');
      expect(mockMessageQueue.resumeQueue).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should cancel a RUNNING campaign', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({
        ...baseCampaign,
        status: 'RUNNING',
      });
      mockPrisma.campaign.update.mockResolvedValue({
        ...baseCampaign,
        status: 'CANCELLED',
      });

      const result = await service.cancel('ws-1', 'camp-1');

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw when cancelling DRAFT campaign', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(baseCampaign); // DRAFT

      await expect(service.cancel('ws-1', 'camp-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ===========================================
  // Statistics
  // ===========================================
  describe('getStats', () => {
    it('should return campaign stats with rates', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({
        ...baseCampaign,
        totalRecipients: 100,
        sentCount: 100,
        deliveredCount: 90,
        failedCount: 10,
        openedCount: 50,
        clickedCount: 20,
        repliedCount: 5,
        unsubscribedCount: 2,
      });

      const result = await service.getStats('ws-1', 'camp-1');

      expect(result.deliveryRate).toBe(90);
      expect(result.openRate).toBe(50);
      expect(result.clickRate).toBe(20);
      expect(result.replyRate).toBe(5);
    });
  });

  describe('getProgress', () => {
    it('should return campaign progress', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({
        ...baseCampaign,
        totalRecipients: 100,
        sentCount: 60,
        failedCount: 5,
      });

      const result = await service.getProgress('ws-1', 'camp-1');

      expect(result.total).toBe(100);
      expect(result.sent).toBe(60);
      expect(result.failed).toBe(5);
      expect(result.pending).toBe(35);
      expect(result.progress).toBe(60);
    });
  });

  describe('incrementStats', () => {
    it('should increment sent count and check completion', async () => {
      mockPrisma.campaign.update.mockResolvedValue({});
      mockPrisma.campaign.findUnique.mockResolvedValue({
        ...baseCampaign,
        sentCount: 99,
        failedCount: 1,
        totalRecipients: 100,
      });

      await service.incrementStats('camp-1', 'sent');

      expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'camp-1' },
        data: { sentCount: { increment: 1 } },
      });
      // Should also mark as completed since 99+1 >= 100
      expect(mockPrisma.campaign.update).toHaveBeenCalledTimes(2);
    });
  });
});
