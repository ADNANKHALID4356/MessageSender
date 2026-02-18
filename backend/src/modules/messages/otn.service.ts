import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FacebookApiService } from '../facebook/facebook-api.service';
import { EncryptionService } from '../../common/encryption.service';
import { MessageType, MessageStatus, MessageDirection, BypassMethod } from '@prisma/client';

// ===========================================
// Types
// ===========================================

export interface OtnRequestOptions {
  contactId: string;
  pageId: string;
  workspaceId: string;
  title: string; // Max 65 characters - shown in opt-in prompt
  payload?: string; // Custom payload to identify the OTN purpose
}

export interface OtnRequestResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface OtnTokenInfo {
  id: string;
  token: string;
  title: string;
  isUsed: boolean;
  expiresAt: Date | null;
  optedInAt: Date | null;
  createdAt: Date;
}

export interface UseOtnOptions {
  otnTokenId: string;
  contactId: string;
  pageId: string;
  workspaceId: string;
  messageContent: {
    text?: string;
    attachmentUrl?: string;
    attachmentType?: 'image' | 'video' | 'audio' | 'file';
  };
}

// ===========================================
// OTN Service
// ===========================================

@Injectable()
export class OtnService {
  private readonly logger = new Logger(OtnService.name);
  private readonly MAX_TITLE_LENGTH = 65;

  constructor(
    private prisma: PrismaService,
    private facebookApi: FacebookApiService,
    private encryption: EncryptionService,
  ) {}

  // ===========================================
  // Request OTN
  // ===========================================

