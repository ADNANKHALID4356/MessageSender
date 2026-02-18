import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ConversationListQueryDto,
  UpdateConversationDto,
  BulkUpdateConversationsDto,
  CreateConversationDto,
  ConversationStatus,
} from './dto';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get conversations for workspace (Inbox view)
   */
  async findAll(workspaceId: string, query: ConversationListQueryDto) {
    const {
      page = 1,
      limit = 20,
      status,
      pageId,
      assignedToUserId,
      unreadOnly,
      search,
      sortBy = 'lastMessageAt',
      sortOrder = 'desc',
    } = query;

    const where: Record<string, unknown> = { workspaceId };

    // Filters
    if (status) where.status = status;
    if (pageId) where.pageId = pageId;
    if (assignedToUserId) where.assignedToUserId = assignedToUserId;
    if (unreadOnly) where.unreadCount = { gt: 0 };

    // Search by contact name
    if (search) {
      where.contact = {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: {
          contact: {
            select: {
              id: true,
              fullName: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
              engagementLevel: true,
            },
          },
          page: {
            select: {
              id: true,
              name: true,
              profilePictureUrl: true,
            },
          },
          assignedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return {
      data: conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get conversation by ID with messages
   */
  async findById(workspaceId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, workspaceId },
      include: {
        contact: {
          include: {
            tags: { include: { tag: true } },
          },
        },
        page: {
          select: {
            id: true,
            name: true,
            profilePictureUrl: true,
          },
        },
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        messages: {
          take: 50,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Reverse messages to get chronological order
    conversation.messages.reverse();

    return conversation;
  }

  /**
   * Find conversation by contact and page (for webhooks)
   */
  async findByContactAndPage(
    workspaceId: string,
    contactId: string,
    pageId: string,
  ) {
    return this.prisma.conversation.findFirst({
      where: {
        workspaceId,
        contactId,
        pageId,
        status: { not: ConversationStatus.RESOLVED },
      },
      include: {
        contact: {
          select: {
            id: true,
            fullName: true,
            profilePictureUrl: true,
          },
        },
        page: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Create a new conversation
   */
  async create(workspaceId: string, dto: CreateConversationDto) {
    // Verify contact belongs to workspace
    const contact = await this.prisma.contact.findFirst({
      where: { id: dto.contactId, workspaceId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // Check for existing open conversation
    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        contactId: dto.contactId,
        pageId: dto.pageId || contact.pageId,
        status: { not: ConversationStatus.RESOLVED },
      },
    });

    if (existingConversation) {
      return existingConversation;
    }

    return this.prisma.conversation.create({
      data: {
        workspaceId,
        contactId: dto.contactId,
        pageId: dto.pageId || contact.pageId,
        status: ConversationStatus.OPEN,
        assignedToUserId: dto.assignedToUserId,
      },
      include: {
        contact: {
          select: {
            id: true,
            fullName: true,
            profilePictureUrl: true,
          },
        },
        page: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Update conversation status/assignment
   */
  async update(workspaceId: string, id: string, dto: UpdateConversationDto) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, workspaceId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // If assigning to user, verify user has workspace access
    if (dto.assignedToUserId) {
      const userAccess = await this.prisma.workspaceUserAccess.findFirst({
        where: {
          workspaceId,
          userId: dto.assignedToUserId,
        },
      });

      if (!userAccess) {
        throw new BadRequestException('User does not have access to this workspace');
      }
    }

    return this.prisma.conversation.update({
      where: { id },
      data: {
        status: dto.status,
        assignedToUserId: dto.assignedToUserId,
      },
      include: {
        contact: {
          select: {
            id: true,
            fullName: true,
            profilePictureUrl: true,
          },
        },
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Assign conversation to user
   */
  async assign(workspaceId: string, id: string, userId: string) {
    return this.update(workspaceId, id, { assignedToUserId: userId });
  }

  /**
   * Unassign conversation
   */
  async unassign(workspaceId: string, id: string) {
    return this.update(workspaceId, id, { assignedToUserId: null });
  }

  /**
   * Mark conversation as read
   */
  async markAsRead(workspaceId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, workspaceId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.prisma.conversation.update({
      where: { id },
      data: { unreadCount: 0 },
    });
  }

  /**
   * Bulk update conversations
   */
  async bulkUpdate(workspaceId: string, dto: BulkUpdateConversationsDto) {
    const { conversationIds, status, assignedToUserId } = dto;

    // Verify conversations belong to workspace
    const conversations = await this.prisma.conversation.findMany({
      where: { id: { in: conversationIds }, workspaceId },
      select: { id: true },
    });

    if (conversations.length !== conversationIds.length) {
      throw new BadRequestException('Some conversations not found in workspace');
    }

    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      if (status === ConversationStatus.RESOLVED) {
        updateData.resolvedAt = new Date();
      }
    }
    if (assignedToUserId !== undefined) {
      updateData.assignedToUserId = assignedToUserId;
    }

    await this.prisma.conversation.updateMany({
      where: { id: { in: conversationIds } },
      data: updateData,
    });

    return { success: true, updatedCount: conversationIds.length };
  }

  /**
   * Get conversation statistics for workspace
   */
  async getStats(workspaceId: string) {
    const [
      totalConversations,
      openConversations,
      pendingConversations,
      resolvedConversations,
      unreadConversations,
      todayConversations,
    ] = await Promise.all([
      this.prisma.conversation.count({ where: { workspaceId } }),
      this.prisma.conversation.count({
        where: { workspaceId, status: ConversationStatus.OPEN },
      }),
      this.prisma.conversation.count({
        where: { workspaceId, status: ConversationStatus.PENDING },
      }),
      this.prisma.conversation.count({
        where: { workspaceId, status: ConversationStatus.RESOLVED },
      }),
      this.prisma.conversation.count({
        where: { workspaceId, unreadCount: { gt: 0 } },
      }),
      this.prisma.conversation.count({
        where: {
          workspaceId,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    // Average response time (last 7 days)
    const avgResponseTime = await this.prisma.$queryRaw<
      [{ avg_minutes: number }]
    >`
      SELECT AVG(
        EXTRACT(EPOCH FROM (m_out.created_at - m_in.created_at)) / 60
      )::int as avg_minutes
      FROM messages m_in
      JOIN messages m_out ON m_in.conversation_id = m_out.conversation_id
      JOIN conversations c ON m_in.conversation_id = c.id
      WHERE c.workspace_id = ${workspaceId}
        AND m_in.direction = 'INBOUND'
        AND m_out.direction = 'OUTBOUND'
        AND m_out.created_at > m_in.created_at
        AND m_in.created_at >= NOW() - INTERVAL '7 days'
    `;

    return {
      totalConversations,
      openConversations,
      pendingConversations,
      resolvedConversations,
      unreadConversations,
      todayConversations,
      averageResponseTimeMinutes: avgResponseTime[0]?.avg_minutes || 0,
    };
  }

  /**
   * Get user's assigned conversations
   */
  async getMyConversations(workspaceId: string, userId: string) {
    return this.findAll(workspaceId, {
      assignedToUserId: userId,
      sortBy: 'lastMessageAt',
      sortOrder: 'desc',
    });
  }
}
