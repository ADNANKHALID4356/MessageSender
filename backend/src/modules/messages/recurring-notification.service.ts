import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FacebookApiService } from '../facebook/facebook-api.service';
import { EncryptionService } from '../../common/encryption.service';
import { MessageType, MessageStatus, MessageDirection, BypassMethod, SubscriptionStatus } from '@prisma/client';

// ===========================================
// Types
// ===========================================

export enum RecurringFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export interface RecurringSubscriptionRequest {
  contactId: string;
  pageId: string;
  workspaceId: string;
  title: string; // Notification title shown to user
  imageUrl?: string; // Optional image for opt-in card
  frequency: RecurringFrequency;
  payload?: string; // Custom payload to identify subscription
}

export interface RecurringMessageOptions {
  subscriptionId: string;
  pageId: string;
  workspaceId: string;
  messageContent: {
    text?: string;
    attachmentUrl?: string;
    attachmentType?: 'image' | 'video' | 'audio' | 'file';
  };
  notificationMessagesTag?: string;
}

export interface SubscriptionInfo {
  id: string;
  contactId: string;
  title: string;
  frequency: string;
  status: SubscriptionStatus;
  nextAllowedAt: Date | null;
  optedInAt: Date | null;
  expiresAt: Date | null;
  messagesRemaining: number | null;
}

// ===========================================
// Recurring Notification Service
// ===========================================

@Injectable()
export class RecurringNotificationService {
  private readonly logger = new Logger(RecurringNotificationService.name);
  private readonly MAX_TITLE_LENGTH = 65;
  private readonly MAX_MESSAGES_PER_FREQUENCY = {
    [RecurringFrequency.DAILY]: 1,
    [RecurringFrequency.WEEKLY]: 1,
    [RecurringFrequency.MONTHLY]: 1,
  };

  constructor(
    private prisma: PrismaService,
    private facebookApi: FacebookApiService,
    private encryption: EncryptionService,
  ) {}

  // ===========================================
  // Request Recurring Notification Opt-In
  // ===========================================

  /**
   * Send a recurring notification opt-in request to a contact
   */
  async requestSubscription(
    options: RecurringSubscriptionRequest,
  ): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
    const { contactId, pageId, workspaceId, title, imageUrl, frequency, payload } = options;

    // Validate title
    if (title.length > this.MAX_TITLE_LENGTH) {
      throw new BadRequestException(
        `Title must be ${this.MAX_TITLE_LENGTH} characters or less`,
      );
    }

