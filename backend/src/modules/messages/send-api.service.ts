import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { FacebookApiService, FacebookSendMessagePayload } from '../facebook/facebook-api.service';
import {
  MessageStatus,
  MessageDirection,
  BypassMethod,
  MessageTag,
  MessageType,
} from '@prisma/client';

// ===========================================
// Types
// ===========================================

export interface SendMessageOptions {
  contactId: string;
  pageId: string;
  workspaceId: string;
  conversationId?: string;
  messageType: MessageType;
  content: MessageContent;
  bypassMethod?: BypassMethod;
  messageTag?: MessageTag;
  otnTokenId?: string;
  recurringSubscriptionId?: string;
  campaignId?: string;
}

export interface MessageContent {
  text?: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'video' | 'audio' | 'file';
  buttons?: MessageButton[];
  quickReplies?: QuickReply[];
  templateType?: string;
  elements?: TemplateElement[];
}

export interface MessageButton {
  type: 'web_url' | 'postback' | 'phone_number';
  title: string;
  url?: string;
  payload?: string;
}

export interface QuickReply {
  content_type: 'text' | 'user_phone_number' | 'user_email';
  title?: string;
  payload?: string;
}

export interface TemplateElement {
  title: string;
  subtitle?: string;
  image_url?: string;
  default_action?: { type: string; url: string };
  buttons?: MessageButton[];
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  fbMessageId?: string;
  error?: string;
  errorCode?: string;
  bypassMethodUsed?: BypassMethod;
}

export interface WindowStatus {
  isWithin24Hours: boolean;
  lastMessageFromContact: Date | null;
  windowExpiresAt: Date | null;
  availableBypassMethods: BypassMethod[];
  hasOtnToken: boolean;
  hasRecurringSubscription: boolean;
}

// ===========================================
// Constants
// ===========================================

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_TTL_WINDOW_STATUS = 60; // 1 minute cache

// ===========================================
// Send API Service
// ===========================================

@Injectable()
export class SendApiService {
  private readonly logger = new Logger(SendApiService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private facebookApi: FacebookApiService,
  ) {}

  // ===========================================
  // 24-Hour Window Tracking
  // ===========================================

