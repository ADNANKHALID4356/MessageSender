import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsService } from './conversations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConversationStatus } from './dto';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let prisma: PrismaService;

  const mockWorkspaceId = 'workspace-123';
  const mockUserId = 'user-123';
  const mockConversationId = 'conversation-123';
  const mockContactId = 'contact-123';
  const mockPageId = 'page-123';

  const mockConversation = {
    id: mockConversationId,
    workspaceId: mockWorkspaceId,
    contactId: mockContactId,
    pageId: mockPageId,
    status: 'OPEN',
    assignedToUserId: null,
    unreadCount: 2,
    lastMessageAt: new Date(),
    lastMessagePreview: 'Hello!',
    notes: null,
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    contact: {
      id: mockContactId,
      fullName: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      profilePictureUrl: null,
      engagementLevel: 'WARM',
    },
    page: {
      id: mockPageId,
      name: 'Test Page',
      profilePictureUrl: null,
    },
    assignedTo: null,
    _count: { messages: 5 },
  };

  const mockContact = {
    id: mockContactId,
    workspaceId: mockWorkspaceId,
    pageId: mockPageId,
    fullName: 'John Doe',
  };

  const mockPrismaService = {
    conversation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    contact: {
      findFirst: jest.fn(),
    },
    workspaceUserAccess: {
      findFirst: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated conversations', async () => {
      mockPrismaService.conversation.findMany.mockResolvedValue([mockConversation]);
      mockPrismaService.conversation.count.mockResolvedValue(1);

      const result = await service.findAll(mockWorkspaceId, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should filter by status', async () => {
      mockPrismaService.conversation.findMany.mockResolvedValue([]);
      mockPrismaService.conversation.count.mockResolvedValue(0);

      await service.findAll(mockWorkspaceId, { status: ConversationStatus.OPEN });

      expect(mockPrismaService.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ConversationStatus.OPEN,
          }),
        }),
      );
    });

    it('should filter by unread only', async () => {
      mockPrismaService.conversation.findMany.mockResolvedValue([]);
      mockPrismaService.conversation.count.mockResolvedValue(0);

      await service.findAll(mockWorkspaceId, { unreadOnly: true });

      expect(mockPrismaService.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            unreadCount: { gt: 0 },
          }),
        }),
      );
    });

    it('should search by contact name', async () => {
      mockPrismaService.conversation.findMany.mockResolvedValue([]);
      mockPrismaService.conversation.count.mockResolvedValue(0);

      await service.findAll(mockWorkspaceId, { search: 'John' });

      expect(mockPrismaService.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contact: expect.objectContaining({
              OR: expect.any(Array),
            }),
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return conversation with messages', async () => {
      const conversationWithMessages = {
        ...mockConversation,
        messages: [
          { id: 'msg-1', content: { text: 'Hello' }, createdAt: new Date() },
        ],
      };
      mockPrismaService.conversation.findFirst.mockResolvedValue(
        conversationWithMessages,
      );

      const result = await service.findById(mockWorkspaceId, mockConversationId);

      expect(result.id).toBe(mockConversationId);
      expect(result.messages).toBeDefined();
    });

    it('should throw NotFoundException if conversation not found', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue(null);

      await expect(
        service.findById(mockWorkspaceId, 'invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new conversation', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValue(mockContact);
      mockPrismaService.conversation.findFirst.mockResolvedValue(null);
      mockPrismaService.conversation.create.mockResolvedValue(mockConversation);

      const result = await service.create(mockWorkspaceId, {
        contactId: mockContactId,
      });

      expect(mockPrismaService.conversation.create).toHaveBeenCalled();
      expect(result.id).toBe(mockConversationId);
    });

    it('should return existing open conversation', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValue(mockContact);
      mockPrismaService.conversation.findFirst.mockResolvedValue(mockConversation);

      const result = await service.create(mockWorkspaceId, {
        contactId: mockContactId,
      });

      expect(mockPrismaService.conversation.create).not.toHaveBeenCalled();
      expect(result.id).toBe(mockConversationId);
    });

    it('should throw NotFoundException if contact not found', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockWorkspaceId, { contactId: 'invalid-id' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update conversation status', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue(mockConversation);
      mockPrismaService.conversation.update.mockResolvedValue({
        ...mockConversation,
        status: ConversationStatus.RESOLVED,
      });

      const result = await service.update(mockWorkspaceId, mockConversationId, {
        status: ConversationStatus.RESOLVED,
      });

      expect(result.status).toBe(ConversationStatus.RESOLVED);
    });

    it('should throw NotFoundException if conversation not found', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockWorkspaceId, 'invalid-id', { status: ConversationStatus.RESOLVED }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate user has workspace access when assigning', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue(mockConversation);
      mockPrismaService.workspaceUserAccess.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockWorkspaceId, mockConversationId, {
          assignedToUserId: mockUserId,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('assign', () => {
    it('should assign conversation to user', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue(mockConversation);
      mockPrismaService.workspaceUserAccess.findFirst.mockResolvedValue({
        userId: mockUserId,
        workspaceId: mockWorkspaceId,
      });
      mockPrismaService.conversation.update.mockResolvedValue({
        ...mockConversation,
        assignedToUserId: mockUserId,
        assignedTo: { id: mockUserId, firstName: 'Test', lastName: 'User' },
      });

      const result = await service.assign(
        mockWorkspaceId,
        mockConversationId,
        mockUserId,
      );

      expect(result.assignedToUserId).toBe(mockUserId);
    });
  });

  describe('unassign', () => {
    it('should unassign conversation', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue(mockConversation);
      mockPrismaService.conversation.update.mockResolvedValue({
        ...mockConversation,
        assignedToUserId: null,
        assignedTo: null,
      });

      const result = await service.unassign(mockWorkspaceId, mockConversationId);

      expect(result.assignedToUserId).toBeNull();
    });
  });

  describe('markAsRead', () => {
    it('should set unread count to zero', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue(mockConversation);
      mockPrismaService.conversation.update.mockResolvedValue({
        ...mockConversation,
        unreadCount: 0,
      });

      const result = await service.markAsRead(mockWorkspaceId, mockConversationId);

      expect(result.unreadCount).toBe(0);
    });
  });

  describe('bulkUpdate', () => {
    it('should bulk update conversations', async () => {
      mockPrismaService.conversation.findMany.mockResolvedValue([
        mockConversation,
      ]);
      mockPrismaService.conversation.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.bulkUpdate(mockWorkspaceId, {
        conversationIds: [mockConversationId],
        status: ConversationStatus.RESOLVED,
      });

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(1);
    });

    it('should throw BadRequestException if some conversations not found', async () => {
      mockPrismaService.conversation.findMany.mockResolvedValue([]);

      await expect(
        service.bulkUpdate(mockWorkspaceId, {
          conversationIds: [mockConversationId],
          status: ConversationStatus.RESOLVED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStats', () => {
    it('should return conversation statistics', async () => {
      mockPrismaService.conversation.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(40) // open
        .mockResolvedValueOnce(30) // pending
        .mockResolvedValueOnce(30) // resolved
        .mockResolvedValueOnce(15) // unread
        .mockResolvedValueOnce(5); // today
      mockPrismaService.$queryRaw.mockResolvedValue([{ avg_minutes: 10 }]);

      const result = await service.getStats(mockWorkspaceId);

      expect(result.totalConversations).toBe(100);
      expect(result.openConversations).toBe(40);
      expect(result.pendingConversations).toBe(30);
      expect(result.resolvedConversations).toBe(30);
      expect(result.unreadConversations).toBe(15);
      expect(result.averageResponseTimeMinutes).toBe(10);
    });
  });

  describe('getMyConversations', () => {
    it('should return conversations assigned to user', async () => {
      mockPrismaService.conversation.findMany.mockResolvedValue([
        { ...mockConversation, assignedToUserId: mockUserId },
      ]);
      mockPrismaService.conversation.count.mockResolvedValue(1);

      const result = await service.getMyConversations(mockWorkspaceId, mockUserId);

      expect(result.data).toHaveLength(1);
      expect(mockPrismaService.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedToUserId: mockUserId,
          }),
        }),
      );
    });
  });
});