    try {
      // Get contact and page
      const [contact, page] = await Promise.all([
        this.prisma.contact.findUnique({
          where: { id: contactId },
          select: { id: true, psid: true },
        }),
        this.prisma.page.findUnique({
          where: { id: pageId },
          select: { id: true, accessToken: true, fbPageId: true },
        }),
      ]);

      if (!contact) throw new NotFoundException('Contact not found');
      if (!page) throw new NotFoundException('Page not found');

      // Check if within 24-hour window (required to send opt-in request)
      const isWithinWindow = await this.isWithin24HourWindow(contactId);
      if (!isWithinWindow) {
        throw new BadRequestException(
          'Cannot send opt-in request: Contact is outside 24-hour messaging window',
        );
      }

      // Check for existing active subscription of same type
      const existingSubscription = await this.prisma.recurringSubscription.findFirst({
        where: {
          contactId,
          pageId,
          status: SubscriptionStatus.ACTIVE,
          frequency,
        },
      });

      if (existingSubscription) {
        throw new BadRequestException(
          'Contact already has an active subscription with this frequency',
        );
      }

      // Build recurring notification opt-in template
      const templatePayload: any = {
        recipient: { id: contact.psid },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'notification_messages',
              title: title,
              notification_messages_frequency: frequency,
              payload: payload || `recurring_${frequency}_${contactId}`,
            },
          },
        },
        messaging_type: 'RESPONSE',
      };

      // Add image if provided
      if (imageUrl) {
        templatePayload.message.attachment.payload.image_url = imageUrl;
      }

      // Create subscription record (pending opt-in)
      const subscription = await this.prisma.recurringSubscription.create({
        data: {
          contactId,
          pageId,
          title,
          frequency,
          payload: payload || null,
          status: SubscriptionStatus.PENDING,
          requestedAt: new Date(),
        },
      });

      // Get or create conversation
      let conversation = await this.prisma.conversation.findFirst({
        where: { contactId, pageId, status: { not: 'RESOLVED' } },
      });

      if (!conversation) {
        conversation = await this.prisma.conversation.create({
          data: { workspaceId, contactId, pageId, status: 'OPEN' },
        });
      }

      // Create message record
      const message = await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          contactId,
          pageId,
          direction: MessageDirection.OUTBOUND,
          messageType: MessageType.TEMPLATE,
          content: {
            type: 'recurring_notification_request',
            title,
            frequency,
          } as any,
          status: MessageStatus.PENDING,
        },
      });

      // Send via Facebook API
      const fbResponse = await this.facebookApi.sendMessage(
        this.encryption.decryptIfNeeded(page.accessToken),
        templatePayload,
      );

      // Update message with success
      await this.prisma.message.update({
        where: { id: message.id },
        data: {
          fbMessageId: fbResponse.message_id,
          status: MessageStatus.SENT,
          sentAt: new Date(),
        },
      });

      this.logger.log(
        `Recurring notification request sent to contact ${contactId}, frequency: ${frequency}`,
      );

      return {
        success: true,
        subscriptionId: subscription.id,
      };

    } catch (error) {
      this.logger.error('Failed to send recurring notification request:', error);
      return {
        success: false,
        error: error.message || 'Failed to send opt-in request',
      };
    }
  }

  // ===========================================
  // Handle Opt-In Webhook
  // ===========================================

  /**
   * Handle recurring notification opt-in from webhook
   */
  async handleOptIn(
    fbPageId: string,
    senderPsid: string,
    notificationToken: string,
    frequency: string,
    expiresAt: Date | null,
    payload: string,
  ): Promise<void> {
    this.logger.log(
      `Recurring notification opt-in: psid=${senderPsid}, frequency=${frequency}`,
    );

    try {
      // Find page and contact
      const page = await this.prisma.page.findFirst({
        where: { fbPageId },
      });

      if (!page) {
        this.logger.error(`Page not found for fbPageId: ${fbPageId}`);
        return;
      }

      const contact = await this.prisma.contact.findFirst({
        where: { psid: senderPsid, pageId: page.id },
      });

      if (!contact) {
        this.logger.error(`Contact not found for psid: ${senderPsid}`);
        return;
      }

      // Find pending subscription
      const pendingSubscription = await this.prisma.recurringSubscription.findFirst({
        where: {
          contactId: contact.id,
          pageId: page.id,
          status: SubscriptionStatus.PENDING,
          frequency,
        },
        orderBy: { requestedAt: 'desc' },
      });

      if (pendingSubscription) {
        // Update existing pending subscription
        await this.prisma.recurringSubscription.update({
          where: { id: pendingSubscription.id },
          data: {
            token: notificationToken,
            status: SubscriptionStatus.ACTIVE,
            optedInAt: new Date(),
            expiresAt,
            nextAllowedAt: new Date(), // Can send immediately after opt-in
          },
        });
      } else {
        // Create new subscription
        await this.prisma.recurringSubscription.create({
          data: {
            contactId: contact.id,
            pageId: page.id,
            title: 'Direct Opt-In',
            frequency,
            token: notificationToken,
            payload,
            status: SubscriptionStatus.ACTIVE,
            requestedAt: new Date(),
            optedInAt: new Date(),
            expiresAt,
            nextAllowedAt: new Date(),
          },
        });
      }

      this.logger.log(
        `Recurring notification opt-in recorded for contact ${contact.id}`,
      );

    } catch (error) {
      this.logger.error('Failed to handle recurring notification opt-in:', error);
    }
  }

  /**
   * Handle opt-out from webhook
   */
  async handleOptOut(
    fbPageId: string,
    senderPsid: string,
    frequency: string,
  ): Promise<void> {
    this.logger.log(
      `Recurring notification opt-out: psid=${senderPsid}, frequency=${frequency}`,
    );

    try {
      const page = await this.prisma.page.findFirst({
        where: { fbPageId },
      });

      if (!page) return;

      const contact = await this.prisma.contact.findFirst({
        where: { psid: senderPsid, pageId: page.id },
      });

      if (!contact) return;

      // Mark subscription as cancelled
      await this.prisma.recurringSubscription.updateMany({
        where: {
          contactId: contact.id,
          pageId: page.id,
          status: SubscriptionStatus.ACTIVE,
          frequency,
        },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      this.logger.log(`Subscription cancelled for contact ${contact.id}`);

    } catch (error) {
      this.logger.error('Failed to handle opt-out:', error);
    }
  }

  // ===========================================
  // Send Recurring Notification
  // ===========================================

  /**
   * Send a message using recurring notification token
   */
  async sendRecurringMessage(
    options: RecurringMessageOptions,
  ): Promise<{
    success: boolean;
    messageId?: string;
    fbMessageId?: string;
    error?: string;
  }> {
    const { subscriptionId, pageId, workspaceId, messageContent, notificationMessagesTag } = options;

    try {
      // Get subscription
      const subscription = await this.prisma.recurringSubscription.findUnique({
        where: { id: subscriptionId },
        include: {
          contact: { select: { id: true, psid: true } },
        },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      if (subscription.status !== SubscriptionStatus.ACTIVE) {
        throw new BadRequestException('Subscription is not active');
      }

      if (!subscription.token) {
        throw new BadRequestException('User has not opted in yet');
      }

      // Check expiration
      if (subscription.expiresAt && subscription.expiresAt < new Date()) {
        await this.prisma.recurringSubscription.update({
          where: { id: subscriptionId },
          data: { status: SubscriptionStatus.EXPIRED },
        });
        throw new BadRequestException('Subscription has expired');
      }

      // Check rate limit (nextAllowedAt)
      if (subscription.nextAllowedAt && subscription.nextAllowedAt > new Date()) {
        throw new BadRequestException(
          `Cannot send yet. Next allowed: ${subscription.nextAllowedAt.toISOString()}`,
        );
      }

      // Get page
      const page = await this.prisma.page.findUnique({
        where: { id: pageId },
        select: { accessToken: true },
      });

      if (!page) {
        throw new NotFoundException('Page not found');
      }

      // Build message payload with recurring notification token
      const payload = {
        recipient: {
          notification_messages_token: subscription.token,
        },
        message: messageContent.text
          ? { text: messageContent.text }
          : {
              attachment: {
                type: messageContent.attachmentType || 'image',
                payload: { url: messageContent.attachmentUrl },
              },
            },
        messaging_type: 'MESSAGE_TAG',
        tag: notificationMessagesTag || 'CONFIRMED_EVENT_UPDATE',
      };

      // Get or create conversation
      let conversation = await this.prisma.conversation.findFirst({
        where: { contactId: subscription.contactId, pageId, status: { not: 'RESOLVED' } },
      });

      if (!conversation) {
        conversation = await this.prisma.conversation.create({
          data: {
            workspaceId,
            contactId: subscription.contactId,
            pageId,
            status: 'OPEN',
          },
        });
      }

      // Create message record
      const message = await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          contactId: subscription.contactId,
          pageId,
          direction: MessageDirection.OUTBOUND,
          messageType: messageContent.text ? MessageType.TEXT : MessageType.IMAGE,
          content: messageContent as any,
          bypassMethod: BypassMethod.RECURRING_NOTIFICATION,
          recurringSubscriptionId: subscriptionId,
          status: MessageStatus.PENDING,
        },
      });

      // Send via Facebook API
      const fbResponse = await this.facebookApi.sendMessage(
        this.encryption.decryptIfNeeded(page.accessToken),
        payload as any,
      );

      // Calculate next allowed time based on frequency
      const nextAllowedAt = this.calculateNextAllowedTime(
        subscription.frequency as RecurringFrequency,
      );

      // Update subscription
      await this.prisma.recurringSubscription.update({
        where: { id: subscriptionId },
        data: {
          lastSentAt: new Date(),
          nextAllowedAt,
          messagesSent: { increment: 1 },
        },
      });

      // Update message with success
      await this.prisma.message.update({
        where: { id: message.id },
        data: {
          fbMessageId: fbResponse.message_id,
          status: MessageStatus.SENT,
          sentAt: new Date(),
        },
      });

      // Update conversation
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: messageContent.text?.substring(0, 100) || '[ATTACHMENT]',
          lastMessageDirection: MessageDirection.OUTBOUND,
        },
      });

      this.logger.log(`Recurring message sent using subscription ${subscriptionId}`);

      return {
        success: true,
        messageId: message.id,
        fbMessageId: fbResponse.message_id,
      };

    } catch (error) {
      this.logger.error('Failed to send recurring message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send recurring message',
      };
    }
  }

  // ===========================================
  // Subscription Management
  // ===========================================

  /**
   * Get active subscriptions for a contact
   */
  async getContactSubscriptions(
    contactId: string,
    pageId: string,
  ): Promise<SubscriptionInfo[]> {
    const subscriptions = await this.prisma.recurringSubscription.findMany({
      where: {
        contactId,
        pageId,
        status: SubscriptionStatus.ACTIVE,
      },
      orderBy: { optedInAt: 'desc' },
    });

    return subscriptions.map(s => ({
      id: s.id,
      contactId: s.contactId,
      title: s.title || '',
      frequency: s.frequency,
      status: s.status,
      nextAllowedAt: s.nextAllowedAt,
      optedInAt: s.optedInAt,
      expiresAt: s.expiresAt,
      messagesRemaining: null, // Can calculate based on frequency
    }));
  }

  /**
   * Check if can send recurring message now
   */
  async canSendNow(subscriptionId: string): Promise<{
    canSend: boolean;
    reason?: string;
    nextAllowedAt?: Date;
  }> {
    const subscription = await this.prisma.recurringSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return { canSend: false, reason: 'Subscription not found' };
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      return { canSend: false, reason: `Subscription is ${subscription.status}` };
    }

    if (subscription.expiresAt && subscription.expiresAt < new Date()) {
      return { canSend: false, reason: 'Subscription has expired' };
    }

    if (subscription.nextAllowedAt && subscription.nextAllowedAt > new Date()) {
      return {
        canSend: false,
        reason: 'Rate limited',
        nextAllowedAt: subscription.nextAllowedAt,
      };
    }

    return { canSend: true };
  }

  // ===========================================
  // Helpers
  // ===========================================

  private calculateNextAllowedTime(frequency: RecurringFrequency): Date {
    const now = new Date();

    switch (frequency) {
      case RecurringFrequency.DAILY:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case RecurringFrequency.WEEKLY:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case RecurringFrequency.MONTHLY:
        return new Date(now.setMonth(now.getMonth() + 1));
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  private async isWithin24HourWindow(contactId: string): Promise<boolean> {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      select: { lastMessageFromContactAt: true },
    });

    if (!contact?.lastMessageFromContactAt) {
      return false;
    }

    const timeSince = Date.now() - contact.lastMessageFromContactAt.getTime();
    return timeSince < 24 * 60 * 60 * 1000;
  }
}