  /**
   * Check if contact is within 24-hour messaging window
   */
  async isWithin24HourWindow(contactId: string, pageId: string): Promise<boolean> {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      select: { lastMessageFromContactAt: true },
    });

    if (!contact?.lastMessageFromContactAt) {
      return false;
    }

    const timeSinceLastMessage = Date.now() - contact.lastMessageFromContactAt.getTime();
    return timeSinceLastMessage < TWENTY_FOUR_HOURS_MS;
  }

  /**
   * Get comprehensive window status for a contact
   */
  async getWindowStatus(contactId: string, pageId: string): Promise<WindowStatus> {
    // Check cache first
    const cacheKey = `window:${contactId}:${pageId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get contact data
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        otnTokens: {
          where: {
            pageId,
            isUsed: false,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
          take: 1,
        },
        recurringSubscriptions: {
          where: {
            pageId,
            status: 'ACTIVE',
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
          take: 1,
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const now = Date.now();
    const lastMessageTime = contact.lastMessageFromContactAt?.getTime() || 0;
    const isWithin24Hours = lastMessageTime > 0 && (now - lastMessageTime) < TWENTY_FOUR_HOURS_MS;
    const windowExpiresAt = isWithin24Hours 
      ? new Date(lastMessageTime + TWENTY_FOUR_HOURS_MS)
      : null;

    const hasOtnToken = contact.otnTokens.length > 0;
    const hasRecurringSubscription = contact.recurringSubscriptions.length > 0;

    // Determine available bypass methods
    const availableBypassMethods: BypassMethod[] = [];
    
    if (isWithin24Hours) {
      availableBypassMethods.push(BypassMethod.WITHIN_WINDOW);
    }
    if (hasOtnToken) {
      availableBypassMethods.push(BypassMethod.OTN_TOKEN);
    }
    if (hasRecurringSubscription) {
      availableBypassMethods.push(BypassMethod.RECURRING_NOTIFICATION);
    }
    // Message tags are always available (but compliance must be checked)
    availableBypassMethods.push(
      BypassMethod.MESSAGE_TAG_CONFIRMED_EVENT,
      BypassMethod.MESSAGE_TAG_POST_PURCHASE,
      BypassMethod.MESSAGE_TAG_ACCOUNT_UPDATE,
      BypassMethod.MESSAGE_TAG_HUMAN_AGENT,
    );

    const status: WindowStatus = {
      isWithin24Hours,
      lastMessageFromContact: contact.lastMessageFromContactAt,
      windowExpiresAt,
      availableBypassMethods,
      hasOtnToken,
      hasRecurringSubscription,
    };

    // Cache the result
    await this.redis.set(cacheKey, JSON.stringify(status), CACHE_TTL_WINDOW_STATUS);

    return status;
  }

  // ===========================================
  // Message Sending
  // ===========================================

  /**
   * Send a message with automatic bypass method selection
   */
  async sendMessage(options: SendMessageOptions): Promise<SendResult> {
    const {
      contactId,
      pageId,
      workspaceId,
      messageType,
      content,
      campaignId,
    } = options;

    try {
      // Get contact and page data
      const [contact, page] = await Promise.all([
        this.prisma.contact.findUnique({
          where: { id: contactId },
          select: {
            id: true,
            psid: true,
            firstName: true,
            lastName: true,
            fullName: true,
            customFields: true,
            lastMessageFromContactAt: true,
          },
        }),
        this.prisma.page.findUnique({
          where: { id: pageId },
          select: {
            id: true,
            accessToken: true,
            fbPageId: true,
            name: true,
          },
        }),
      ]);

      if (!contact) {
        throw new NotFoundException('Contact not found');
      }
      if (!page) {
        throw new NotFoundException('Page not found');
      }

      // Determine bypass method
      const bypassMethod = await this.determineBypassMethod(options);
      
      if (bypassMethod === BypassMethod.BLOCKED) {
        return {
          success: false,
          error: 'Cannot send message: Outside 24-hour window with no valid bypass method',
          errorCode: 'OUTSIDE_WINDOW_NO_BYPASS',
        };
      }

      // Apply personalization
      const personalizedContent = this.applyPersonalization(content, {
        firstName: contact.firstName || undefined,
        lastName: contact.lastName || undefined,
        fullName: contact.fullName || undefined,
        pageName: page.name || undefined,
        customFields: (contact.customFields as Record<string, unknown>) || {},
      });

      // Build Facebook message payload
      const fbPayload = this.buildFacebookPayload(
        contact.psid,
        personalizedContent,
        bypassMethod,
        options.messageTag,
      );

      // Get or create conversation
      const conversationId = await this.ensureConversation(
        workspaceId,
        contactId,
        pageId,
        options.conversationId,
      );

      // Create message record in PENDING state
      const message = await this.prisma.message.create({
        data: {
          conversationId,
          contactId,
          pageId,
          campaignId,
          direction: MessageDirection.OUTBOUND,
          messageType,
          content: personalizedContent as any,
          bypassMethod,
          messageTag: options.messageTag,
          otnTokenId: options.otnTokenId,
          recurringSubscriptionId: options.recurringSubscriptionId,
          status: MessageStatus.PENDING,
        },
      });

      // Send via Facebook API
      const fbResponse = await this.facebookApi.sendMessage(
        page.accessToken,
        fbPayload,
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

      // Update conversation
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: this.getMessagePreview(personalizedContent),
          lastMessageDirection: MessageDirection.OUTBOUND,
        },
      });

      // Update contact last message time
      await this.prisma.contact.update({
        where: { id: contactId },
        data: { lastMessageToContactAt: new Date() },
      });

      // If OTN token was used, mark it as used
      if (options.otnTokenId) {
        await this.prisma.otnToken.update({
          where: { id: options.otnTokenId },
          data: {
            isUsed: true,
            usedAt: new Date(),
          },
        });
      }

      // If recurring subscription was used, update last sent
      if (options.recurringSubscriptionId) {
        await this.prisma.recurringSubscription.update({
          where: { id: options.recurringSubscriptionId },
          data: {
            lastSentAt: new Date(),
            messagesSent: { increment: 1 },
          },
        });
      }

      // Invalidate window status cache
      await this.redis.del(`window:${contactId}:${pageId}`);

      this.logger.log(`Message sent successfully: ${message.id} -> ${fbResponse.message_id}`);

      return {
        success: true,
        messageId: message.id,
        fbMessageId: fbResponse.message_id,
        bypassMethodUsed: bypassMethod,
      };

    } catch (error) {
      this.logger.error('Failed to send message:', error);

      // If we created a message record, update it with failure
      if (error.messageId) {
        await this.prisma.message.update({
          where: { id: error.messageId },
          data: {
            status: MessageStatus.FAILED,
            errorCode: error.code || 'SEND_FAILED',
            errorMessage: error.message,
          },
        });
      }

      return {
        success: false,
        error: error.message || 'Failed to send message',
        errorCode: error.code || 'UNKNOWN_ERROR',
      };
    }
  }

  // ===========================================
  // Bypass Method Selection
  // ===========================================

  /**
   * Determine the best bypass method for sending a message
   */
  private async determineBypassMethod(options: SendMessageOptions): Promise<BypassMethod> {
    // If bypass method is explicitly specified, validate compliance and use it
    if (options.bypassMethod) {
      if (this.isTagBasedBypass(options.bypassMethod) && options.messageTag) {
        const complianceError = await this.validateMessageTagCompliance(
          options.messageTag,
          options.contactId,
          options.pageId,
        );
        if (complianceError) {
          this.logger.warn(`Message tag compliance failed: ${complianceError}`);
          return BypassMethod.BLOCKED;
        }
      }
      return options.bypassMethod;
    }

    const windowStatus = await this.getWindowStatus(options.contactId, options.pageId);

    // Priority 1: Within 24-hour window
    if (windowStatus.isWithin24Hours) {
      return BypassMethod.WITHIN_WINDOW;
    }

    // Priority 2: OTN Token (if available and specified)
    if (options.otnTokenId && windowStatus.hasOtnToken) {
      return BypassMethod.OTN_TOKEN;
    }

    // Priority 3: Recurring subscription (if available and specified)
    if (options.recurringSubscriptionId && windowStatus.hasRecurringSubscription) {
      return BypassMethod.RECURRING_NOTIFICATION;
    }

    // Priority 4: Message tag (if specified) — validate compliance first
    if (options.messageTag) {
      const complianceError = await this.validateMessageTagCompliance(
        options.messageTag,
        options.contactId,
        options.pageId,
      );
      if (complianceError) {
        this.logger.warn(`Message tag compliance failed: ${complianceError}`);
        return BypassMethod.BLOCKED;
      }
      return this.messageTagToBypassMethod(options.messageTag);
    }

    // No valid bypass method
    return BypassMethod.BLOCKED;
  }

  /**
   * Validate that a message tag is used in compliance with Facebook Messenger Platform policies.
   * - HUMAN_AGENT: Can only be used within 7 days of the last user message.
   * - Other tags: Always allowed but should only be used for their intended purpose.
   * Returns an error string if non-compliant, or null if OK.
   */
  private async validateMessageTagCompliance(
    tag: MessageTag,
    contactId: string,
    pageId: string,
  ): Promise<string | null> {
    // HUMAN_AGENT tag has a strict 7-day window requirement
    if (tag === MessageTag.HUMAN_AGENT) {
      const contact = await this.prisma.contact.findUnique({
        where: { id: contactId },
        select: { lastMessageFromContactAt: true },
      });

      if (!contact?.lastMessageFromContactAt) {
        return 'HUMAN_AGENT tag requires a prior message from the contact';
      }

      const timeSinceLastMessage = Date.now() - contact.lastMessageFromContactAt.getTime();
      if (timeSinceLastMessage > SEVEN_DAYS_MS) {
        return 'HUMAN_AGENT tag can only be used within 7 days of the last user message';
      }
    }

    return null;
  }

  /**
   * Convert message tag to bypass method enum
   */
  private messageTagToBypassMethod(tag: MessageTag): BypassMethod {
    switch (tag) {
      case MessageTag.CONFIRMED_EVENT_UPDATE:
        return BypassMethod.MESSAGE_TAG_CONFIRMED_EVENT;
      case MessageTag.POST_PURCHASE_UPDATE:
        return BypassMethod.MESSAGE_TAG_POST_PURCHASE;
      case MessageTag.ACCOUNT_UPDATE:
        return BypassMethod.MESSAGE_TAG_ACCOUNT_UPDATE;
      case MessageTag.HUMAN_AGENT:
        return BypassMethod.MESSAGE_TAG_HUMAN_AGENT;
      default:
        return BypassMethod.BLOCKED;
    }
  }

  // ===========================================
  // Personalization
  // ===========================================

  /**
   * Apply personalization tokens to message content.
   * Supports: {{first_name}}, {{last_name}}, {{full_name}}, {{page_name}},
   * {{custom_field_key}}, and fallbacks like {{first_name|Friend}}.
   */
  private applyPersonalization(
    content: MessageContent,
    context: {
      firstName?: string;
      lastName?: string;
      fullName?: string;
      pageName?: string;
      customFields?: Record<string, unknown>;
    },
  ): MessageContent {
    const builtinTokens: Record<string, string> = {
      first_name: context.firstName || 'there',
      last_name: context.lastName || '',
      full_name: context.fullName || context.firstName || 'there',
      page_name: context.pageName || '',
    };

    const personalizedContent = { ...content };

    if (personalizedContent.text) {
      personalizedContent.text = this.replaceTokens(
        personalizedContent.text,
        builtinTokens,
        context.customFields || {},
      );
    }

    // Also personalize button titles and quick reply titles
    if (personalizedContent.buttons) {
      personalizedContent.buttons = personalizedContent.buttons.map((btn) => ({
        ...btn,
        title: this.replaceTokens(btn.title, builtinTokens, context.customFields || {}),
      }));
    }

    if (personalizedContent.quickReplies) {
      personalizedContent.quickReplies = personalizedContent.quickReplies.map((qr) => ({
        ...qr,
        title: qr.title
          ? this.replaceTokens(qr.title, builtinTokens, context.customFields || {})
          : qr.title,
      }));
    }

    if (personalizedContent.elements) {
      personalizedContent.elements = personalizedContent.elements.map((el) => ({
        ...el,
        title: this.replaceTokens(el.title, builtinTokens, context.customFields || {}),
        subtitle: el.subtitle
          ? this.replaceTokens(el.subtitle, builtinTokens, context.customFields || {})
          : el.subtitle,
      }));
    }

    return personalizedContent;
  }

  /**
   * Replace {{token}} and {{token|fallback}} patterns in text
   */
  private replaceTokens(
    text: string,
    builtinTokens: Record<string, string>,
    customFields: Record<string, unknown>,
  ): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (_match, tokenExpr: string) => {
      const [tokenKey, fallback] = tokenExpr.split('|').map((s: string) => s.trim());
      const normalizedKey = tokenKey.toLowerCase();

      // Check built-in tokens first
      if (normalizedKey in builtinTokens) {
        const value = builtinTokens[normalizedKey];
        return value || fallback || '';
      }

      // Check custom fields
      if (normalizedKey in customFields) {
        const value = customFields[normalizedKey];
        return value != null ? String(value) : (fallback || '');
      }

      // Unknown token — use fallback or empty
      return fallback || '';
    }).trim();
  }

  // ===========================================
  // Facebook Payload Building
  // ===========================================

  /**
   * Build Facebook Send API payload
   */
  private buildFacebookPayload(
    recipientPsid: string,
    content: MessageContent,
    bypassMethod: BypassMethod,
    messageTag?: MessageTag,
  ): FacebookSendMessagePayload {
    const payload: FacebookSendMessagePayload = {
      recipient: { id: recipientPsid },
      messaging_type: this.getMessagingType(bypassMethod),
    };

    // Add message tag if using tag-based bypass
    if (messageTag && this.isTagBasedBypass(bypassMethod)) {
      payload.tag = messageTag;
    }

    // Build message content
    if (content.text && !content.buttons && !content.quickReplies) {
      // Simple text message
      payload.message = { text: content.text };
    } else if (content.attachmentUrl) {
      // Attachment message
      payload.message = {
        attachment: {
          type: content.attachmentType || 'image',
          payload: { url: content.attachmentUrl },
        },
      };
    } else if (content.buttons) {
      // Button template
      payload.message = {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: content.text,
            buttons: content.buttons,
          } as any,
        },
      };
    } else if (content.elements) {
      // Generic template (carousel)
      payload.message = {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: content.elements,
          } as any,
        },
      };
    }

    // Add quick replies if present
    if (content.quickReplies && payload.message) {
      (payload.message as any).quick_replies = content.quickReplies;
    }

    return payload;
  }

  /**
   * Get Facebook messaging_type based on bypass method
   */
  private getMessagingType(bypassMethod: BypassMethod): 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG' {
    switch (bypassMethod) {
      case BypassMethod.WITHIN_WINDOW:
        return 'RESPONSE';
      case BypassMethod.OTN_TOKEN:
      case BypassMethod.RECURRING_NOTIFICATION:
        return 'UPDATE';
      case BypassMethod.MESSAGE_TAG_CONFIRMED_EVENT:
      case BypassMethod.MESSAGE_TAG_POST_PURCHASE:
      case BypassMethod.MESSAGE_TAG_ACCOUNT_UPDATE:
      case BypassMethod.MESSAGE_TAG_HUMAN_AGENT:
        return 'MESSAGE_TAG';
      default:
        return 'RESPONSE';
    }
  }

  /**
   * Check if bypass method requires a message tag
   */
  private isTagBasedBypass(bypassMethod: BypassMethod): boolean {
    const tagBasedMethods: BypassMethod[] = [
      BypassMethod.MESSAGE_TAG_CONFIRMED_EVENT,
      BypassMethod.MESSAGE_TAG_POST_PURCHASE,
      BypassMethod.MESSAGE_TAG_ACCOUNT_UPDATE,
      BypassMethod.MESSAGE_TAG_HUMAN_AGENT,
    ];
    return tagBasedMethods.includes(bypassMethod);
  }

  // ===========================================
  // Helpers
  // ===========================================

  /**
   * Ensure a conversation exists for the contact
   */
  private async ensureConversation(
    workspaceId: string,
    contactId: string,
    pageId: string,
    existingConversationId?: string,
  ): Promise<string> {
    if (existingConversationId) {
      return existingConversationId;
    }

    // Find existing open conversation
    const existing = await this.prisma.conversation.findFirst({
      where: {
        contactId,
        pageId,
        status: { not: 'RESOLVED' },
      },
    });

    if (existing) {
      return existing.id;
    }

    // Create new conversation
    const conversation = await this.prisma.conversation.create({
      data: {
        workspaceId,
        contactId,
        pageId,
        status: 'OPEN',
      },
    });

    return conversation.id;
  }

  /**
   * Get a preview string for the message
   */
  private getMessagePreview(content: MessageContent): string {
    if (content.text) {
      return content.text.substring(0, 100);
    }
    if (content.attachmentType) {
      return `[${content.attachmentType.toUpperCase()}]`;
    }
    if (content.elements) {
      return '[TEMPLATE]';
    }
    return '[MESSAGE]';
  }
}
