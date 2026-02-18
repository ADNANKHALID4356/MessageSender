/**
 * =============================================
 * Drip Campaign Service — Unit Tests
 * =============================================
 */
import { Test, TestingModule } from '@nestjs/testing';
import { DripCampaignService } from './drip-campaign.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MessageQueueService } from '../messages/message-queue.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('DripCampaignService', () => {
  let service: DripCampaignService;

  const mockPrisma: any = {
    campaign: {
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    page: { findFirst: jest.fn() },
    segment: { findUnique: jest.fn() },
    contact: { findMany: jest.fn() },
  };

  const mockRedis: any = {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    getClient: jest.fn().mockReturnValue({
      keys: jest.fn().mockResolvedValue([]),
    }),
  };

  const mockMessageQueue: any = {
    addMessage: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DripCampaignService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: MessageQueueService, useValue: mockMessageQueue },
      ],
    }).compile();

    service = module.get(DripCampaignService);
    jest.clearAllMocks();
  });

  // ===========================================
  // Launch Drip Campaign
  // ===========================================

  describe('launchDripCampaign', () => {
    it('should throw NotFoundException if campaign not found', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(null);
      await expect(service.launchDripCampaign('ws1', 'c1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if campaign is not a drip campaign', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({ id: 'c1', campaignType: 'BROADCAST' });
      await expect(service.launchDripCampaign('ws1', 'c1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no sequence steps', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({
        id: 'c1',
        campaignType: 'DRIP',
        dripSequence: [],
      });
      await expect(service.launchDripCampaign('ws1', 'c1')).rejects.toThrow(BadRequestException);
    });
  });

  // ===========================================
  // Get Contact Progress
  // ===========================================

  describe('getContactProgress', () => {
    it('should return null when no progress exists', async () => {
      mockRedis.get.mockResolvedValue(null);
      const progress = await service.getContactProgress('c1', 'contact1');
      expect(progress).toBeNull();
    });

    it('should return progress from Redis', async () => {
      const mockProgress = {
        contactId: 'contact1',
        campaignId: 'c1',
        currentStep: 1,
        totalSteps: 3,
        status: 'active',
        startedAt: new Date().toISOString(),
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(mockProgress));
      const progress = await service.getContactProgress('c1', 'contact1');
      expect(progress).toEqual(mockProgress);
    });
  });

  // ===========================================
  // Remove Contact From Drip
  // ===========================================

  describe('removeContactFromDrip', () => {
    it('should remove contact and update progress status', async () => {
      const mockProgress = {
        contactId: 'contact1',
        campaignId: 'c1',
        currentStep: 1,
        totalSteps: 3,
        status: 'active',
        startedAt: new Date().toISOString(),
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(mockProgress));

      await service.removeContactFromDrip('c1', 'contact1');

      expect(mockRedis.set).toHaveBeenCalled();
      // Verify the saved progress has status 'removed'
      const savedArg = mockRedis.set.mock.calls[0][1];
      const savedProgress = JSON.parse(savedArg);
      expect(savedProgress.status).toBe('removed');
    });
  });
});
