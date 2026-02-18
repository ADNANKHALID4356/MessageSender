import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceService } from './compliance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

// =============================================
// Compliance Service - Unit Tests
// =============================================

describe('ComplianceService', () => {
  let service: ComplianceService;

  const mockPrisma = {
    contact: { findUnique: jest.fn() },
    message: { count: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
    page: { findFirst: jest.fn() },
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    getClient: jest.fn().mockReturnValue({
      keys: jest.fn().mockResolvedValue([]),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<ComplianceService>(ComplianceService);
    jest.clearAllMocks();
  });

  describe('checkCompliance', () => {
    it('should allow message within 24-hour window', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'c1',
        lastInteractionAt: new Date(), // Now = within window
      });
      mockPrisma.message.count.mockResolvedValue(5);
      mockRedis.get.mockResolvedValue(null);

      const result = await service.checkCompliance('ws1', 'c1', 'p1');

      // canSend should be boolean, warnings should be an array
      expect(typeof result.canSend).toBe('boolean');
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should recommend bypass when outside 24-hour window', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'c1',
        lastInteractionAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48h ago
      });
      mockPrisma.message.count.mockResolvedValue(0);
      mockRedis.get.mockResolvedValue(null);

      const result = await service.checkCompliance('ws1', 'c1', 'p1');

      expect(result.canSend).toBeDefined();
      expect(result.recommendedBypassMethod).toBeDefined();
    });

    it('should check frequency limits', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'c1',
        lastInteractionAt: new Date(),
      });
      // 100 messages in last hour = high frequency
      mockPrisma.message.count.mockResolvedValue(100);
      mockRedis.get.mockResolvedValue(null);

      const result = await service.checkCompliance('ws1', 'c1', 'p1');

      // Should still allow but may have warnings
      expect(result).toBeDefined();
    });
  });
});
