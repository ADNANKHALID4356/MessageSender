/**
 * =============================================
 * A/B Testing Service — Unit Tests
 * =============================================
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AbTestingService } from './ab-testing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageQueueService } from '../messages/message-queue.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AbTestingService', () => {
  let service: AbTestingService;

  const mockPrisma: any = {
    campaign: {
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    message: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    page: {
      findFirst: jest.fn(),
    },
    segment: { findUnique: jest.fn() },
    contact: { findMany: jest.fn() },
  };

  const mockMessageQueue: any = {
    addMessage: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AbTestingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MessageQueueService, useValue: mockMessageQueue },
      ],
    }).compile();

    service = module.get(AbTestingService);
    jest.clearAllMocks();
  });

  // ===========================================
  // Launch A/B Test
  // ===========================================

  describe('launchAbTest', () => {
    it('should throw NotFoundException if campaign not found', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(null);
      await expect(service.launchAbTest('ws1', 'c1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if campaign is not A/B test', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({ id: 'c1', isAbTest: false });
      await expect(service.launchAbTest('ws1', 'c1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if <2 variants', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({
        id: 'c1',
        isAbTest: true,
        abVariants: [{ name: 'A', content: { text: 'Hi' }, percentage: 100 }],
      });
      await expect(service.launchAbTest('ws1', 'c1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if percentages do not sum to 100', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({
        id: 'c1',
        isAbTest: true,
        abVariants: [
          { name: 'A', content: { text: 'Hi A' }, percentage: 40 },
          { name: 'B', content: { text: 'Hi B' }, percentage: 40 },
        ],
      });
      await expect(service.launchAbTest('ws1', 'c1')).rejects.toThrow(BadRequestException);
    });
  });

  // ===========================================
  // Get A/B Test Results
  // ===========================================

  describe('getAbTestResults', () => {
    it('should throw NotFoundException if campaign not found', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(null);
      await expect(service.getAbTestResults('ws1', 'c1')).rejects.toThrow(NotFoundException);
    });

    it('should return results with variant stats', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({
        id: 'c1',
        isAbTest: true,
        abVariants: [
          { name: 'A', content: { text: 'Hi A' }, percentage: 50 },
          { name: 'B', content: { text: 'Hi B' }, percentage: 50 },
        ],
        abWinnerCriteria: 'DELIVERY_RATE',
        abWinnerVariant: null,
        totalRecipients: 100,
      });
      mockPrisma.message.findMany.mockResolvedValue([]);
      mockPrisma.message.count.mockResolvedValue(0);

      const result = await service.getAbTestResults('ws1', 'c1');
      expect(result).toBeDefined();
      expect(result.campaignId).toBe('c1');
      expect(result.variants).toHaveLength(2);
    });
  });
});
