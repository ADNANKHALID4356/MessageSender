import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ContactsService } from '../contacts/contacts.service';
import { SendApiService } from './send-api.service';
import { RateLimitService } from './rate-limit.service';
import {
  SendMessageDto,
  SendQuickMessageDto,
  MessageListQueryDto,
  ContactMessagesQueryDto,
  IncomingWebhookMessageDto,
  MessageDirection,
  MessageStatus,
} from './dto';
import {
  MessageType,
  MessageType as PrismaMessageType,
  MessageStatus as PrismaMessageStatus,
} from '@prisma/client';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private prisma: PrismaService,
    private contactsService: ContactsService,
    private sendApiService: SendApiService,
    private rateLimitService: RateLimitService,
  ) {}

  /**
   * Send a message in an existing conversation
   */
  async sendMessage(workspaceId: string, userId: string, dto: SendMessageDto) {
    // Verify conversation belongs to workspace
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: dto.conversationId, workspaceId },
      include: {
        contact: true,
        page: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check rate limits
    const rateLimitResult = await this.rateLimitService.consumeMessageQuota(
      conversation.pageId,
      workspaceId,
      conversation.contactId,
    );

    if (!rateLimitResult.allowed) {
      throw new BadRequestException(rateLimitResult.reason || 'Rate limit exceeded');
    }

    // Create message
    const message = await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        contactId: conversation.contactId,
        pageId: conversation.pageId,
        direction: MessageDirection.OUTBOUND,
        messageType: dto.messageType || MessageType.TEXT,
        content: dto.content as any,
        status: MessageStatus.PENDING,
      },
    });

    // Update conversation
    const messagePreview =
      dto.content.text?.substring(0, 100) || `[${dto.messageType}]`;

    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: messagePreview,
        status: 'OPEN',
      },
    });

    // Update contact interaction
    await this.contactsService.updateInteraction(
      conversation.contactId,
      'outbound',
    );

    // Send via Facebook Send API
    try {
      const sendResult = await this.sendApiService.sendMessage({
        contactId: conversation.contactId,
        pageId: conversation.pageId,
        workspaceId,
        messageType: dto.messageType || MessageType.TEXT,
        content: {
          text: dto.content.text,
          attachmentUrl: dto.content.attachmentUrl,
          attachmentType: dto.content.attachmentType,
          quickReplies: dto.content.quickReplies as any,
        },
        bypassMethod: dto.bypassMethod,
        messageTag: dto.messageTag as any,
        otnTokenId: dto.otnTokenId,
        recurringSubscriptionId: dto.subscriptionId,
      });

      if (sendResult.success) {
        // Update message with Facebook message ID
        const sentMessage = await this.prisma.message.update({
          where: { id: message.id },
          data: {
            status: MessageStatus.SENT,
            sentAt: new Date(),
            fbMessageId: sendResult.fbMessageId,
            bypassMethod: sendResult.bypassMethodUsed || null,
          },
        });
        return sentMessage;
      } else {
        // Mark as failed
        const failedMessage = await this.prisma.message.update({
          where: { id: message.id },
          data: {
            status: MessageStatus.FAILED,
            errorMessage: sendResult.error,
          },
        });
        throw new BadRequestException(sendResult.error || 'Failed to send message');
      }
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`);
      await this.prisma.message.update({
        where: { id: message.id },
        data: {
          status: MessageStatus.FAILED,
          errorMessage: error.message,
        },
      });
      throw error;
    }
  }

  /**
   * Send a quick message to a contact (creates conversation if needed)
   */
  async sendQuickMessage(
    workspaceId: string,
    userId: string,
    dto: SendQuickMessageDto,
  ) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: dto.contactId, workspaceId },
      include: { page: true },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // Find or create conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        contactId: dto.contactId,
        pageId: contact.pageId,
        status: { not: 'RESOLVED' },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          workspaceId,
          contactId: dto.contactId,
          pageId: contact.pageId,
          status: 'OPEN',
        },
      });
    }

    return this.sendMessage(workspaceId, userId, {
      conversationId: conversation.id,
      messageType: MessageType.TEXT,
      content: { text: dto.text },
    });
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(workspaceId: string, query: MessageListQueryDto) {
    const { conversationId, page = 1, limit = 50, before, after } = query;

    // Verify conversation belongs to workspace
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const where: Record<string, unknown> = { conversationId };

    // Cursor-based pagination
    if (before) {
      where.id = { lt: before };
    } else if (after) {
      where.id = { gt: after };
    }

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: !before && !after ? (page - 1) * limit : 0,
        take: limit,
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    return {
      data: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: messages.length === limit,
      },
    };
  }

  /**
   * Get all messages for a contact
   */
  async getContactMessages(
    workspaceId: string,
    contactId: string,
    query: ContactMessagesQueryDto,
  ) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, workspaceId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const { page = 1, limit = 50 } = query;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { contactId },
        include: {
          conversation: { select: { id: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.message.count({ where: { contactId } }),
    ]);

    return {
      data: messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Handle incoming webhook message from Facebook
   */
  async handleIncomingMessage(dto: IncomingWebhookMessageDto) {
    this.logger.log(`Incoming message from PSID: ${dto.psid}`);

    // Find page
    const page = await this.prisma.page.findFirst({
      where: { fbPageId: dto.pageId },
    });

    if (!page) {
      this.logger.warn(`Page not found for Facebook Page ID: ${dto.pageId}`);
      return null;
    }

    // Find or create contact
    let contact = await this.contactsService.findByPsid(page.id, dto.psid);

    if (!contact) {
      // Create new contact
      contact = await this.prisma.contact.create({
        data: {
          workspaceId: page.workspaceId,
          pageId: page.id,
          psid: dto.psid,
          source: 'ORGANIC',
          firstInteractionAt: new Date(),
        },
        include: {
          tags: { include: { tag: true } },
        },
      });
      this.logger.log(`Created new contact: ${contact.id}`);
    }

    // Find or create conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        contactId: contact.id,
        pageId: page.id,
        status: { not: 'RESOLVED' },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          workspaceId: page.workspaceId,
          contactId: contact.id,
          pageId: page.id,
          status: 'OPEN',
        },
      });
      this.logger.log(`Created new conversation: ${conversation.id}`);
    }

    // Create message
    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        contactId: contact.id,
        pageId: page.id,
        direction: MessageDirection.INBOUND,
        messageType: dto.messageType || MessageType.TEXT,
        content: dto.content as any,
        status: MessageStatus.RECEIVED,
        fbMessageId: dto.mid,
        sentAt: new Date(dto.timestamp),
      },
    });

    // Update conversation
    const messagePreview =
      dto.content.text?.substring(0, 100) || `[${dto.messageType}]`;

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(dto.timestamp),
        lastMessagePreview: messagePreview,
        unreadCount: { increment: 1 },
        status: 'OPEN',
      },
    });

    // Update contact interaction
    await this.contactsService.updateInteraction(contact.id, 'inbound');

    return {
      message,
      conversation,
      contact,
      isNewContact: !contact.firstName,
    };
  }

  /**
   * Mark message as delivered (webhook callback)
   */
  async markAsDelivered(fbMessageId: string) {
    return this.prisma.message.updateMany({
      where: { fbMessageId },
      data: {
        status: MessageStatus.DELIVERED,
        deliveredAt: new Date(),
      },
    });
  }

  /**
   * Mark message as read (webhook callback)
   */
  async markAsRead(fbMessageId: string) {
    return this.prisma.message.updateMany({
      where: { fbMessageId },
      data: {
        status: MessageStatus.READ,
        readAt: new Date(),
      },
    });
  }

  /**
   * Process incoming webhook message (used by WebhooksService)
   */
  async processWebhookMessage(
    workspaceId: string,
    data: {
      conversationId: string;
      contactId: string;
      pageId: string;
      direction: 'INCOMING' | 'OUTGOING';
      facebookMessageId?: string;
      type: string;
      content?: string | null;
      attachments?: Array<{
        type: string;
        url?: string;
        stickerId?: number;
      }>;
      quickReplyPayload?: string;
      replyToMessageId?: string;
      sentAt: Date;
    },
  ) {
    // Determine message type
    let messageType: PrismaMessageType = PrismaMessageType.TEXT;
    if (data.type === 'IMAGE') messageType = PrismaMessageType.IMAGE;
    else if (data.type === 'VIDEO') messageType = PrismaMessageType.VIDEO;
    else if (data.type === 'FILE') messageType = PrismaMessageType.FILE;
    else if (data.type === 'TEMPLATE') messageType = PrismaMessageType.TEMPLATE;

    // Build content object
    const content: Record<string, unknown> = {};
    if (data.content) content.text = data.content;
    if (data.attachments && data.attachments.length > 0) {
      content.attachments = data.attachments;
    }
    if (data.quickReplyPayload) content.quickReply = data.quickReplyPayload;
    if (data.replyToMessageId) content.replyTo = data.replyToMessageId;

    // Create the message
    const message = await this.prisma.message.create({
      data: {
        conversationId: data.conversationId,
        contactId: data.contactId,
        pageId: data.pageId,
        direction: data.direction === 'INCOMING' ? MessageDirection.INBOUND : MessageDirection.OUTBOUND,
        messageType,
        content: content as any,
        status: MessageStatus.RECEIVED,
        fbMessageId: data.facebookMessageId,
        sentAt: data.sentAt,
      },
    });

    return message;
  }

  /**
   * Mark message as failed
   */
  async markAsFailed(messageId: string, errorMessage: string) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        status: MessageStatus.FAILED,
        errorMessage: errorMessage,
      },
    });
  }

  /**
   * Get message by ID
   */
  async findById(workspaceId: string, messageId: string) {
    const message = await this.prisma.message.findFirst({
      where: { id: messageId },
      include: {
        conversation: {
          select: { workspaceId: true },
        },
        contact: {
          select: { id: true, fullName: true, profilePictureUrl: true },
        },
      },
    });

    if (!message || message.conversation.workspaceId !== workspaceId) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  /**
   * Get message statistics for workspace
   */
  async getStats(workspaceId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalMessages, inboundMessages, outboundMessages, messagesByDay] =
      await Promise.all([
        this.prisma.message.count({
          where: {
            conversation: { workspaceId },
            createdAt: { gte: startDate },
          },
        }),
        this.prisma.message.count({
          where: {
            conversation: { workspaceId },
            direction: MessageDirection.INBOUND,
            createdAt: { gte: startDate },
          },
        }),
        this.prisma.message.count({
          where: {
            conversation: { workspaceId },
            direction: MessageDirection.OUTBOUND,
            createdAt: { gte: startDate },
          },
        }),
        this.prisma.$queryRaw`
          SELECT DATE(created_at) as date, COUNT(*)::int as count
          FROM messages m
          JOIN conversations c ON m.conversation_id = c.id
          WHERE c.workspace_id = ${workspaceId}
            AND m.created_at >= ${startDate}
          GROUP BY DATE(created_at)
          ORDER BY date DESC
        ` as Promise<Array<{ date: Date; count: number }>>,
      ]);

    return {
      totalMessages,
      inboundMessages,
      outboundMessages,
      responseRate:
        inboundMessages > 0
          ? Math.round((outboundMessages / inboundMessages) * 100)
          : 0,
      messagesByDay,
    };
  }
}
