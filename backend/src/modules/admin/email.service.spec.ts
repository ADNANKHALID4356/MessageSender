import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-msg-id-123' }),
  }),
}));

// =============================================
// Email Service - Unit Tests  
// =============================================

describe('EmailService', () => {
  let service: EmailService;
  const smtpStore = new Map<string, any>();

  const mockPrisma = {
    systemSetting: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    smtpStore.clear();
    jest.clearAllMocks();

    mockPrisma.systemSetting.findUnique.mockImplementation(({ where }: any) => {
      const val = smtpStore.get(where.key);
      return Promise.resolve(val !== undefined ? { key: where.key, value: val } : null);
    });
    mockPrisma.systemSetting.upsert.mockImplementation(({ where, create, update }: any) => {
      const val = smtpStore.has(where.key) ? update.value : create.value;
      smtpStore.set(where.key, val);
      return Promise.resolve({ key: where.key, value: val });
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  describe('configureSmtp', () => {
    it('should store SMTP configuration', async () => {
      const config = {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        user: 'user@test.com',
        pass: 'password123',
        fromName: 'Test App',
        fromEmail: 'noreply@test.com',
      };

      const result = await service.configureSmtp('ws1', config);
      expect(result.success).toBe(true);

      const stored = await service.getSmtpConfig('ws1');
      expect(stored).toEqual(config);
    });
  });

  describe('getSmtpConfig', () => {
    it('should return null for unconfigured workspace', async () => {
      expect(await service.getSmtpConfig('unknown')).toBeNull();
    });
  });

  describe('testSmtpConnection', () => {
    it('should fail when SMTP is not configured', async () => {
      const result = await service.testSmtpConnection('ws1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('should fail with incomplete config', async () => {
      await service.configureSmtp('ws1', {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        user: '',
        pass: '',
        fromName: 'Test',
        fromEmail: 'test@test.com',
      });

      const result = await service.testSmtpConnection('ws1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Incomplete');
    });

    it('should succeed with complete config', async () => {
      await service.configureSmtp('ws1', {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        user: 'user@test.com',
        pass: 'password',
        fromName: 'Test',
        fromEmail: 'test@test.com',
      });

      const result = await service.testSmtpConnection('ws1');
      expect(result.success).toBe(true);
    });
  });

  describe('sendEmail', () => {
    it('should fail when SMTP not configured', async () => {
      const result = await service.sendEmail('ws1', {
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      expect(result.success).toBe(false);
    });

    it('should send email with configured SMTP', async () => {
      await service.configureSmtp('ws1', {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        user: 'user@test.com',
        pass: 'password',
        fromName: 'Test',
        fromEmail: 'test@test.com',
      });

      const result = await service.sendEmail('ws1', {
        to: 'recipient@test.com',
        subject: 'Test Subject',
        html: '<p>Hello</p>',
      });
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });
  });

  describe('sendInvitation', () => {
    it('should send invitation email', async () => {
      await service.configureSmtp('ws1', {
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        user: 'u',
        pass: 'p',
        fromName: 'Test',
        fromEmail: 'noreply@test.com',
      });

      const result = await service.sendInvitation(
        'ws1',
        'invitee@test.com',
        'John',
        'My Workspace',
        'OPERATOR',
      );
      expect(result.success).toBe(true);
    });
  });

  describe('sendPasswordReset', () => {
    it('should send password reset email', async () => {
      await service.configureSmtp('ws1', {
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        user: 'u',
        pass: 'p',
        fromName: 'Test',
        fromEmail: 'noreply@test.com',
      });

      const result = await service.sendPasswordReset('ws1', 'user@test.com', 'reset-token-123');
      expect(result.success).toBe(true);
    });
  });

  describe('sendSystemNotification', () => {
    it('should send system notification email', async () => {
      await service.configureSmtp('ws1', {
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        user: 'u',
        pass: 'p',
        fromName: 'Test',
        fromEmail: 'noreply@test.com',
      });

      const result = await service.sendSystemNotification(
        'ws1',
        'admin@test.com',
        'Backup Complete',
        'Your backup has completed successfully.',
      );
      expect(result.success).toBe(true);
    });
  });
});
