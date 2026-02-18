import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { SendApiService, MessageContent } from './send-api.service';
import { RateLimitService } from './rate-limit.service';
import { MessageQueueService, MessageJobData, JobResult } from './message-queue.service';
import { MessageStatus, MessageType } from '@prisma/client';

@Injectable()
export class MessageWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessageWorkerService.name);
  private messageWorker: Worker;
  private campaignWorker: Worker;
  private scheduledWorker: Worker;
  private connection: Redis;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private sendApiService: SendApiService,
    private rateLimitService: RateLimitService,
  ) {}

  async onModuleInit() {
    this.connection = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get('REDIS_PORT', 6379),
      password: this.config.get('REDIS_PASSWORD'),
      db: this.config.get('REDIS_DB', 0),
      maxRetriesPerRequest: null,
    });

    // --- Message Queue Worker ---
    this.messageWorker = new Worker(
      MessageQueueService.QUEUES.MESSAGES,
      async (job: Job<MessageJobData>) => {
        return this.processMessage(job);
      },
      {
        connection: this.connection,
        concurrency: 5,
        limiter: {
          max: 200,
          duration: 3600000, // 200 per hour per queue
        },
      },
    );

    this.messageWorker.on('completed', (job) => {
      this.logger.debug(`Message job ${job.id} completed`);
    });

    this.messageWorker.on('failed', (job, err) => {
      this.logger.error(`Message job ${job?.id} failed: ${err.message}`);
    });

    // --- Campaign Queue Worker ---
    this.campaignWorker = new Worker(
      MessageQueueService.QUEUES.CAMPAIGNS,
      async (job: Job<MessageJobData>) => {
        return this.processCampaignMessage(job);
      },
      {
        connection: this.connection,
        concurrency: 3,
        limiter: {
          max: 200,
          duration: 3600000,
        },
      },
    );

    this.campaignWorker.on('completed', (job) => {
      this.logger.debug(`Campaign job ${job.id} completed`);
    });

    this.campaignWorker.on('failed', (job, err) => {
      this.logger.error(`Campaign job ${job?.id} failed: ${err.message}`);
    });

    // --- Scheduled Queue Worker ---
    this.scheduledWorker = new Worker(
      MessageQueueService.QUEUES.SCHEDULED,
      async (job: Job<MessageJobData>) => {
        return this.processMessage(job);
      },
      {
        connection: this.connection,
        concurrency: 5,
      },
    );

    this.logger.log('Message workers initialized');
  }

  async onModuleDestroy() {
    await Promise.all([
      this.messageWorker?.close(),
      this.campaignWorker?.close(),
      this.scheduledWorker?.close(),
    ]);
    if (this.connection) {
      await this.connection.quit();
    }
    this.logger.log('Message workers shut down');
  }

  // ===========================================
  // PROCESSORS
  // ===========================================

  /**
   * Process a single message job
   */
  private async processMessage(job: Job<MessageJobData>): Promise<JobResult> {
    const { contactId, pageId, workspaceId, content, options } = job.data;

    if (!contactId) {
      return { success: false, error: 'Missing contactId' };
    }

    try {
      // Check rate limit
      const rateLimitOk = await this.rateLimitService.checkPageMessageLimit(pageId);
      if (!rateLimitOk) {
        // Re-queue with delay
        throw new Error('Rate limit exceeded, will retry');
      }

      await this.rateLimitService.consumePageMessageQuota(pageId);

      // Build message content
      const messageContent: MessageContent = {
        text: content.text,
        attachmentUrl: content.attachmentUrl,
        attachmentType: content.attachmentType,
        quickReplies: content.quickReplies,
      };

      // Send via Send API
      const result = await this.sendApiService.sendMessage({
        contactId,
        pageId,
        workspaceId,
        messageType: content.attachmentUrl ? MessageType.IMAGE : MessageType.TEXT,
        content: messageContent,
        bypassMethod: options?.bypassMethod as any,
        messageTag: options?.messageTag as any,
        otnTokenId: options?.otnTokenId,
        recurringSubscriptionId: options?.subscriptionId,
      });

      return {
        success: result.success,
        messageId: result.messageId,
        fbMessageId: result.fbMessageId,
        contactId,
        error: result.error,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Failed to process message for contact ${contactId}: ${errMsg}`);
      throw err; // Let BullMQ retry
    }
  }

  /**
   * Process a campaign message job
   */
  private async processCampaignMessage(job: Job<MessageJobData>): Promise<JobResult> {
    const { contactId, pageId, workspaceId, campaignId, content, options } = job.data;

    if (!contactId || !campaignId) {
      return { success: false, error: 'Missing contactId or campaignId' };
    }

    try {
      // Check rate limit
      const rateLimitOk = await this.rateLimitService.checkPageMessageLimit(pageId);
      if (!rateLimitOk) {
        throw new Error('Rate limit exceeded, will retry');
      }

      await this.rateLimitService.consumePageMessageQuota(pageId);

      const messageContent: MessageContent = {
        text: content.text,
        attachmentUrl: content.attachmentUrl,
        attachmentType: content.attachmentType,
        quickReplies: content.quickReplies,
      };

      const result = await this.sendApiService.sendMessage({
        contactId,
        pageId,
        workspaceId,
        campaignId,
        messageType: content.attachmentUrl ? MessageType.IMAGE : MessageType.TEXT,
        content: messageContent,
        bypassMethod: options?.bypassMethod as any,
        messageTag: options?.messageTag as any,
      });

      // Update campaign stats
      if (result.success) {
        await this.prisma.campaign.update({
          where: { id: campaignId },
          data: { sentCount: { increment: 1 } },
        });
      } else {
        await this.prisma.campaign.update({
          where: { id: campaignId },
          data: { failedCount: { increment: 1 } },
        });
      }

      // Check if campaign is complete
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { totalRecipients: true, sentCount: true, failedCount: true },
      });

      if (campaign && campaign.sentCount + campaign.failedCount >= campaign.totalRecipients) {
        await this.prisma.campaign.update({
          where: { id: campaignId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });
        this.logger.log(`Campaign ${campaignId} completed`);
      }

      return {
        success: result.success,
        messageId: result.messageId,
        fbMessageId: result.fbMessageId,
        contactId,
        error: result.error,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Campaign message failed for contact ${contactId}: ${errMsg}`);

      // Update fail count
      if (campaignId) {
        await this.prisma.campaign.update({
          where: { id: campaignId },
          data: { failedCount: { increment: 1 } },
        });
      }

      return {
        success: false,
        contactId,
        error: errMsg,
      };
    }
  }
}
