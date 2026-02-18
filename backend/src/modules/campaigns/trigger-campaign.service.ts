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
// Trigger Campaign Types
// ===========================================

export interface TriggerCondition {
  type: 'new_contact' | 'tag_added' | 'tag_removed' | 'engagement_change' | 'custom_field_match' | 'inactivity';
  field?: string;       // For custom_field_match or engagement_change
  operator?: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
  value?: any;          // Expected value
  tagName?: string;     // For tag_added/tag_removed
  inactivityDays?: number; // For inactivity trigger
}

export interface TriggerCampaignConfig {
  conditions: TriggerCondition[];
  matchAll: boolean; // true = AND, false = OR
  cooldownMinutes: number; // Minimum time between triggers per contact
  maxTriggersPerContact: number; // 0 = unlimited
}

// ===========================================
// Trigger Campaign Service
// ===========================================

@Injectable()
export class TriggerCampaignService {
  private readonly logger = new Logger(TriggerCampaignService.name);
  private readonly TRIGGER_PREFIX = 'trigger:';

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private messageQueue: MessageQueueService,
  ) {}

  // ===========================================
  // Activate / Deactivate Triggers
  // ===========================================

  /**
   * Activate a trigger-based campaign
   */
  async activateTrigger(
    workspaceId: string,
    campaignId: string,
  ): Promise<void> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId, campaignType: 'TRIGGER' },
    });

    if (!campaign) {
      throw new NotFoundException('Trigger campaign not found');
    }

    // Store trigger config in Redis for fast lookup
    const triggerConfig: TriggerCampaignConfig = (campaign.recurringPattern as any) || {
      conditions: [],
      matchAll: true,
      cooldownMinutes: 60,
      maxTriggersPerContact: 1,
    };

    await this.redis.set(
      `${this.TRIGGER_PREFIX}active:${campaignId}`,
      JSON.stringify({
        workspaceId,
        campaignId,
        config: triggerConfig,
        messageContent: campaign.messageContent,
        bypassMethod: campaign.bypassMethod,
        messageTag: campaign.messageTag,
      }),
      0, // No expiry - stays active until deactivated
    );

    // Add to workspace's active triggers list
    const client = this.redis.getClient();
    await client.sadd(`${this.TRIGGER_PREFIX}workspace:${workspaceId}`, campaignId);

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.RUNNING, startedAt: new Date() },
    });

    this.logger.log(`Trigger campaign ${campaignId} activated`);
  }

  /**
   * Deactivate a trigger-based campaign
   */
  async deactivateTrigger(
    workspaceId: string,
    campaignId: string,
  ): Promise<void> {
    await this.redis.del(`${this.TRIGGER_PREFIX}active:${campaignId}`);

    const client = this.redis.getClient();
    await client.srem(`${this.TRIGGER_PREFIX}workspace:${workspaceId}`, campaignId);

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.PAUSED },
    });

    this.logger.log(`Trigger campaign ${campaignId} deactivated`);
  }

  // ===========================================
  // Event Evaluation
  // ===========================================

  /**
   * Evaluate all active triggers when a contact event occurs
   */
  async evaluateContactEvent(
    workspaceId: string,
    contactId: string,
    eventType: TriggerCondition['type'],
    eventData?: Record<string, any>,
  ): Promise<{ triggered: string[] }> {
    const client = this.redis.getClient();
    const activeCampaignIds = await client.smembers(
      `${this.TRIGGER_PREFIX}workspace:${workspaceId}`,
    );

    const triggered: string[] = [];

    for (const campaignId of activeCampaignIds) {
      const configJson = await this.redis.get(`${this.TRIGGER_PREFIX}active:${campaignId}`);
      if (!configJson) continue;

      const triggerData = JSON.parse(configJson);
      const config: TriggerCampaignConfig = triggerData.config;

      // Check cooldown
      const cooldownKey = `${this.TRIGGER_PREFIX}cooldown:${campaignId}:${contactId}`;
      const cooldownActive = await this.redis.get(cooldownKey);
      if (cooldownActive) continue;

      // Check max triggers
      if (config.maxTriggersPerContact > 0) {
        const triggerCountKey = `${this.TRIGGER_PREFIX}count:${campaignId}:${contactId}`;
        const countStr = await this.redis.get(triggerCountKey);
        const count = countStr ? parseInt(countStr, 10) : 0;
        if (count >= config.maxTriggersPerContact) continue;
      }

      // Evaluate conditions
      const conditionResults = await Promise.all(
        config.conditions.map(c => this.evaluateCondition(c, contactId, eventType, eventData)),
      );

      const shouldTrigger = config.matchAll
        ? conditionResults.every(Boolean)
        : conditionResults.some(Boolean);

      if (shouldTrigger) {
        await this.triggerForContact(campaignId, contactId, triggerData);
        triggered.push(campaignId);

        // Set cooldown
        if (config.cooldownMinutes > 0) {
          await this.redis.set(cooldownKey, '1', config.cooldownMinutes * 60);
        }

        // Increment trigger count
        const triggerCountKey = `${this.TRIGGER_PREFIX}count:${campaignId}:${contactId}`;
        const client2 = this.redis.getClient();
        await client2.incr(triggerCountKey);
      }
    }

    return { triggered };
  }

  /**
   * Evaluate a single condition against a contact event
   */
  private async evaluateCondition(
    condition: TriggerCondition,
    contactId: string,
    eventType: TriggerCondition['type'],
    eventData?: Record<string, any>,
  ): Promise<boolean> {
    // Short circuit: if condition type doesn't match event type, skip
    if (condition.type !== eventType) return false;

    switch (condition.type) {
      case 'new_contact':
        return true; // Simply being a new contact triggers it

      case 'tag_added':
        return eventData?.tagName === condition.tagName;

      case 'tag_removed':
        return eventData?.tagName === condition.tagName;

      case 'engagement_change': {
        const contact = await this.prisma.contact.findUnique({
          where: { id: contactId },
          select: { engagementLevel: true },
        });
        return contact?.engagementLevel === condition.value;
      }

      case 'custom_field_match': {
        const contact = await this.prisma.contact.findUnique({
          where: { id: contactId },
          select: { customFields: true },
        });
        const fields = (contact?.customFields as any) || {};
        const fieldValue = fields[condition.field || ''];

        switch (condition.operator) {
          case 'equals':
            return fieldValue === condition.value;
          case 'contains':
            return String(fieldValue || '').includes(String(condition.value));
          case 'greater_than':
            return Number(fieldValue) > Number(condition.value);
          case 'less_than':
            return Number(fieldValue) < Number(condition.value);
          case 'in':
            return Array.isArray(condition.value) && condition.value.includes(fieldValue);
          default:
            return false;
        }
      }

      case 'inactivity': {
        const contact = await this.prisma.contact.findUnique({
          where: { id: contactId },
          select: { lastInteractionAt: true },
        });
        if (!contact?.lastInteractionAt) return true;
        const daysSince = (Date.now() - contact.lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince >= (condition.inactivityDays || 7);
      }

      default:
        return false;
    }
  }

  // ===========================================
  // Trigger Execution
  // ===========================================

  /**
   * Trigger a campaign message for a specific contact
   */
  private async triggerForContact(
    campaignId: string,
    contactId: string,
    triggerData: any,
  ): Promise<void> {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      select: { id: true, pageId: true },
    });

    if (!contact) return;

    const content = triggerData.messageContent as any;

    const jobData: MessageJobData = {
      contactId,
      pageId: contact.pageId,
      workspaceId: triggerData.workspaceId,
      content: {
        text: content?.text,
        attachmentUrl: content?.attachmentUrl,
        attachmentType: content?.attachmentType,
        quickReplies: content?.quickReplies,
      },
      campaignId,
      type: 'CAMPAIGN',
      options: {
        bypassMethod: triggerData.bypassMethod,
        messageTag: triggerData.messageTag,
      },
    };

    await this.messageQueue.addMessage(
      jobData,
    );

    // Increment campaign sent count
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { sentCount: { increment: 1 } },
    });

    this.logger.log(
      `Trigger campaign ${campaignId} fired for contact ${contactId}`,
    );
  }

  // ===========================================
  // Query Active Triggers
  // ===========================================

  /**
   * Get all active trigger campaigns for a workspace
   */
  async getActiveTriggers(workspaceId: string): Promise<string[]> {
    const client = this.redis.getClient();
    return client.smembers(`${this.TRIGGER_PREFIX}workspace:${workspaceId}`);
  }

  /**
   * Get trigger stats for a campaign
   */
  async getTriggerStats(
    workspaceId: string,
    campaignId: string,
  ): Promise<{
    isActive: boolean;
    totalTriggered: number;
    uniqueContacts: number;
  }> {
    const configJson = await this.redis.get(`${this.TRIGGER_PREFIX}active:${campaignId}`);
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
      select: { sentCount: true, status: true },
    });

    return {
      isActive: !!configJson && campaign?.status === CampaignStatus.RUNNING,
      totalTriggered: campaign?.sentCount || 0,
      uniqueContacts: campaign?.sentCount || 0, // Approximation
    };
  }
}
