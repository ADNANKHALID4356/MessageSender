/**
 * =============================================
 * Trigger Campaign Service — Unit Tests
 * =============================================
 */
import { Test, TestingModule } from '@nestjs/testing';
import { TriggerCampaignService } from './trigger-campaign.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MessageQueueService } from '../messages/message-queue.service';
import { NotFoundException } from '@nestjs/common';

describe('TriggerCampaignService', () => {
  let service: TriggerCampaignService;

  const mockPrisma: any = {
    campaign: {
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    contact: { findUnique: jest.fn() },
  };

  const mockRedis: any = {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    getClient: jest.fn().mockReturnValue({
      sadd: jest.fn().mockResolvedValue(1),
      srem: jest.fn().mockResolvedValue(1),
      smembers: jest.fn().mockResolvedValue([]),
      incr: jest.fn().mockResolvedValue(1),
    }),
  };

  const mockMessageQueue: any = {
    addMessage: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TriggerCampaignService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: MessageQueueService, useValue: mockMessageQueue },
      ],
    }).compile();

    service = module.get(TriggerCampaignService);
    jest.clearAllMocks();
  });

  // ===========================================
  // Activate / Deactivate
  // ===========================================

  describe('activateTrigger', () => {
    it('should throw NotFoundException if campaign not found', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(null);
      await expect(service.activateTrigger('ws1', 'c1')).rejects.toThrow(NotFoundException);
    });

    it('should store config in Redis and update status', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({
        id: 'c1',
        campaignType: 'TRIGGER',
        recurringPattern: {
          conditions: [{ type: 'new_contact' }],
          matchAll: true,
          cooldownMinutes: 60,
          maxTriggersPerContact: 1,
        },
        messageContent: { text: 'Welcome!' },
        bypassMethod: null,
        messageTag: 'CONFIRMED_EVENT_UPDATE',
      });

      await service.activateTrigger('ws1', 'c1');

      expect(mockRedis.set).toHaveBeenCalledWith(
        'trigger:active:c1',
        expect.any(String),
        0,
      );
      expect(mockPrisma.campaign.update).toHaveBeenCalled();
    });
  });

  describe('deactivateTrigger', () => {
    it('should remove from Redis and update status to PAUSED', async () => {
      await service.deactivateTrigger('ws1', 'c1');

      expect(mockRedis.del).toHaveBeenCalledWith('trigger:active:c1');
      expect(mockPrisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PAUSED' }),
        }),
      );
    });
  });

  // ===========================================
  // Event Evaluation
  // ===========================================

  describe('evaluateContactEvent', () => {
    it('should return empty triggered list when no active campaigns', async () => {
      mockRedis.getClient().smembers.mockResolvedValue([]);
      const result = await service.evaluateContactEvent('ws1', 'contact1', 'new_contact');
      expect(result.triggered).toEqual([]);
    });

    it('should skip campaign if on cooldown', async () => {
      mockRedis.getClient().smembers.mockResolvedValue(['c1']);
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify({
          config: { conditions: [{ type: 'new_contact' }], matchAll: true, cooldownMinutes: 60, maxTriggersPerContact: 0 },
          messageContent: { text: 'Hi' },
        }))
        .mockResolvedValueOnce('1'); // cooldown active

      const result = await service.evaluateContactEvent('ws1', 'contact1', 'new_contact');
      expect(result.triggered).toEqual([]);
    });
  });
});
