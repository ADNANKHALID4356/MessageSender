import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MessageQueueService, MessageJobData } from '../messages/message-queue.service';
import { CampaignStatus } from '@prisma/client';

// ===========================================
// Drip Campaign Types
// ===========================================

export interface DripStep {
  stepIndex: number;
  delayMinutes: number;
  content: {
    text?: string;
    attachmentUrl?: string;
    attachmentType?: 'image' | 'video' | 'audio' | 'file';
    quickReplies?: Array<{ content_type: string; title: string; payload: string }>;
  };
  condition?: string; // 'none' | 'replied' | 'not_replied' | 'clicked' | 'not_clicked'
}

export interface DripContactProgress {
  contactId: string;
  campaignId: string;
  currentStep: number;
  totalSteps: number;
  status: 'active' | 'completed' | 'removed' | 'paused';
  startedAt: string;
  lastStepAt?: string;
  nextStepAt?: string;
}

// ===========================================
// Drip Campaign Service
// ===========================================

@Injectable()
export class DripCampaignService {
  private readonly logger = new Logger(DripCampaignService.name);
  private readonly DRIP_PREFIX = 'drip:';
  private readonly PROGRESS_PREFIX = 'drip:progress:';

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private messageQueue: MessageQueueService,
  ) {}

  // ===========================================
  // Launch Drip Campaign
  // ===========================================

  /**
   * Launch a drip campaign - enroll all audience contacts in the sequence
   */
  async launchDripCampaign(
    workspaceId: string,
    campaignId: string,
  ): Promise<{ enrolledCount: number }> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.campaignType !== 'DRIP') {
      throw new BadRequestException('Campaign is not a drip campaign');
    }

    const dripSequence = campaign.dripSequence as unknown as DripStep[];
    if (!dripSequence || dripSequence.length === 0) {
      throw new BadRequestException('Drip campaign has no sequence steps defined');
    }

    // Get audience contact IDs
    const contactIds = await this.getAudienceContactIds(workspaceId, campaign);
    if (contactIds.length === 0) {
      throw new BadRequestException('No contacts found for this audience');
    }

    // Get default page for sending
    const pageId = await this.getDefaultPageId(workspaceId, campaign);
    if (!pageId) {
      throw new BadRequestException('No active page available for sending');
    }

    // Enroll all contacts in drip
    const now = new Date();
    for (const contactId of contactIds) {
      const progress: DripContactProgress = {
        contactId,
        campaignId,
        currentStep: 0,
        totalSteps: dripSequence.length,
        status: 'active',
        startedAt: now.toISOString(),
      };

      // Store progress in Redis
      await this.redis.set(
        `${this.PROGRESS_PREFIX}${campaignId}:${contactId}`,
        JSON.stringify(progress),
        30 * 24 * 60 * 60, // 30 day TTL
      );

      // Schedule first step
      await this.scheduleStep(campaignId, contactId, pageId, workspaceId, 0, dripSequence);
    }

    // Store campaign metadata
    await this.redis.set(
      `${this.DRIP_PREFIX}${campaignId}:meta`,
      JSON.stringify({
        workspaceId,
        pageId,
        enrolledCount: contactIds.length,
        totalSteps: dripSequence.length,
        launchedAt: now.toISOString(),
      }),
      30 * 24 * 60 * 60,
    );

    // Update campaign status
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.RUNNING,
        startedAt: now,
        totalRecipients: contactIds.length,
      },
    });

    this.logger.log(
      `Drip campaign ${campaignId} launched with ${contactIds.length} contacts, ${dripSequence.length} steps`,
    );

    return { enrolledCount: contactIds.length };
  }

  // ===========================================
  // Schedule & Process Steps
  // ===========================================

  /**
   * Schedule a drip step for a contact
   */
  private async scheduleStep(
    campaignId: string,
    contactId: string,
    pageId: string,
    workspaceId: string,
    stepIndex: number,
    dripSequence: DripStep[],
  ): Promise<void> {
    if (stepIndex >= dripSequence.length) return;

    const step = dripSequence[stepIndex];
    const delayMs = step.delayMinutes * 60 * 1000;

    // Queue the message with delay
    const jobData: MessageJobData = {
      contactId,
      pageId,
      workspaceId,
      content: {
        text: step.content.text,
        attachmentUrl: step.content.attachmentUrl,
        attachmentType: step.content.attachmentType,
        quickReplies: step.content.quickReplies?.map((qr: any) => ({
          content_type: 'text' as const,
          title: qr.title,
          payload: qr.payload,
        })),
      },
      campaignId,
      type: 'CAMPAIGN',
    };

    await this.messageQueue.addMessage(
      jobData,
    );

    // Update progress with next step schedule
    const progressKey = `${this.PROGRESS_PREFIX}${campaignId}:${contactId}`;
    const progressJson = await this.redis.get(progressKey);
    if (progressJson) {
      const progress = JSON.parse(progressJson) as DripContactProgress;
      progress.nextStepAt = new Date(Date.now() + delayMs).toISOString();
      await this.redis.set(progressKey, JSON.stringify(progress), 30 * 24 * 60 * 60);
    }
  }

  /**
   * Process completion of a drip step - advance to next step
   */
  async onStepCompleted(
    campaignId: string,
    contactId: string,
    completedStep: number,
  ): Promise<void> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign || campaign.status !== CampaignStatus.RUNNING) return;

    const dripSequence = campaign.dripSequence as unknown as DripStep[];
    if (!dripSequence) return;

    const progressKey = `${this.PROGRESS_PREFIX}${campaignId}:${contactId}`;
    const progressJson = await this.redis.get(progressKey);
    if (!progressJson) return;

    const progress = JSON.parse(progressJson) as DripContactProgress;
    if (progress.status !== 'active') return;

    const nextStep = completedStep + 1;

    if (nextStep >= dripSequence.length) {
      // Drip sequence complete for this contact
      progress.currentStep = completedStep;
      progress.status = 'completed';
      progress.lastStepAt = new Date().toISOString();
      progress.nextStepAt = undefined;
      await this.redis.set(progressKey, JSON.stringify(progress), 30 * 24 * 60 * 60);

      // Check if all contacts completed → campaign complete
      await this.checkCampaignCompletion(campaignId);
      return;
    }

    // Check condition for next step
    const nextStepDef = dripSequence[nextStep];
    if (nextStepDef.condition && nextStepDef.condition !== 'none') {
      const conditionMet = await this.evaluateStepCondition(
        campaignId,
        contactId,
        completedStep,
        nextStepDef.condition,
      );

      if (!conditionMet) {
        // Skip this step, try next
        progress.currentStep = nextStep;
        progress.lastStepAt = new Date().toISOString();
        await this.redis.set(progressKey, JSON.stringify(progress), 30 * 24 * 60 * 60);
        await this.onStepCompleted(campaignId, contactId, nextStep);
        return;
      }
    }

    // Schedule next step
    const metaJson = await this.redis.get(`${this.DRIP_PREFIX}${campaignId}:meta`);
    if (!metaJson) return;
    const meta = JSON.parse(metaJson);

    progress.currentStep = nextStep;
    progress.lastStepAt = new Date().toISOString();
    await this.redis.set(progressKey, JSON.stringify(progress), 30 * 24 * 60 * 60);

    await this.scheduleStep(
      campaignId,
      contactId,
      meta.pageId,
      meta.workspaceId,
      nextStep,
      dripSequence,
    );
  }

  /**
   * Evaluate condition for a drip step
   */
  private async evaluateStepCondition(
    campaignId: string,
    contactId: string,
    previousStep: number,
    condition: string,
  ): Promise<boolean> {
    // Check if the contact has replied/clicked in response to the previous step's message
    const recentMessages = await this.prisma.message.findMany({
      where: {
        contactId,
        campaignId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const hasReply = recentMessages.some(m => m.direction === 'INBOUND');
    const hasClick = recentMessages.some(
      m => m.status === 'READ' || (m.content as any)?.clicked,
    );

    switch (condition) {
      case 'replied':
        return hasReply;
      case 'not_replied':
        return !hasReply;
      case 'clicked':
        return hasClick;
      case 'not_clicked':
        return !hasClick;
      default:
        return true;
    }
  }

  // ===========================================
  // Contact Management
  // ===========================================

  /**
   * Remove a contact from an active drip campaign
   */
  async removeContactFromDrip(
    campaignId: string,
    contactId: string,
  ): Promise<void> {
    const progressKey = `${this.PROGRESS_PREFIX}${campaignId}:${contactId}`;
    const progressJson = await this.redis.get(progressKey);

    if (!progressJson) {
      throw new NotFoundException('Contact not enrolled in this drip campaign');
    }

    const progress = JSON.parse(progressJson) as DripContactProgress;
    progress.status = 'removed';
    await this.redis.set(progressKey, JSON.stringify(progress), 30 * 24 * 60 * 60);

    this.logger.log(`Removed contact ${contactId} from drip campaign ${campaignId}`);
  }

  /**
   * Get progress for a contact in a drip campaign
   */
  async getContactProgress(
    campaignId: string,
    contactId: string,
  ): Promise<DripContactProgress | null> {
    const progressKey = `${this.PROGRESS_PREFIX}${campaignId}:${contactId}`;
    const progressJson = await this.redis.get(progressKey);
    return progressJson ? JSON.parse(progressJson) : null;
  }

  /**
   * Get all active contacts in a drip campaign with their progress
   */
  async getCampaignDripProgress(
    campaignId: string,
  ): Promise<{
    totalEnrolled: number;
    active: number;
    completed: number;
    removed: number;
    stepBreakdown: Record<number, number>;
  }> {
    const metaJson = await this.redis.get(`${this.DRIP_PREFIX}${campaignId}:meta`);
    if (!metaJson) {
      throw new NotFoundException('Drip campaign metadata not found');
    }

    const meta = JSON.parse(metaJson);
    const pattern = `${this.PROGRESS_PREFIX}${campaignId}:*`;

    // Scan for all progress keys
    const client = this.redis.getClient();
    let cursor = '0';
    const allProgress: DripContactProgress[] = [];

    do {
      const result = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      const keys = result[1] as string[];

      for (const key of keys) {
        const val = await this.redis.get(key);
        if (val) allProgress.push(JSON.parse(val));
      }
    } while (cursor !== '0');

    const stepBreakdown: Record<number, number> = {};
    let active = 0;
    let completed = 0;
    let removed = 0;

    for (const p of allProgress) {
      if (p.status === 'active') {
        active++;
        stepBreakdown[p.currentStep] = (stepBreakdown[p.currentStep] || 0) + 1;
      } else if (p.status === 'completed') {
        completed++;
      } else if (p.status === 'removed') {
        removed++;
      }
    }

    return {
      totalEnrolled: meta.enrolledCount,
      active,
      completed,
      removed,
      stepBreakdown,
    };
  }

  // ===========================================
  // Completion Check
  // ===========================================

  private async checkCampaignCompletion(campaignId: string): Promise<void> {
    const progress = await this.getCampaignDripProgress(campaignId);

    if (progress.active === 0) {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: CampaignStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
      this.logger.log(`Drip campaign ${campaignId} completed`);
    }
  }

  // ===========================================
  // Helpers (duplicated from CampaignsService for decoupling)
  // ===========================================

  private async getAudienceContactIds(workspaceId: string, campaign: any): Promise<string[]> {
    switch (campaign.audienceType) {
      case 'ALL': {
        const contacts = await this.prisma.contact.findMany({
          where: { workspaceId, isSubscribed: true },
          select: { id: true },
        });
        return contacts.map(c => c.id);
      }
      case 'SEGMENT': {
        if (!campaign.audienceSegmentId) return [];
        const sc = await this.prisma.segmentContact.findMany({
          where: { segmentId: campaign.audienceSegmentId },
          select: { contactId: true },
        });
        return sc.map(s => s.contactId);
      }
      case 'PAGES': {
        const contacts = await this.prisma.contact.findMany({
          where: { workspaceId, pageId: { in: campaign.audiencePageIds }, isSubscribed: true },
          select: { id: true },
        });
        return contacts.map(c => c.id);
      }
      case 'MANUAL':
        return campaign.audienceContactIds || [];
      default:
        return [];
    }
  }

  private async getDefaultPageId(workspaceId: string, campaign: any): Promise<string | null> {
    if (campaign.audiencePageIds?.length > 0) return campaign.audiencePageIds[0];
    const page = await this.prisma.page.findFirst({
      where: { workspaceId, isActive: true },
      select: { id: true },
    });
    return page?.id || null;
  }
}
