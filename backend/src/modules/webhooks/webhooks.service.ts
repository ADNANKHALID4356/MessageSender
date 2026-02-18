import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import {
  WebhookPayloadDto,
  WebhookEntry,
  WebhookMessagingEvent,
} from './dto/webhook.dto';
import { ContactsService } from '@/modules/contacts/contacts.service';
import { ConversationsService } from '@/modules/conversations/conversations.service';
import { MessagesService } from '@/modules/messages/messages.service';
import { RedisService } from '@/redis/redis.service';
import { ContactSource, ConversationStatus, MessageDirection, MessageStatus } from '@prisma/client';
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

export interface ProcessedEvent {
  type: string;
  pageId: string;
  senderId: string;
  timestamp: number;
  data: any;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly verifyToken: string;
  private readonly appSecret: string;
  private webhookQueue: Queue | null = null;
  private webhookWorker: Worker | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly contactsService: ContactsService,
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
  ) {
    this.verifyToken = this.configService.get<string>('FACEBOOK_WEBHOOK_VERIFY_TOKEN', 'messagesender_webhook_verify');
    this.appSecret = this.configService.get<string>('FACEBOOK_APP_SECRET', '');
    this.initBullMQ();
  }

  /**
   * Initialize BullMQ queue and worker for async webhook processing
   */
  private initBullMQ(): void {
    try {
      const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
      const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
      const redisPassword = this.configService.get<string>('REDIS_PASSWORD', '');
      const redisDb = this.configService.get<number>('REDIS_DB', 0);

      const connection = new IORedis({
        host: redisHost,
        port: redisPort,
        password: redisPassword || undefined,
        db: redisDb,
        maxRetriesPerRequest: null,
      });

      this.webhookQueue = new Queue('webhook-events', {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 1000, age: 86400 },
          removeOnFail: { count: 5000, age: 604800 },
        },
      });

      this.webhookWorker = new Worker(
        'webhook-events',
        async (job: Job) => {
          const { page, event } = job.data;
          await this.processMessagingEvent(page, event);
        },
        {
          connection,
          concurrency: 5,
          limiter: { max: 50, duration: 1000 },
        },
      );

      this.webhookWorker.on('completed', (job) => {
        this.logger.debug(`Webhook job ${job.id} completed`);
      });

      this.webhookWorker.on('failed', (job, err) => {
        this.logger.error(`Webhook job ${job?.id} failed: ${err.message}`);
      });

      this.logger.log('BullMQ webhook queue initialized');
    } catch (error: any) {
      this.logger.warn(`BullMQ init failed (falling back to sync): ${error.message}`);
    }
  }

  // ===========================================
  // Webhook Verification
  // ===========================================

  /**
   * Verify webhook subscription from Facebook
   */
  verifyWebhook(mode: string, token: string, challenge: string): string {
    this.logger.log(`Webhook verification request: mode=${mode}`);

    if (mode !== 'subscribe') {
      this.logger.warn(`Invalid verification mode: ${mode}`);
      throw new UnauthorizedException('Invalid verification mode');
    }

    if (token !== this.verifyToken) {
      this.logger.warn('Invalid verification token');
      throw new UnauthorizedException('Invalid verification token');
    }

    this.logger.log('Webhook verification successful');
    return challenge;
  }

  // ===========================================
  // Signature Verification
  // ===========================================

  /**
   * Verify webhook signature using HMAC-SHA256
   */
  verifySignature(signature: string, payload: string): boolean {
    if (!signature || !this.appSecret) {
      this.logger.warn('Missing signature or app secret');
      return false;
    }

    // Facebook sends signature in format: sha256=<hash>
    const signatureParts = signature.split('=');
    if (signatureParts.length !== 2 || signatureParts[0] !== 'sha256') {
      this.logger.warn('Invalid signature format');
      return false;
    }

    const receivedHash = signatureParts[1];
    const expectedHash = crypto
      .createHmac('sha256', this.appSecret)
      .update(payload)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    try {
      const receivedBuffer = Buffer.from(receivedHash);
      const expectedBuffer = Buffer.from(expectedHash);

      // timingSafeEqual requires same-length buffers
      if (receivedBuffer.length !== expectedBuffer.length) {
        this.logger.warn('Signature length mismatch');
        return false;
      }

      const isValid = crypto.timingSafeEqual(receivedBuffer, expectedBuffer);

      if (!isValid) {
        this.logger.warn('Signature verification failed');
      }

      return isValid;
    } catch (error) {
      this.logger.warn(`Signature verification error: ${error.message}`);
      return false;
    }
  }

  // ===========================================
  // Event Processing
  // ===========================================

  /**
   * Process incoming webhook payload
   */
  async processWebhook(payload: WebhookPayloadDto): Promise<void> {
    this.logger.log(`Processing webhook: object=${payload.object}, entries=${payload.entry.length}`);

    // Only process page events
    if (payload.object !== 'page') {
      this.logger.warn(`Unknown object type: ${payload.object}`);
      return;
    }

    // Process each entry
    for (const entry of payload.entry) {
      await this.processEntry(entry);
    }
  }

  /**
   * Process a single webhook entry
   */
  private async processEntry(entry: WebhookEntry): Promise<void> {
    const pageId = entry.id;
    this.logger.debug(`Processing entry for page: ${pageId}`);

    // Check if this page is active in our system
    const page = await this.prisma.page.findFirst({
      where: {
        fbPageId: pageId,
        isActive: true,
      },
      include: {
        workspace: true,
      },
    });

    if (!page) {
      this.logger.warn(`Page not found or inactive: ${pageId}`);
      return;
    }

    // Process messaging events (via BullMQ queue when available)
    if (entry.messaging && entry.messaging.length > 0) {
      for (const event of entry.messaging) {
        if (this.webhookQueue) {
          await this.webhookQueue.add('messaging-event', { page, event }, {
            jobId: `wh_${page.id}_${event.sender?.id}_${event.timestamp}`,
          });
        } else {
          await this.processMessagingEvent(page, event);
        }
      }
    }

    // Process standby events (handover protocol)
    if (entry.standby && entry.standby.length > 0) {
      for (const event of entry.standby) {
        await this.processStandbyEvent(page, event);
      }
    }
  }

  /**
   * Process a messaging event
   */
  private async processMessagingEvent(
    page: any,
    event: WebhookMessagingEvent,
  ): Promise<void> {
    const senderId = event.sender.id;
    const timestamp = event.timestamp;

    this.logger.debug(`Processing messaging event from ${senderId} at ${timestamp}`);

    // Deduplicate events using Redis
    const eventKey = `webhook:event:${page.id}:${senderId}:${timestamp}`;
    const isDuplicate = await this.redis.get(eventKey);
    if (isDuplicate) {
      this.logger.debug('Duplicate event, skipping');
      return;
    }
    await this.redis.set(eventKey, '1', 3600); // 1 hour TTL

    try {
      // Determine event type and process accordingly
      if (event.message && !event.message.is_echo) {
        await this.handleIncomingMessage(page, event);
      } else if (event.message && event.message.is_echo) {
        await this.handleEchoMessage(page, event);
      } else if (event.postback) {
        await this.handlePostback(page, event);
      } else if (event.referral) {
        await this.handleReferral(page, event);
      } else if (event.optin) {
        await this.handleOptin(page, event);
      } else if (event.delivery) {
        await this.handleDelivery(page, event);
      } else if (event.read) {
        await this.handleRead(page, event);
      } else if (event.reaction) {
        await this.handleReaction(page, event);
      } else if (event['policy-enforcement']) {
        await this.handlePolicyEnforcement(page, event);
      } else if (event.pass_thread_control) {
        await this.handlePassThreadControl(page, event);
      } else if (event.take_thread_control) {
        await this.handleTakeThreadControl(page, event);
      } else {
        this.logger.warn(`Unknown event type: ${JSON.stringify(event)}`);
      }
    } catch (error) {
      this.logger.error(`Error processing event: ${error.message}`, error.stack);
      // Queue for retry via BullMQ if available
      if (this.webhookQueue) {
        try {
          await this.webhookQueue.add(
            'retry-event',
            { page, event },
            {
              delay: 5000, // 5 second delay before retry
              attempts: 2,
              backoff: { type: 'exponential', delay: 10000 },
              jobId: `retry_${page.id}_${senderId}_${timestamp}_${Date.now()}`,
            },
          );
          this.logger.log(`Event queued for retry: ${senderId}@${page.id}`);
        } catch (retryErr) {
          this.logger.error(`Failed to queue retry: ${retryErr.message}`);
        }
      }
    }
  }

  /**
   * Process standby event (when another app is primary)
   */
  private async processStandbyEvent(
    page: any,
    event: WebhookMessagingEvent,
  ): Promise<void> {
    this.logger.debug(`Standby event received for page ${page.id}`);
    // In standby mode, we can only read messages, not respond
    // Useful for monitoring/analytics
  }

  // ===========================================
  // Event Handlers
  // ===========================================

  /**
   * Handle incoming message from user
   */
  private async handleIncomingMessage(
    page: any,
    event: WebhookMessagingEvent,
  ): Promise<void> {
    const senderId = event.sender.id;
    const message = event.message!;
    const timestamp = new Date(event.timestamp);

    this.logger.log(`Incoming message from ${senderId}: ${message.text?.substring(0, 50) || '[attachment]'}`);

    // 1. Get or create contact
    let contact: { id: string; [key: string]: any } | null = await this.contactsService.findByPsidAndPage(
      page.workspaceId,
      senderId,
      page.id,
    );

    if (!contact) {
      // Auto-capture new contact
      contact = await this.contactsService.create(page.workspaceId, {
        pageId: page.id,
        psid: senderId,
        source: ContactSource.ORGANIC,
        // Profile will be fetched asynchronously
      });
      this.logger.log(`New contact captured: ${contact.id}`);

      // Queue profile fetch via BullMQ
      if (this.webhookQueue) {
        await this.webhookQueue.add(
          'profile-fetch',
          { pageId: page.id, contactId: contact.id, psid: senderId, accessToken: page.accessToken },
          { delay: 1000, attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
        );
        this.logger.debug(`Profile fetch queued for contact ${contact.id}`);
      }
    }

    // 2. Update contact's 24-hour window timestamp
    await this.contactsService.updateLastInteraction(
      contact!.id,
      timestamp,
      'received',
    );

    // 3. Get or create conversation
    let conversation: { id: string; status: ConversationStatus; [key: string]: any } | null = await this.conversationsService.findByContactAndPage(
      page.workspaceId,
      contact!.id,
      page.id,
    );

    if (!conversation) {
      const newConversation = await this.conversationsService.create(page.workspaceId, {
        pageId: page.id,
        contactId: contact!.id,
      });
      conversation = newConversation;
      this.logger.log(`New conversation created: ${conversation.id}`);
    } else {
      // Reopen conversation if it was resolved
      if (conversation.status === ConversationStatus.RESOLVED) {
        await this.conversationsService.update(
          page.workspaceId,
          conversation.id,
          { status: ConversationStatus.OPEN },
        );
      }
    }

    // 4. Store the message
    const storedMessage = await this.messagesService.processWebhookMessage(
      page.workspaceId,
      {
        conversationId: conversation.id,
        contactId: contact!.id,
        pageId: page.id,
        direction: 'INCOMING',
        facebookMessageId: message.mid,
        type: this.determineMessageType(message),
        content: message.text || null,
        attachments: message.attachments?.map((att) => ({
          type: att.type,
          url: att.payload?.url,
          stickerId: att.payload?.sticker_id,
        })),
        quickReplyPayload: message.quick_reply?.payload,
        replyToMessageId: message.reply_to?.mid,
        sentAt: timestamp,
      },
    );

    this.logger.log(`Message stored: ${storedMessage.id}`);

    // 5. Emit real-time event via Redis pub/sub for WebSocket consumers
    try {
      await this.redis.set(
        `event:new_message:${page.workspaceId}`,
        JSON.stringify({
          type: 'new_message',
          conversationId: conversation.id,
          messageId: storedMessage.id,
          contactId: contact!.id,
          pageId: page.id,
          preview: message.text?.substring(0, 100) || '[Attachment]',
          timestamp: timestamp.toISOString(),
        }),
        60, // 60s TTL — WebSocket consumers poll or subscribe
      );
    } catch (emitErr) {
      this.logger.warn(`Failed to emit real-time event: ${emitErr.message}`);
    }

    // 6. Update conversation unread count
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        unreadCount: { increment: 1 },
        lastMessageAt: timestamp,
        lastMessagePreview: message.text?.substring(0, 100) || '[Attachment]',
      },
    });
  }

  /**
   * Handle echo message (sent by page, including via our app)
   */
  private async handleEchoMessage(
    page: any,
    event: WebhookMessagingEvent,
  ): Promise<void> {
    const message = event.message!;
    this.logger.debug(`Echo message received: ${message.mid}`);

    // Update message status if we sent it
    if (message.mid) {
      await this.prisma.message.updateMany({
        where: {
          fbMessageId: message.mid,
          status: MessageStatus.PENDING,
        },
        data: {
          status: MessageStatus.SENT,
          sentAt: new Date(event.timestamp),
        },
      });
    }
  }

  /**
   * Handle postback (button click)
   */
  private async handlePostback(
    page: any,
    event: WebhookMessagingEvent,
  ): Promise<void> {
    const senderId = event.sender.id;
    const postback = event.postback!;
    const timestamp = new Date(event.timestamp);

    this.logger.log(`Postback from ${senderId}: ${postback.payload}`);

    // Get contact
    const contact = await this.contactsService.findByPsidAndPage(
      page.workspaceId,
      senderId,
      page.id,
    );

    if (!contact) {
      this.logger.warn(`Contact not found for postback: ${senderId}`);
      return;
    }

    // Update 24-hour window
    await this.contactsService.updateLastInteraction(contact.id, timestamp, 'received');

    // Log postback as activity
    try {
      await this.prisma.activityLog.create({
        data: {
          workspaceId: page.workspaceId,
          action: 'postback',
          entityType: 'contact',
          entityId: contact.id,
          details: {
            payload: postback.payload,
            title: postback.title,
            pageId: page.id,
            senderId,
            timestamp: timestamp.toISOString(),
          },
        },
      });
    } catch (activityErr) {
      this.logger.warn(`Failed to log postback activity: ${activityErr.message}`);
    }

    // Handle referral if present (e.g., Get Started button)
    if (postback.referral) {
      await this.processReferralData(page, contact, postback.referral);
    }
  }

  /**
   * Handle referral (from ads, m.me links, etc.)
   */
  private async handleReferral(
    page: any,
    event: WebhookMessagingEvent,
  ): Promise<void> {
    const senderId = event.sender.id;
    const referral = event.referral!;

    this.logger.log(`Referral from ${senderId}: source=${referral.source}, ref=${referral.ref}`);

    // Get or create contact
    let contact: { id: string; customFields?: any; source?: any; [key: string]: any } | null = await this.contactsService.findByPsidAndPage(
      page.workspaceId,
      senderId,
      page.id,
    );

    if (!contact) {
      // Determine source based on referral
      const source = referral.source === 'ADS' ? ContactSource.AD : 
                     referral.source === 'SHORTLINK' ? ContactSource.REFERRAL :
                     referral.source === 'CUSTOMER_CHAT_PLUGIN' ? ContactSource.ORGANIC :
                     ContactSource.ORGANIC;

      contact = await this.contactsService.create(page.workspaceId, {
        pageId: page.id,
        psid: senderId,
        source,
      });
    }

    await this.processReferralData(page, contact, referral);
  }

  /**
   * Process referral data and update contact
   */
  private async processReferralData(
    page: any,
    contact: any,
    referral: any,
  ): Promise<void> {
    // Update contact with referral info
    const customFields = contact.customFields || {};
    customFields.referral_source = referral.source;
    customFields.referral_ref = referral.ref;
    customFields.referral_ad_id = referral.ad_id;
    
    if (referral.ads_context_data) {
      customFields.ad_title = referral.ads_context_data.ad_title;
      customFields.ad_post_id = referral.ads_context_data.post_id;
    }

    await this.prisma.contact.update({
      where: { id: contact.id },
      data: {
        source: referral.source === 'ADS' ? ContactSource.AD : contact.source,
        customFields,
      },
    });
  }

  /**
   * Handle opt-in event (OTN, recurring notifications)
   */
  private async handleOptin(
    page: any,
    event: WebhookMessagingEvent,
  ): Promise<void> {
    const senderId = event.sender.id;
    const optin = event.optin!;

    this.logger.log(`Optin from ${senderId}: type=${optin.type || 'standard'}`);

    // Get contact
    const contact = await this.contactsService.findByPsidAndPage(
      page.workspaceId,
      senderId,
      page.id,
    );

    if (!contact) {
      this.logger.warn(`Contact not found for optin: ${senderId}`);
      return;
    }

    // Handle One-Time Notification token
    if (optin.one_time_notif_token) {
      await this.prisma.otnToken.create({
        data: {
          contactId: contact.id,
          pageId: page.id,
          token: optin.one_time_notif_token,
          payload: optin.payload || null,
          isUsed: false,
          optedInAt: new Date(event.timestamp),
          createdAt: new Date(event.timestamp),
        },
      });
      this.logger.log(`OTN token stored for contact ${contact.id}`);
    }

    // Handle Recurring Notification subscription
    if (optin.notification_messages_token) {
      const expiresAt = optin.token_expiry_timestamp 
        ? new Date(optin.token_expiry_timestamp * 1000)
        : null;

      await this.prisma.recurringSubscription.upsert({
        where: {
          contactId_pageId_topic: {
            contactId: contact.id,
            pageId: page.id,
            topic: optin.payload || 'default',
          },
        },
        create: {
          contactId: contact.id,
          pageId: page.id,
          token: optin.notification_messages_token,
          topic: optin.payload || 'default',
          frequency: optin.notification_messages_frequency || 'DAILY',
          status: 'ACTIVE',
          expiresAt,
          optedInAt: new Date(event.timestamp),
          createdAt: new Date(event.timestamp),
        },
        update: {
          token: optin.notification_messages_token,
          frequency: optin.notification_messages_frequency || 'DAILY',
          status: 'ACTIVE',
          expiresAt,
        },
      });
      this.logger.log(`Recurring subscription stored for contact ${contact.id}`);
    }

    // Handle recurring notification opt-out
    if (optin.notification_messages_status === 'STOP_NOTIFICATIONS') {
      await this.prisma.recurringSubscription.updateMany({
        where: {
          contactId: contact.id,
          pageId: page.id,
          topic: optin.payload || undefined,
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(event.timestamp),
        },
      });
      this.logger.log(`Recurring subscription stopped for contact ${contact.id}`);
    }
  }

  /**
   * Handle delivery receipt
   */
  private async handleDelivery(
    page: any,
    event: WebhookMessagingEvent,
  ): Promise<void> {
    const delivery = event.delivery!;
    const deliveredAt = new Date(delivery.watermark);

    this.logger.debug(`Delivery receipt: watermark=${delivery.watermark}`);

    // Update specific messages if IDs provided
    if (delivery.mids && delivery.mids.length > 0) {
      await this.prisma.message.updateMany({
        where: {
          fbMessageId: { in: delivery.mids },
          status: { in: [MessageStatus.SENT, MessageStatus.PENDING] },
        },
        data: {
          status: MessageStatus.DELIVERED,
          deliveredAt,
        },
      });
    } else {
      // Update all sent messages before watermark
      await this.prisma.message.updateMany({
        where: {
          pageId: page.id,
          direction: MessageDirection.OUTBOUND,
          status: { in: [MessageStatus.SENT, MessageStatus.PENDING] },
          sentAt: { lte: deliveredAt },
        },
        data: {
          status: MessageStatus.DELIVERED,
          deliveredAt,
        },
      });
    }
  }

  /**
   * Handle read receipt
   */
  private async handleRead(
    page: any,
    event: WebhookMessagingEvent,
  ): Promise<void> {
    const read = event.read!;
    const readAt = new Date(read.watermark);

    this.logger.debug(`Read receipt: watermark=${read.watermark}`);

    // Update all delivered messages before watermark
    await this.prisma.message.updateMany({
      where: {
        pageId: page.id,
        direction: MessageDirection.OUTBOUND,
        status: { in: [MessageStatus.SENT, MessageStatus.DELIVERED] },
        sentAt: { lte: readAt },
      },
      data: {
        status: MessageStatus.READ,
        readAt,
      },
    });
  }

  /**
   * Handle reaction event
   */
  private async handleReaction(
    page: any,
    event: WebhookMessagingEvent,
  ): Promise<void> {
    const reaction = event.reaction!;
    this.logger.debug(`Reaction ${reaction.action}: ${reaction.reaction} on ${reaction.mid}`);

    // Store reaction in message metadata
    if (reaction.mid) {
      try {
        const message = await this.prisma.message.findUnique({
          where: { fbMessageId: reaction.mid },
        });
        if (message) {
          const content = (message.content as Record<string, any>) || {};
          const reactions = (content.reactions as Record<string, string>) || {};
          if (reaction.action === 'react') {
            reactions[event.sender.id] = reaction.reaction || reaction.emoji;
          } else if (reaction.action === 'unreact') {
            delete reactions[event.sender.id];
          }
          await this.prisma.message.update({
            where: { id: message.id },
            data: { content: { ...content, reactions } },
          });
        }
      } catch (reactionErr) {
        this.logger.warn(`Failed to store reaction: ${reactionErr.message}`);
      }
    }
  }

  // ===========================================
  // Policy Enforcement & Handover Protocol
  // ===========================================

  /**
   * Handle policy enforcement event (warning, block, unblock)
   */
  private async handlePolicyEnforcement(
    page: any,
    event: WebhookMessagingEvent,
  ): Promise<void> {
    const policy = event['policy-enforcement']!;
    this.logger.warn(
      `Policy enforcement for page ${page.fbPageId}: action=${policy.action}, reason=${policy.reason || 'none'}`,
    );

    // Update page active status on block/unblock
    if (policy.action === 'block') {
      await this.prisma.page.update({
        where: { id: page.id },
        data: { isActive: false, tokenError: `Policy blocked: ${policy.reason || 'Unknown'}` },
      });
    } else if (policy.action === 'unblock') {
      await this.prisma.page.update({
        where: { id: page.id },
        data: { isActive: true, tokenError: null },
      });
    }

    // Log as activity
    await this.prisma.activityLog.create({
      data: {
        workspaceId: page.workspaceId,
        action: 'policy_enforcement',
        entityType: 'page',
        entityId: page.id,
        details: {
          fbPageId: page.fbPageId,
          policyAction: policy.action,
          reason: policy.reason,
        },
      },
    });
  }

  /**
   * Handle pass thread control (another app takes primary)
   */
  private async handlePassThreadControl(
    page: any,
    event: WebhookMessagingEvent,
  ): Promise<void> {
    const data = event.pass_thread_control!;
    const senderId = event.sender.id;
    this.logger.log(
      `Pass thread control for ${senderId}: new_owner=${data.new_owner_app_id}, metadata=${data.metadata || ''}`,
    );

    await this.prisma.activityLog.create({
      data: {
        workspaceId: page.workspaceId,
        action: 'pass_thread_control',
        entityType: 'page',
        entityId: page.id,
        details: {
          senderId,
          newOwnerAppId: data.new_owner_app_id,
          metadata: data.metadata,
        },
      },
    });
  }

  /**
   * Handle take thread control (we take primary back)
   */
  private async handleTakeThreadControl(
    page: any,
    event: WebhookMessagingEvent,
  ): Promise<void> {
    const data = event.take_thread_control!;
    const senderId = event.sender.id;
    this.logger.log(
      `Take thread control for ${senderId}: previous_owner=${data.previous_owner_app_id}, metadata=${data.metadata || ''}`,
    );

    await this.prisma.activityLog.create({
      data: {
        workspaceId: page.workspaceId,
        action: 'take_thread_control',
        entityType: 'page',
        entityId: page.id,
        details: {
          senderId,
          previousOwnerAppId: data.previous_owner_app_id,
          metadata: data.metadata,
        },
      },
    });
  }

  // ===========================================
  // Utility Methods
  // ===========================================

  /**
   * Determine message type from content
   */
  private determineMessageType(message: any): string {
    if (message.attachments && message.attachments.length > 0) {
      const firstAttachment = message.attachments[0];
      if (firstAttachment.type === 'image') return 'IMAGE';
      if (firstAttachment.type === 'video') return 'VIDEO';
      if (firstAttachment.type === 'audio') return 'AUDIO';
      if (firstAttachment.type === 'file') return 'FILE';
      if (firstAttachment.type === 'location') return 'LOCATION';
      if (firstAttachment.type === 'template') return 'TEMPLATE';
      return 'ATTACHMENT';
    }
    return 'TEXT';
  }
}
