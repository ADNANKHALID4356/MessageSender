import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { WebhooksService } from './webhooks.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { ContactsService } from '../contacts/contacts.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    disconnect: jest.fn(),
    quit: jest.fn(),
    status: 'ready',
  }));
});

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('WebhooksService', () => {
  let service: WebhooksService;

  const APP_SECRET = 'test_app_secret';
  const VERIFY_TOKEN = 'test_verify_token';

  const mockConfig = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'FACEBOOK_WEBHOOK_VERIFY_TOKEN') return VERIFY_TOKEN;
      if (key === 'FACEBOOK_APP_SECRET') return APP_SECRET;
      if (key === 'REDIS_HOST') return 'localhost';
      if (key === 'REDIS_PORT') return 6379;
      if (key === 'REDIS_PASSWORD') return '';
      if (key === 'REDIS_DB') return 0;
      return defaultValue;
    }),
  };

  const mockPrisma = {
    page: { findFirst: jest.fn(), update: jest.fn() },
    contact: { update: jest.fn(), updateMany: jest.fn() },
    conversation: { update: jest.fn() },
    message: { updateMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    otnToken: { create: jest.fn() },
    recurringSubscription: { upsert: jest.fn(), updateMany: jest.fn() },
    activityLog: { create: jest.fn() },
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockContacts = {
    findByPsidAndPage: jest.fn(),
    create: jest.fn(),
    updateLastInteraction: jest.fn(),
  };

  const mockConversations = {
    findByContactAndPage: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockMessages = {
    processWebhookMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: ContactsService, useValue: mockContacts },
        { provide: ConversationsService, useValue: mockConversations },
        { provide: MessagesService, useValue: mockMessages },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    // Force synchronous processing in tests (bypass BullMQ queue)
    (service as any).webhookQueue = null;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===========================================
  // verifyWebhook
  // ===========================================
  describe('verifyWebhook', () => {
    it('should return challenge when mode and token are valid', () => {
      const result = service.verifyWebhook('subscribe', VERIFY_TOKEN, 'challenge_123');
      expect(result).toBe('challenge_123');
    });

    it('should throw UnauthorizedException for invalid mode', () => {
      expect(() =>
        service.verifyWebhook('invalid', VERIFY_TOKEN, 'challenge'),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid token', () => {
      expect(() =>
        service.verifyWebhook('subscribe', 'wrong_token', 'challenge'),
      ).toThrow(UnauthorizedException);
    });
  });

  // ===========================================
  // verifySignature
  // ===========================================
  describe('verifySignature', () => {
    it('should return true for valid HMAC-SHA256 signature', () => {
      const payload = '{"object":"page","entry":[]}';
      const expectedHash = crypto
        .createHmac('sha256', APP_SECRET)
        .update(payload)
        .digest('hex');
      const signature = `sha256=${expectedHash}`;

      expect(service.verifySignature(signature, payload)).toBe(true);
    });

    it('should return false for invalid signature with matching length', () => {
      // Generate a valid-length but wrong hash
      const payload = 'test_payload';
      const correctHash = crypto
        .createHmac('sha256', APP_SECRET)
        .update(payload)
        .digest('hex');
      // Flip the last character to create a wrong but same-length hash
      const wrongHash = correctHash.slice(0, -1) + (correctHash.slice(-1) === '0' ? '1' : '0');

      const result = service.verifySignature(`sha256=${wrongHash}`, payload);
      expect(result).toBe(false);
    });

    it('should return false for completely invalid hash (length mismatch)', () => {
      // Service now handles length mismatch gracefully without throwing
      const result = service.verifySignature('sha256=short', 'payload');
      expect(result).toBe(false);
    });

    it('should return false for missing signature', () => {
      expect(service.verifySignature('', 'payload')).toBe(false);
    });

    it('should return false for wrong format', () => {
      expect(service.verifySignature('md5=abc', 'payload')).toBe(false);
    });

    it('should use timing-safe comparison (tested via valid/invalid)', () => {
      // A valid signature passes, an almost-valid one fails
      const payload = 'test_payload';
      const correctHash = crypto
        .createHmac('sha256', APP_SECRET)
        .update(payload)
        .digest('hex');

      expect(service.verifySignature(`sha256=${correctHash}`, payload)).toBe(true);

      // Flip one character
      const tamperedHash = correctHash.slice(0, -1) + (correctHash.slice(-1) === '0' ? '1' : '0');
      expect(service.verifySignature(`sha256=${tamperedHash}`, payload)).toBe(false);
    });
  });

  // ===========================================
  // processWebhook
  // ===========================================
  describe('processWebhook', () => {
    it('should skip non-page object types', async () => {
      await service.processWebhook({
        object: 'instagram',
        entry: [],
      });

      // Should not attempt page lookup
      expect(mockPrisma.page.findFirst).not.toHaveBeenCalled();
    });

    it('should process messaging events for known pages', async () => {
      const mockPage = {
        id: 'p-1',
        fbPageId: '12345',
        workspaceId: 'ws-1',
        workspace: { id: 'ws-1' },
      };
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockRedis.get.mockResolvedValue(null); // Not duplicate
      mockRedis.set.mockResolvedValue('OK');
      mockContacts.findByPsidAndPage.mockResolvedValue({ id: 'contact-1' });
      mockContacts.updateLastInteraction.mockResolvedValue({});
      mockConversations.findByContactAndPage.mockResolvedValue({
        id: 'conv-1',
        status: 'OPEN',
      });
      mockMessages.processWebhookMessage.mockResolvedValue({ id: 'msg-1' });
      mockPrisma.conversation.update.mockResolvedValue({});

      await service.processWebhook({
        object: 'page',
        entry: [
          {
            id: '12345',
            time: Date.now(),
            messaging: [
              {
                sender: { id: 'user-123' },
                recipient: { id: '12345' },
                timestamp: Date.now(),
                message: { mid: 'mid.1', text: 'Hello!' },
              },
            ],
          },
        ],
      });

      expect(mockContacts.findByPsidAndPage).toHaveBeenCalled();
      expect(mockMessages.processWebhookMessage).toHaveBeenCalled();
    });

    it('should skip events for unknown pages', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await service.processWebhook({
        object: 'page',
        entry: [
          {
            id: 'unknown-page',
            time: Date.now(),
            messaging: [
              {
                sender: { id: 'user-1' },
                recipient: { id: 'unknown-page' },
                timestamp: Date.now(),
                message: { mid: 'mid.1', text: 'Hi' },
              },
            ],
          },
        ],
      });

      expect(mockContacts.findByPsidAndPage).not.toHaveBeenCalled();
    });

    it('should deduplicate events using Redis', async () => {
      const mockPage = {
        id: 'p-1',
        fbPageId: '12345',
        workspaceId: 'ws-1',
        workspace: { id: 'ws-1' },
      };
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockRedis.get.mockResolvedValue('1'); // Already processed

      await service.processWebhook({
        object: 'page',
        entry: [
          {
            id: '12345',
            time: Date.now(),
            messaging: [
              {
                sender: { id: 'user-123' },
                recipient: { id: '12345' },
                timestamp: Date.now(),
                message: { mid: 'mid.1', text: 'Duplicate' },
              },
            ],
          },
        ],
      });

      // Should NOT process the message
      expect(mockMessages.processWebhookMessage).not.toHaveBeenCalled();
    });

    it('should auto-capture new contacts on incoming message', async () => {
      const mockPage = {
        id: 'p-1',
        fbPageId: '12345',
        workspaceId: 'ws-1',
        workspace: { id: 'ws-1' },
      };
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      mockContacts.findByPsidAndPage.mockResolvedValue(null); // New contact
      mockContacts.create.mockResolvedValue({ id: 'new-contact' });
      mockContacts.updateLastInteraction.mockResolvedValue({});
      mockConversations.findByContactAndPage.mockResolvedValue(null);
      mockConversations.create.mockResolvedValue({ id: 'new-conv', status: 'OPEN' });
      mockMessages.processWebhookMessage.mockResolvedValue({ id: 'msg-1' });
      mockPrisma.conversation.update.mockResolvedValue({});

      await service.processWebhook({
        object: 'page',
        entry: [
          {
            id: '12345',
            time: Date.now(),
            messaging: [
              {
                sender: { id: 'new-user' },
                recipient: { id: '12345' },
                timestamp: Date.now(),
                message: { mid: 'mid.1', text: 'First message!' },
              },
            ],
          },
        ],
      });

      expect(mockContacts.create).toHaveBeenCalledWith('ws-1', expect.objectContaining({
        pageId: 'p-1',
        psid: 'new-user',
      }));
      expect(mockConversations.create).toHaveBeenCalled();
    });

    it('should handle echo messages by updating status', async () => {
      const mockPage = {
        id: 'p-1',
        fbPageId: '12345',
        workspaceId: 'ws-1',
        workspace: { id: 'ws-1' },
      };
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      mockPrisma.message.updateMany.mockResolvedValue({ count: 1 });

      await service.processWebhook({
        object: 'page',
        entry: [
          {
            id: '12345',
            time: Date.now(),
            messaging: [
              {
                sender: { id: '12345' }, // Page is sender (echo)
                recipient: { id: 'user-123' },
                timestamp: Date.now(),
                message: { mid: 'mid.echo', text: 'Replied!', is_echo: true },
              },
            ],
          },
        ],
      });

      expect(mockPrisma.message.updateMany).toHaveBeenCalled();
    });

    it('should handle delivery receipts', async () => {
      const mockPage = {
        id: 'p-1',
        fbPageId: '12345',
        workspaceId: 'ws-1',
        workspace: { id: 'ws-1' },
      };
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      mockPrisma.message.updateMany.mockResolvedValue({ count: 2 });

      await service.processWebhook({
        object: 'page',
        entry: [
          {
            id: '12345',
            time: Date.now(),
            messaging: [
              {
                sender: { id: 'user-123' },
                recipient: { id: '12345' },
                timestamp: Date.now(),
                delivery: { mids: ['mid.1', 'mid.2'], watermark: Date.now() },
              },
            ],
          },
        ],
      });

      expect(mockPrisma.message.updateMany).toHaveBeenCalled();
    });

    it('should handle read receipts', async () => {
      const mockPage = {
        id: 'p-1',
        fbPageId: '12345',
        workspaceId: 'ws-1',
        workspace: { id: 'ws-1' },
      };
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      mockPrisma.message.updateMany.mockResolvedValue({ count: 1 });

      await service.processWebhook({
        object: 'page',
        entry: [
          {
            id: '12345',
            time: Date.now(),
            messaging: [
              {
                sender: { id: 'user-123' },
                recipient: { id: '12345' },
                timestamp: Date.now(),
                read: { watermark: Date.now() },
              },
            ],
          },
        ],
      });

      expect(mockPrisma.message.updateMany).toHaveBeenCalled();
    });

    it('should handle OTN opt-in events', async () => {
      const mockPage = {
        id: 'p-1',
        fbPageId: '12345',
        workspaceId: 'ws-1',
        workspace: { id: 'ws-1' },
      };
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      mockContacts.findByPsidAndPage.mockResolvedValue({ id: 'contact-1' });
      mockPrisma.otnToken.create.mockResolvedValue({});

      await service.processWebhook({
        object: 'page',
        entry: [
          {
            id: '12345',
            time: Date.now(),
            messaging: [
              {
                sender: { id: 'user-123' },
                recipient: { id: '12345' },
                timestamp: Date.now(),
                optin: {
                  one_time_notif_token: 'otn-token-123',
                  payload: 'promo-topic',
                },
              },
            ],
          },
        ],
      });

      expect(mockPrisma.otnToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contactId: 'contact-1',
          token: 'otn-token-123',
        }),
      });
    });

    it('should handle policy enforcement block event', async () => {
      const mockPage = {
        id: 'p-1',
        fbPageId: '12345',
        workspaceId: 'ws-1',
        workspace: { id: 'ws-1' },
      };
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      mockPrisma.page.update.mockResolvedValue({});
      mockPrisma.activityLog.create.mockResolvedValue({});

      await service.processWebhook({
        object: 'page',
        entry: [
          {
            id: '12345',
            time: Date.now(),
            messaging: [
              {
                sender: { id: 'user-123' },
                recipient: { id: '12345' },
                timestamp: Date.now(),
                'policy-enforcement': { action: 'block', reason: 'Spam detected' },
              },
            ],
          },
        ],
      });

      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: { isActive: false, tokenError: 'Policy blocked: Spam detected' },
      });
      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'policy_enforcement',
          entityType: 'page',
        }),
      });
    });

    it('should handle policy enforcement unblock event', async () => {
      const mockPage = {
        id: 'p-1',
        fbPageId: '12345',
        workspaceId: 'ws-1',
        workspace: { id: 'ws-1' },
      };
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      mockPrisma.page.update.mockResolvedValue({});
      mockPrisma.activityLog.create.mockResolvedValue({});

      await service.processWebhook({
        object: 'page',
        entry: [
          {
            id: '12345',
            time: Date.now(),
            messaging: [
              {
                sender: { id: 'user-123' },
                recipient: { id: '12345' },
                timestamp: Date.now(),
                'policy-enforcement': { action: 'unblock' },
              },
            ],
          },
        ],
      });

      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: { isActive: true, tokenError: null },
      });
    });

    it('should handle pass_thread_control event', async () => {
      const mockPage = {
        id: 'p-1',
        fbPageId: '12345',
        workspaceId: 'ws-1',
        workspace: { id: 'ws-1' },
      };
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      mockPrisma.activityLog.create.mockResolvedValue({});

      await service.processWebhook({
        object: 'page',
        entry: [
          {
            id: '12345',
            time: Date.now(),
            messaging: [
              {
                sender: { id: 'user-123' },
                recipient: { id: '12345' },
                timestamp: Date.now(),
                pass_thread_control: {
                  new_owner_app_id: 456,
                  metadata: 'handover-data',
                },
              },
            ],
          },
        ],
      });

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'pass_thread_control',
          entityType: 'page',
          entityId: 'p-1',
        }),
      });
    });

    it('should handle take_thread_control event', async () => {
      const mockPage = {
        id: 'p-1',
        fbPageId: '12345',
        workspaceId: 'ws-1',
        workspace: { id: 'ws-1' },
      };
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      mockPrisma.activityLog.create.mockResolvedValue({});

      await service.processWebhook({
        object: 'page',
        entry: [
          {
            id: '12345',
            time: Date.now(),
            messaging: [
              {
                sender: { id: 'user-123' },
                recipient: { id: '12345' },
                timestamp: Date.now(),
                take_thread_control: {
                  previous_owner_app_id: 789,
                  metadata: 'reclaim',
                },
              },
            ],
          },
        ],
      });

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'take_thread_control',
          details: expect.objectContaining({
            previousOwnerAppId: 789,
          }),
        }),
      });
    });

    it('should handle reaction events and store in message content', async () => {
      const mockPage = {
        id: 'p-1',
        fbPageId: '12345',
        workspaceId: 'ws-1',
        workspace: { id: 'ws-1' },
      };
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      mockPrisma.message.findUnique.mockResolvedValue({
        id: 'msg-1',
        content: { text: 'Hello' },
      });
      mockPrisma.message.update.mockResolvedValue({});

      await service.processWebhook({
        object: 'page',
        entry: [
          {
            id: '12345',
            time: Date.now(),
            messaging: [
              {
                sender: { id: 'user-123' },
                recipient: { id: '12345' },
                timestamp: Date.now(),
                reaction: {
                  mid: 'mid-123',
                  action: 'react',
                  reaction: 'love',
                  emoji: '❤️',
                },
              },
            ],
          },
        ],
      });

      expect(mockPrisma.message.findUnique).toHaveBeenCalledWith({
        where: { fbMessageId: 'mid-123' },
      });
      expect(mockPrisma.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-1' },
        data: {
          content: expect.objectContaining({
            text: 'Hello',
            reactions: { 'user-123': 'love' },
          }),
        },
      });
    });

    it('should handle unreact and remove reaction', async () => {
      const mockPage = {
        id: 'p-1',
        fbPageId: '12345',
        workspaceId: 'ws-1',
        workspace: { id: 'ws-1' },
      };
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      mockPrisma.message.findUnique.mockResolvedValue({
        id: 'msg-1',
        content: { text: 'Hello', reactions: { 'user-123': 'love' } },
      });
      mockPrisma.message.update.mockResolvedValue({});

      await service.processWebhook({
        object: 'page',
        entry: [
          {
            id: '12345',
            time: Date.now(),
            messaging: [
              {
                sender: { id: 'user-123' },
                recipient: { id: '12345' },
                timestamp: Date.now(),
                reaction: {
                  mid: 'mid-123',
                  action: 'unreact',
                  reaction: 'love',
                  emoji: '❤️',
                },
              },
            ],
          },
        ],
      });

      expect(mockPrisma.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-1' },
        data: {
          content: expect.objectContaining({
            text: 'Hello',
            reactions: {},
          }),
        },
      });
    });
  });
});
