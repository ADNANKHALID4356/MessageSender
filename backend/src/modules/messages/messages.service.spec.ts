import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from './messages.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ContactsService } from '../contacts/contacts.service';
import { SendApiService } from './send-api.service';
import { RateLimitService } from './rate-limit.service';
import { NotFoundException } from '@nestjs/common';
import { MessageType } from './dto';

describe('MessagesService', () => {
  let service: MessagesService;
  let prisma: PrismaService;
  let contactsService: ContactsService;

  const mockWorkspaceId = 'workspace-123';
  const mockUserId = 'user-123';
  const mockConversationId = 'conversation-123';
  const mockContactId = 'contact-123';
  const mockPageId = 'page-123';
  const mockMessageId = 'message-123';

  const mockConversation = {
    id: mockConversationId,
    workspaceId: mockWorkspaceId,
    contactId: mockContactId,
    pageId: mockPageId,
    status: 'OPEN',
    contact: {
      id: mockContactId,
      fullName: 'John Doe',
    },
    page: {
      id: mockPageId,
      name: 'Test Page',
    },
  };

  const mockMessage = {
    id: mockMessageId,
    conversationId: mockConversationId,
    contactId: mockContactId,
    pageId: mockPageId,
    direction: 'OUTBOUND',
    messageType: 'TEXT',
    content: { text: 'Hello!' },
    status: 'SENT',
    sentById: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockContact = {
    id: mockContactId,
    workspaceId: mockWorkspaceId,
    pageId: mockPageId,
    psid: 'psid-123',
    fullName: 'John Doe',
    page: { id: mockPageId, name: 'Test Page' },
  };

  const mockPage = {
    id: mockPageId,
    workspaceId: mockWorkspaceId,
    facebookPageId: 'fb-page-123',
    name: 'Test Page',
  };

  const mockPrismaService = {
    conversation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    contact: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    page: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockContactsService = {
    updateInteraction: jest.fn(),
    findByPsid: jest.fn(),
  };

  const mockSendApiService = {
    sendMessage: jest.fn().mockResolvedValue({ success: true, messageId: 'mid.facebook123' }),
    sendTextMessage: jest.fn(),
    sendAttachmentMessage: jest.fn(),
    sendTemplateMessage: jest.fn(),
    sendQuickReplies: jest.fn(),
  };

  const mockRateLimitService = {
    checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
    consumeMessageQuota: jest.fn().mockResolvedValue({ allowed: true }),
    recordRequest: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ContactsService, useValue: mockContactsService },
        { provide: SendApiService, useValue: mockSendApiService },
        { provide: RateLimitService, useValue: mockRateLimitService },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    prisma = module.get<PrismaService>(PrismaService);
    contactsService = module.get<ContactsService>(ContactsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessage', () => {
    const sendDto = {
      conversationId: mockConversationId,
      messageType: MessageType.TEXT,
      content: { text: 'Hello!' },
    };

    it('should send a message successfully', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue(mockConversation);
      mockPrismaService.message.create.mockResolvedValue(mockMessage);
      mockPrismaService.conversation.update.mockResolvedValue(mockConversation);
      mockPrismaService.message.update.mockResolvedValue({
        ...mockMessage,
        sentBy: { id: mockUserId, firstName: 'Test', lastName: 'User' },
      });

      const result = await service.sendMessage(mockWorkspaceId, mockUserId, sendDto);

      expect(mockPrismaService.message.create).toHaveBeenCalled();
      expect(mockContactsService.updateInteraction).toHaveBeenCalledWith(
        mockContactId,
        'outbound',
      );
      expect(result.status).toBe('SENT');
    });

    it('should throw NotFoundException if conversation not found', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue(null);

      await expect(
        service.sendMessage(mockWorkspaceId, mockUserId, sendDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('sendQuickMessage', () => {
    const quickDto = {
      contactId: mockContactId,
      text: 'Quick hello!',
    };

    it('should send quick message and create conversation if needed', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValue(mockContact);
      mockPrismaService.conversation.findFirst
        .mockResolvedValueOnce(null) // First call: no existing conversation
        .mockResolvedValueOnce(mockConversation); // Second call in sendMessage: finds the created conversation
      mockPrismaService.conversation.create.mockResolvedValue(mockConversation);
      mockPrismaService.message.create.mockResolvedValue(mockMessage);
      mockPrismaService.conversation.update.mockResolvedValue(mockConversation);
      mockPrismaService.message.update.mockResolvedValue(mockMessage);

      const result = await service.sendQuickMessage(mockWorkspaceId, mockUserId, quickDto);

      expect(mockPrismaService.conversation.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if contact not found', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValue(null);

      await expect(
        service.sendQuickMessage(mockWorkspaceId, mockUserId, quickDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMessages', () => {
    const query = {
      conversationId: mockConversationId,
      page: 1,
      limit: 50,
    };

    it('should return paginated messages', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue(mockConversation);
      mockPrismaService.message.findMany.mockResolvedValue([mockMessage]);
      mockPrismaService.message.count.mockResolvedValue(1);

      const result = await service.getMessages(mockWorkspaceId, query);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should throw NotFoundException if conversation not found', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue(null);

      await expect(service.getMessages(mockWorkspaceId, query)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getContactMessages', () => {
    it('should return messages for a contact', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValue(mockContact);
      mockPrismaService.message.findMany.mockResolvedValue([mockMessage]);
      mockPrismaService.message.count.mockResolvedValue(1);

      const result = await service.getContactMessages(mockWorkspaceId, mockContactId, {});

      expect(result.data).toHaveLength(1);
    });

    it('should throw NotFoundException if contact not found', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValue(null);

      await expect(
        service.getContactMessages(mockWorkspaceId, 'invalid-id', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('handleIncomingMessage', () => {
    const incomingDto = {
      pageId: 'fb-page-123',
      psid: 'psid-456',
      mid: 'mid-123',
      messageType: MessageType.TEXT,
      content: { text: 'Hi there!' },
      timestamp: Date.now(),
    };

    it('should handle incoming message and create contact if needed', async () => {
      mockPrismaService.page.findFirst.mockResolvedValue(mockPage);
      mockContactsService.findByPsid.mockResolvedValue(null);
      mockPrismaService.contact.create.mockResolvedValue(mockContact);
      mockPrismaService.conversation.findFirst.mockResolvedValue(null);
      mockPrismaService.conversation.create.mockResolvedValue(mockConversation);
      mockPrismaService.message.create.mockResolvedValue(mockMessage);
      mockPrismaService.conversation.update.mockResolvedValue(mockConversation);

      const result = await service.handleIncomingMessage(incomingDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.contact.create).toHaveBeenCalled();
    });

    it('should return null if page not found', async () => {
      mockPrismaService.page.findFirst.mockResolvedValue(null);

      const result = await service.handleIncomingMessage(incomingDto);

      expect(result).toBeNull();
    });
  });

  describe('markAsDelivered', () => {
    it('should update message status to delivered', async () => {
      mockPrismaService.message.updateMany.mockResolvedValue({ count: 1 });

      await service.markAsDelivered('external-id-123');

      expect(mockPrismaService.message.updateMany).toHaveBeenCalledWith({
        where: { fbMessageId: 'external-id-123' },
        data: expect.objectContaining({
          status: 'DELIVERED',
        }),
      });
    });
  });

  describe('markAsRead', () => {
    it('should update message status to read', async () => {
      mockPrismaService.message.updateMany.mockResolvedValue({ count: 1 });

      await service.markAsRead('external-id-123');

      expect(mockPrismaService.message.updateMany).toHaveBeenCalledWith({
        where: { fbMessageId: 'external-id-123' },
        data: expect.objectContaining({
          status: 'READ',
        }),
      });
    });
  });

  describe('findById', () => {
    it('should return message by ID', async () => {
      mockPrismaService.message.findFirst.mockResolvedValue({
        ...mockMessage,
        conversation: { workspaceId: mockWorkspaceId },
        contact: { id: mockContactId, fullName: 'John Doe' },
      });

      const result = await service.findById(mockWorkspaceId, mockMessageId);

      expect(result.id).toBe(mockMessageId);
    });

    it('should throw NotFoundException if message not found', async () => {
      mockPrismaService.message.findFirst.mockResolvedValue(null);

      await expect(service.findById(mockWorkspaceId, 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if message belongs to different workspace', async () => {
      mockPrismaService.message.findFirst.mockResolvedValue({
        ...mockMessage,
        conversation: { workspaceId: 'different-workspace' },
      });

      await expect(
        service.findById(mockWorkspaceId, mockMessageId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('should return message statistics', async () => {
      mockPrismaService.message.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(40) // inbound
        .mockResolvedValueOnce(60); // outbound
      mockPrismaService.$queryRaw.mockResolvedValue([
        { date: new Date(), count: 10 },
      ]);

      const result = await service.getStats(mockWorkspaceId, 30);

      expect(result.totalMessages).toBe(100);
      expect(result.inboundMessages).toBe(40);
      expect(result.outboundMessages).toBe(60);
      expect(result.responseRate).toBe(150); // 60/40 * 100
    });
  });
});