  /**
   * Send an OTN request to a contact
   * This sends a template message with a "Notify Me" button
   */
  async requestOtn(options: OtnRequestOptions): Promise<OtnRequestResult> {
    const { contactId, pageId, workspaceId, title, payload } = options;

    // Validate title length
    if (title.length > this.MAX_TITLE_LENGTH) {
      throw new BadRequestException(
        `OTN title must be ${this.MAX_TITLE_LENGTH} characters or less`,
      );
    }

    try {
      // Get contact and page data
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

      if (!contact) {
        throw new NotFoundException('Contact not found');
      }
      if (!page) {
        throw new NotFoundException('Page not found');
      }

      // Check if contact is within 24-hour window (required to send OTN request)
      const isWithinWindow = await this.isWithin24HourWindow(contactId);
      if (!isWithinWindow) {
        throw new BadRequestException(
          'Cannot send OTN request: Contact is outside 24-hour messaging window',
        );
      }

      // Build OTN request template
      const otnPayload = {
        recipient: { id: contact.psid },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'one_time_notif_req',
              title: title,
              payload: payload || `otn_request_${contactId}`,
            },
          },
        },
        messaging_type: 'RESPONSE' as const,
      };

      // Create pending OTN record
      const otnRecord = await this.prisma.otnToken.create({
        data: {
          contactId,
          pageId,
          token: '', // Will be filled when user opts in
          title,
          payload: payload || null,
          isUsed: false,
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
          content: { type: 'otn_request', title } as any,
          status: MessageStatus.PENDING,
        },
      });

      // Send via Facebook API
      const fbResponse = await this.facebookApi.sendMessage(
        this.encryption.decryptIfNeeded(page.accessToken),
        otnPayload as any,
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

      this.logger.log(`OTN request sent to contact ${contactId}`);

      return {
        success: true,
        messageId: message.id,
      };

    } catch (error) {
      this.logger.error('Failed to send OTN request:', error);
      return {
        success: false,
        error: error.message || 'Failed to send OTN request',
      };
    }
  }

  // ===========================================
  // Handle OTN Opt-In (from webhook)
  // ===========================================

  /**
   * Handle OTN opt-in webhook event
   * Called when a user clicks "Notify Me" button
   */
  async handleOtnOptIn(
    pageId: string,
    senderPsid: string,
    otnToken: string,
    payload: string,
  ): Promise<void> {
    this.logger.log(`OTN opt-in received: psid=${senderPsid}, payload=${payload}`);

    try {
      // Find the page by Facebook page ID
      const page = await this.prisma.page.findFirst({
        where: { fbPageId: pageId },
      });

      if (!page) {
        this.logger.error(`Page not found for fbPageId: ${pageId}`);
        return;
      }

      // Find the contact
      const contact = await this.prisma.contact.findFirst({
        where: { psid: senderPsid, pageId: page.id },
      });

      if (!contact) {
        this.logger.error(`Contact not found for psid: ${senderPsid}`);
        return;
      }

      // Find pending OTN record (most recent one for this contact/page)
      const pendingOtn = await this.prisma.otnToken.findFirst({
        where: {
          contactId: contact.id,
          pageId: page.id,
          token: '', // Not yet filled
          isUsed: false,
        },
        orderBy: { requestedAt: 'desc' },
      });

      if (pendingOtn) {
        // Update existing pending record
        await this.prisma.otnToken.update({
          where: { id: pendingOtn.id },
          data: {
            token: otnToken,
            optedInAt: new Date(),
          },
        });
      } else {
        // Create new OTN record if none pending
        await this.prisma.otnToken.create({
          data: {
            contactId: contact.id,
            pageId: page.id,
            token: otnToken,
            title: 'Direct Opt-In',
            payload,
            isUsed: false,
            requestedAt: new Date(),
            optedInAt: new Date(),
          },
        });
      }

      this.logger.log(`OTN opt-in recorded for contact ${contact.id}`);

    } catch (error) {
      this.logger.error('Failed to handle OTN opt-in:', error);
    }
  }

  // ===========================================
  // Use OTN Token
  // ===========================================

  /**
   * Send a message using an OTN token (SINGLE USE!)
   */
  async useOtnToken(options: UseOtnOptions): Promise<{
    success: boolean;
    messageId?: string;
    fbMessageId?: string;
    error?: string;
  }> {
    const { otnTokenId, contactId, pageId, workspaceId, messageContent } = options;

    try {
      // Get OTN token
      const otnToken = await this.prisma.otnToken.findUnique({
        where: { id: otnTokenId },
      });

      if (!otnToken) {
        throw new NotFoundException('OTN token not found');
      }

      if (otnToken.isUsed) {
        throw new BadRequestException('OTN token has already been used');
      }

      if (!otnToken.token) {
        throw new BadRequestException('User has not opted in yet');
      }

      if (otnToken.contactId !== contactId || otnToken.pageId !== pageId) {
        throw new BadRequestException('OTN token does not match contact/page');
      }

      // Check expiration
      if (otnToken.expiresAt && otnToken.expiresAt < new Date()) {
        throw new BadRequestException('OTN token has expired');
      }

      // Get contact and page
      const [contact, page] = await Promise.all([
        this.prisma.contact.findUnique({
          where: { id: contactId },
          select: { psid: true },
        }),
        this.prisma.page.findUnique({
          where: { id: pageId },
          select: { accessToken: true },
        }),
      ]);

      if (!contact || !page) {
        throw new NotFoundException('Contact or page not found');
      }

      // Build message payload with OTN token
      const payload = {
        recipient: {
          one_time_notif_token: otnToken.token,
        },
        message: messageContent.text
          ? { text: messageContent.text }
          : {
              attachment: {
                type: messageContent.attachmentType || 'image',
                payload: { url: messageContent.attachmentUrl },
              },
            },
        messaging_type: 'MESSAGE_TAG' as const,
        tag: 'CONFIRMED_EVENT_UPDATE', // OTN uses this tag
      };

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
          messageType: messageContent.text ? MessageType.TEXT : MessageType.IMAGE,
          content: messageContent as any,
          bypassMethod: BypassMethod.OTN_TOKEN,
          otnTokenId,
          status: MessageStatus.PENDING,
        },
      });

      // Send via Facebook API
      const fbResponse = await this.facebookApi.sendMessage(
        this.encryption.decryptIfNeeded(page.accessToken),
        payload as any,
      );

      // Mark OTN token as used (SINGLE USE!)
      await this.prisma.otnToken.update({
        where: { id: otnTokenId },
        data: {
          isUsed: true,
          usedAt: new Date(),
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

      this.logger.log(`Message sent using OTN token ${otnTokenId}`);

      return {
        success: true,
        messageId: message.id,
        fbMessageId: fbResponse.message_id,
      };

    } catch (error) {
      this.logger.error('Failed to use OTN token:', error);
      return {
        success: false,
        error: error.message || 'Failed to send message with OTN token',
      };
    }
  }

  // ===========================================
  // OTN Queries
  // ===========================================

  /**
   * Get available OTN tokens for a contact
   */
  async getAvailableTokens(contactId: string, pageId: string): Promise<OtnTokenInfo[]> {
    const tokens = await this.prisma.otnToken.findMany({
      where: {
        contactId,
        pageId,
        isUsed: false,
        token: { not: '' }, // Must have opted in
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { optedInAt: 'desc' },
    });

    return tokens.map(t => ({
      id: t.id,
      token: t.token,
      title: t.title || '',
      isUsed: t.isUsed,
      expiresAt: t.expiresAt,
      optedInAt: t.optedInAt,
      createdAt: t.createdAt,
    }));
  }

  /**
   * Get OTN token count for a contact
   */
  async getTokenCount(contactId: string, pageId: string): Promise<number> {
    return this.prisma.otnToken.count({
      where: {
        contactId,
        pageId,
        isUsed: false,
        token: { not: '' },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });
  }

  // ===========================================
  // Helpers
  // ===========================================

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
