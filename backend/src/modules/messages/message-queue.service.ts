import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// ===========================================
// Types
// ===========================================

export interface MessageJobData {
  type: 'SINGLE' | 'BULK' | 'CAMPAIGN';
  workspaceId: string;
  pageId: string;
  contactId?: string;
  contactIds?: string[];
  campaignId?: string;
  content: {
    text?: string;
    attachmentUrl?: string;
    attachmentType?: 'image' | 'video' | 'audio' | 'file';
    quickReplies?: Array<{
      content_type: 'text';
      title: string;
      payload: string;
    }>;
  };
  options?: {
    bypassMethod?: 'MESSAGE_TAG' | 'OTN_TOKEN' | 'RECURRING_NOTIFICATION';
    messageTag?: string;
    otnTokenId?: string;
    subscriptionId?: string;
    scheduledAt?: Date;
    priority?: number;
  };
}

export interface JobResult {
  success: boolean;
  messageId?: string;
  fbMessageId?: string;
  error?: string;
  contactId?: string;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

// ===========================================
// Message Queue Service
// ===========================================

@Injectable()
export class MessageQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessageQueueService.name);
  
  // Queues
  private messageQueue: Queue<MessageJobData>;
  private campaignQueue: Queue<MessageJobData>;
  private scheduledQueue: Queue<MessageJobData>;
  
  // Queue events for monitoring
  private messageQueueEvents: QueueEvents;
  private campaignQueueEvents: QueueEvents;
  
  // Workers will be created separately (in processor modules)
  private workers: Map<string, Worker> = new Map();

  // Queue names
  static readonly QUEUES = {
    MESSAGES: 'message-queue',
    CAMPAIGNS: 'campaign-queue',
    SCHEDULED: 'scheduled-queue',
  };

  // Job options defaults
  private readonly DEFAULT_JOB_OPTIONS = {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 1000,
    },
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs
      age: 24 * 60 * 60, // Keep for 24 hours
    },
    removeOnFail: {
      count: 5000, // Keep more failed jobs for debugging
      age: 7 * 24 * 60 * 60, // Keep for 7 days
    },
  };

  // BullMQ requires dedicated Redis connection with maxRetriesPerRequest: null
  private bullMqConnection: Redis;

  constructor(
    private config: ConfigService,
  ) {}

  // ===========================================
  // Lifecycle
  // ===========================================

  async onModuleInit() {
    // Create a dedicated Redis connection for BullMQ with required options
    this.bullMqConnection = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get('REDIS_PORT', 6379),
      password: this.config.get('REDIS_PASSWORD'),
      db: this.config.get('REDIS_DB', 0),
      maxRetriesPerRequest: null, // Required for BullMQ
    });

    // Initialize queues
    this.messageQueue = new Queue(MessageQueueService.QUEUES.MESSAGES, {
      connection: this.bullMqConnection,
      defaultJobOptions: this.DEFAULT_JOB_OPTIONS,
    });

    this.campaignQueue = new Queue(MessageQueueService.QUEUES.CAMPAIGNS, {
      connection: this.bullMqConnection,
      defaultJobOptions: {
        ...this.DEFAULT_JOB_OPTIONS,
        attempts: 1, // Campaign messages: don't retry individual messages
      },
    });

    this.scheduledQueue = new Queue(MessageQueueService.QUEUES.SCHEDULED, {
      connection: this.bullMqConnection,
      defaultJobOptions: this.DEFAULT_JOB_OPTIONS,
    });

    // Initialize queue events for monitoring
    this.messageQueueEvents = new QueueEvents(MessageQueueService.QUEUES.MESSAGES, {
      connection: this.bullMqConnection,
    });

    this.campaignQueueEvents = new QueueEvents(MessageQueueService.QUEUES.CAMPAIGNS, {
      connection: this.bullMqConnection,
    });

    // Set up event listeners
    this.setupEventListeners();

    this.logger.log('Message queues initialized');
  }

  async onModuleDestroy() {
    // Close all queues
    await Promise.all([
      this.messageQueue?.close(),
      this.campaignQueue?.close(),
      this.scheduledQueue?.close(),
      this.messageQueueEvents?.close(),
      this.campaignQueueEvents?.close(),
    ]);

    // Close all workers
    for (const worker of this.workers.values()) {
      await worker.close();
    }

    // Close the BullMQ Redis connection
    if (this.bullMqConnection) {
      await this.bullMqConnection.quit();
    }

    this.logger.log('Message queues closed');
  }

  // ===========================================
  // Add Jobs
  // ===========================================

  /**
   * Add a single message to the queue
   */
  async addMessage(data: MessageJobData, priority: number = 0): Promise<Job<MessageJobData>> {
    const job = await this.messageQueue.add('send-message', data, {
      priority,
      jobId: `msg-${data.contactId}-${Date.now()}`,
    });

    this.logger.debug(`Message job added: ${job.id}`);
    return job;
  }

  /**
   * Add bulk messages for a campaign
   */
  async addCampaignMessages(
    campaignId: string,
    workspaceId: string,
    pageId: string,
    contactIds: string[],
    content: MessageJobData['content'],
    options?: MessageJobData['options'],
  ): Promise<{ batchId: string; jobCount: number }> {
    const batchId = `campaign-${campaignId}-${Date.now()}`;
    const jobs: Array<{ name: string; data: MessageJobData; opts: any }> = [];

    // Create individual jobs for each contact
    for (let i = 0; i < contactIds.length; i++) {
      jobs.push({
        name: 'send-campaign-message',
        data: {
          type: 'CAMPAIGN',
          workspaceId,
          pageId,
          contactId: contactIds[i],
          campaignId,
          content,
          options,
        },
        opts: {
          jobId: `${batchId}-${i}`,
          delay: i * 50, // 50ms delay between messages to spread load
        },
      });
    }

    // Add all jobs in bulk
    await this.campaignQueue.addBulk(jobs);

    this.logger.log(`Campaign batch added: ${batchId}, ${jobs.length} jobs`);

    return {
      batchId,
      jobCount: jobs.length,
    };
  }

  /**
   * Schedule a message for later
   */
  async scheduleMessage(
    data: MessageJobData,
    scheduledAt: Date,
  ): Promise<Job<MessageJobData>> {
    const delay = scheduledAt.getTime() - Date.now();
    
    if (delay < 0) {
      throw new Error('Scheduled time must be in the future');
    }

    const job = await this.scheduledQueue.add('scheduled-message', data, {
      delay,
      jobId: `scheduled-${data.contactId}-${scheduledAt.getTime()}`,
    });

    this.logger.debug(`Scheduled message job added: ${job.id}, delay: ${delay}ms`);
    return job;
  }

  /**
   * Add broadcast message to all contacts on a page
   */
  async addBroadcast(
    workspaceId: string,
    pageId: string,
    contactIds: string[],
    content: MessageJobData['content'],
    options?: MessageJobData['options'],
  ): Promise<{ batchId: string; jobCount: number }> {
    const batchId = `broadcast-${pageId}-${Date.now()}`;
    const jobs: Array<{ name: string; data: MessageJobData; opts: any }> = [];

    for (let i = 0; i < contactIds.length; i++) {
      jobs.push({
        name: 'send-broadcast',
        data: {
          type: 'BULK',
          workspaceId,
          pageId,
          contactId: contactIds[i],
          content,
          options,
        },
        opts: {
          jobId: `${batchId}-${i}`,
          delay: i * 100, // 100ms delay for broadcasts (more conservative)
        },
      });
    }

    await this.messageQueue.addBulk(jobs);

    this.logger.log(`Broadcast batch added: ${batchId}, ${jobs.length} jobs`);

    return {
      batchId,
      jobCount: jobs.length,
    };
  }

  // ===========================================
  // Job Management
  // ===========================================

  /**
   * Get job by ID
   */
  async getJob(queueName: string, jobId: string): Promise<Job<MessageJobData> | null> {
    const queue = this.getQueue(queueName);
    if (!queue) return null;
    const job = await queue.getJob(jobId);
    return job ?? null;
  }

  /**
   * Get job status
   */
  async getJobStatus(queueName: string, jobId: string): Promise<string | null> {
    const job = await this.getJob(queueName, jobId);
    return job?.getState() || null;
  }

  /**
   * Cancel a job
   */
  async cancelJob(queueName: string, jobId: string): Promise<boolean> {
    const job = await this.getJob(queueName, jobId);
    if (job) {
      await job.remove();
      return true;
    }
    return false;
  }

  /**
   * Retry a failed job
   */
  async retryJob(queueName: string, jobId: string): Promise<boolean> {
    const job = await this.getJob(queueName, jobId);
    if (job) {
      await job.retry();
      return true;
    }
    return false;
  }

  // ===========================================
  // Queue Stats & Monitoring
  // ===========================================

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<QueueStats> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Get all queue stats
   */
  async getAllQueueStats(): Promise<Record<string, QueueStats>> {
    const [messages, campaigns, scheduled] = await Promise.all([
      this.getQueueStats(MessageQueueService.QUEUES.MESSAGES),
      this.getQueueStats(MessageQueueService.QUEUES.CAMPAIGNS),
      this.getQueueStats(MessageQueueService.QUEUES.SCHEDULED),
    ]);

    return {
      messages,
      campaigns,
      scheduled,
    };
  }

  /**
   * Get failed jobs
   */
  async getFailedJobs(queueName: string, start = 0, end = 20): Promise<Job<MessageJobData>[]> {
    const queue = this.getQueue(queueName);
    return queue?.getFailed(start, end) || [];
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (queue) {
      await queue.pause();
      this.logger.log(`Queue paused: ${queueName}`);
    }
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (queue) {
      await queue.resume();
      this.logger.log(`Queue resumed: ${queueName}`);
    }
  }

  /**
   * Clean old jobs from a queue
   */
  async cleanQueue(
    queueName: string,
    gracePeriod: number = 24 * 60 * 60 * 1000,
    status: 'completed' | 'failed' = 'completed',
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    if (queue) {
      await queue.clean(gracePeriod, 1000, status);
      this.logger.log(`Queue cleaned: ${queueName}, status: ${status}`);
    }
  }

  // ===========================================
  // Campaign Progress
  // ===========================================

  /**
   * Get campaign progress by batch ID
   */
  async getCampaignProgress(batchId: string): Promise<{
    total: number;
    completed: number;
    failed: number;
    pending: number;
    progress: number;
  }> {
    // Get all jobs matching the batch ID pattern
    const jobs = await this.campaignQueue.getJobs(['completed', 'failed', 'waiting', 'active', 'delayed']);
    
    const batchJobs = jobs.filter(job => job.id?.startsWith(batchId));
    const total = batchJobs.length;
    
    if (total === 0) {
      return { total: 0, completed: 0, failed: 0, pending: 0, progress: 0 };
    }

    const states = await Promise.all(batchJobs.map(job => job.getState()));
    
    const completed = states.filter(s => s === 'completed').length;
    const failed = states.filter(s => s === 'failed').length;
    const pending = total - completed - failed;

    return {
      total,
      completed,
      failed,
      pending,
      progress: Math.round((completed / total) * 100),
    };
  }

  // ===========================================
  // Helpers
  // ===========================================

  private getQueue(queueName: string): Queue<MessageJobData> | null {
    switch (queueName) {
      case MessageQueueService.QUEUES.MESSAGES:
        return this.messageQueue;
      case MessageQueueService.QUEUES.CAMPAIGNS:
        return this.campaignQueue;
      case MessageQueueService.QUEUES.SCHEDULED:
        return this.scheduledQueue;
      default:
        return null;
    }
  }

  private setupEventListeners() {
    // Message queue events
    this.messageQueueEvents.on('completed', ({ jobId, returnvalue }) => {
      this.logger.debug(`Message job completed: ${jobId}`);
    });

    this.messageQueueEvents.on('failed', ({ jobId, failedReason }) => {
      this.logger.error(`Message job failed: ${jobId}, reason: ${failedReason}`);
    });

    // Campaign queue events
    this.campaignQueueEvents.on('completed', ({ jobId }) => {
      this.logger.debug(`Campaign job completed: ${jobId}`);
    });

    this.campaignQueueEvents.on('failed', ({ jobId, failedReason }) => {
      this.logger.error(`Campaign job failed: ${jobId}, reason: ${failedReason}`);
    });
  }

  // ===========================================
  // Access to queues for workers
  // ===========================================

  getMessageQueue(): Queue<MessageJobData> {
    return this.messageQueue;
  }

  getCampaignQueue(): Queue<MessageJobData> {
    return this.campaignQueue;
  }

  getScheduledQueue(): Queue<MessageJobData> {
    return this.scheduledQueue;
  }
}
