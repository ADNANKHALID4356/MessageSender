/**
 * =============================================
 * INTEGRATION TESTS
 * =============================================
 * Tests the interaction between multiple services,
 * verifying data flows correctly across module boundaries.
 * =============================================
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from '../admin/report.service';
import { BackupService } from '../admin/backup.service';
import { EmailService } from '../admin/email.service';
import { SystemHealthService } from '../admin/system-health.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
    statSync: jest.fn().mockReturnValue({ size: 512 }),
  };
});

jest.mock('child_process', () => {
  const actual = jest.requireActual('child_process');
  return { ...actual, execSync: jest.fn() };
});

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-msg-id' }),
    verify: jest.fn().mockResolvedValue(true),
  }),
}));

describe('Admin Module Integration Tests', () => {
  let reportService: ReportService;
  let backupService: BackupService;
  let emailService: EmailService;
  let healthService: SystemHealthService;

  // Stateful settings store (simulates SystemSetting table)
  let settingsStore: Map<string, any>;

  const mockPrisma: any = {
    $queryRawUnsafe: jest.fn(),
    campaign: { findMany: jest.fn(), count: jest.fn() },
    contact: { findMany: jest.fn(), count: jest.fn() },
    message: { count: jest.fn(), groupBy: jest.fn() },
    conversation: { findMany: jest.fn(), count: jest.fn() },
    page: { count: jest.fn(), findMany: jest.fn() },
    segment: { count: jest.fn(), findMany: jest.fn() },
    workspace: { findUnique: jest.fn(), count: jest.fn() },
    systemSetting: { findUnique: jest.fn(), upsert: jest.fn() },
  };

  const mockRedis: any = {
    getClient: jest.fn().mockReturnValue({
      ping: jest.fn().mockResolvedValue('PONG'),
      keys: jest.fn().mockResolvedValue([]),
    }),
  };

  /** Re-initialize all mock return values */
  function resetMockDefaults() {
    settingsStore = new Map();

    mockPrisma.$queryRawUnsafe.mockResolvedValue([{ '?column?': 1 }]);
    mockPrisma.campaign.findMany.mockResolvedValue([]);
    mockPrisma.campaign.count.mockResolvedValue(0);
    mockPrisma.contact.findMany.mockResolvedValue([]);
    mockPrisma.contact.count.mockResolvedValue(0);
    mockPrisma.message.count.mockResolvedValue(0);
    mockPrisma.message.groupBy.mockResolvedValue([]);
    mockPrisma.conversation.findMany.mockResolvedValue([]);
    mockPrisma.conversation.count.mockResolvedValue(0);
    mockPrisma.page.count.mockResolvedValue(0);
    mockPrisma.page.findMany.mockResolvedValue([]);
    mockPrisma.segment.count.mockResolvedValue(0);
    mockPrisma.segment.findMany.mockResolvedValue([]);
    mockPrisma.workspace.findUnique.mockResolvedValue({ id: 'ws1', name: 'Test' });
    mockPrisma.workspace.count.mockResolvedValue(1);

    // Stateful systemSetting mocks
    mockPrisma.systemSetting.findUnique.mockImplementation(({ where }: any) => {
      const record = settingsStore.get(where.key);
      return Promise.resolve(record ? { key: where.key, value: record } : null);
    });
    mockPrisma.systemSetting.upsert.mockImplementation(({ where, create, update }: any) => {
      const key = where?.key || create?.key;
      const value = update?.value ?? create?.value;
      settingsStore.set(key, value);
      return Promise.resolve({ key, value });
    });

    // Re-set fs mocks (jest.clearAllMocks preserves implementations but be safe)
    const fs = require('fs');
    fs.existsSync.mockReturnValue(true);
    fs.writeFileSync.mockImplementation(() => {});
    fs.statSync.mockReturnValue({ size: 512 });
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    resetMockDefaults();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        BackupService,
        EmailService,
        SystemHealthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    reportService = module.get(ReportService);
    backupService = module.get(BackupService);
    emailService = module.get(EmailService);
    healthService = module.get(SystemHealthService);
  });

  // ===========================================
  // Cross-Service Integration
  // ===========================================

  describe('Admin workflow: health check + report + backup', () => {
    it('should check health before generating a report', async () => {
      const health = await healthService.getHealthStatus();
      expect(health.status).toBeDefined();

      // If healthy, generate a report
      if (health.status === 'healthy' || health.status === 'degraded') {
        const report = await reportService.generateReport({
          workspaceId: 'ws1',
          reportType: 'campaign_summary',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-02-01'),
        });
        expect(report.reportType).toBe('campaign_summary');
      }
    });

    it('should create backup and then generate compliance report', async () => {
      mockPrisma.contact.count.mockResolvedValue(50);
      mockPrisma.conversation.count.mockResolvedValue(20);
      mockPrisma.message.count.mockResolvedValue(200);
      mockPrisma.campaign.count.mockResolvedValue(5);
      mockPrisma.page.count.mockResolvedValue(2);
      mockPrisma.segment.count.mockResolvedValue(3);

      const backup = await backupService.createBackup('ws1');
      expect(backup.status).toBe('completed');

      const report = await reportService.generateReport({
        workspaceId: 'ws1',
        reportType: 'compliance',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-02-09'),
      });
      expect(report.data).toBeDefined();
    });

    it('should configure SMTP and send notification after backup', async () => {
      mockPrisma.contact.count.mockResolvedValue(10);
      mockPrisma.conversation.count.mockResolvedValue(10);
      mockPrisma.message.count.mockResolvedValue(10);
      mockPrisma.campaign.count.mockResolvedValue(10);
      mockPrisma.page.count.mockResolvedValue(10);
      mockPrisma.segment.count.mockResolvedValue(10);

      // Configure SMTP (stores in settingsStore via stateful mock)
      await emailService.configureSmtp('ws1', {
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        user: 'user',
        pass: 'pass',
        fromName: 'System',
        fromEmail: 'noreply@test.com',
      });

      // Create backup
      const backup = await backupService.createBackup('ws1');

      // Send notification (nodemailer is mocked so this succeeds)
      const emailResult = await emailService.sendSystemNotification(
        'ws1',
        'admin@test.com',
        'Backup Completed',
        `Backup ${backup.id} completed with ${Object.values(backup.recordCounts).reduce((a, b) => a + b, 0)} records`,
      );
      expect(emailResult.success).toBe(true);
    });
  });

  // ===========================================
  // Error Handling Integration
  // ===========================================

  describe('Error handling across services', () => {
    it('should handle database errors in report generation gracefully', async () => {
      mockPrisma.campaign.findMany.mockRejectedValue(new Error('Connection refused'));

      await expect(
        reportService.generateReport({
          workspaceId: 'ws1',
          reportType: 'campaign_summary',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-02-01'),
        }),
      ).rejects.toThrow();
    });

    it('should handle email failure without crashing backup workflow', async () => {
      mockPrisma.contact.count.mockResolvedValue(1);
      mockPrisma.conversation.count.mockResolvedValue(1);
      mockPrisma.message.count.mockResolvedValue(1);
      mockPrisma.campaign.count.mockResolvedValue(1);
      mockPrisma.page.count.mockResolvedValue(1);
      mockPrisma.segment.count.mockResolvedValue(1);

      // Backup succeeds
      const backup = await backupService.createBackup('ws1');
      expect(backup.status).toBe('completed');

      // Email fails (no SMTP configured) but shouldn't crash
      const emailResult = await emailService.sendSystemNotification(
        'ws1',
        'admin@test.com',
        'Backup Done',
        'Your backup is ready.',
      );
      expect(emailResult.success).toBe(false);
    });
  });
});
