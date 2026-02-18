import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageQueueService, MessageJobData } from '../messages/message-queue.service';
import { CampaignStatus, ABWinnerCriteria } from '@prisma/client';

// ===========================================
// A/B Testing Types
// ===========================================

export interface ABVariant {
  name: string;
  content: {
    text?: string;
    attachmentUrl?: string;
    attachmentType?: string;
    quickReplies?: any[];
  };
  percentage: number;
}

export interface ABVariantStats {
  name: string;
  percentage: number;
  recipientCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  openedCount: number;
  clickedCount: number;
  repliedCount: number;
  deliveryRate: number;
  responseRate: number;
  clickRate: number;
}

export interface ABTestResult {
  campaignId: string;
  isComplete: boolean;
  winnerVariant: string | null;
  winnerCriteria: ABWinnerCriteria | null;
  variants: ABVariantStats[];
}

// ===========================================
// A/B Testing Service
// ===========================================

@Injectable()
export class AbTestingService {
  private readonly logger = new Logger(AbTestingService.name);

  constructor(
    private prisma: PrismaService,
    private messageQueue: MessageQueueService,
  ) {}

  // ===========================================
  // Launch A/B Test Campaign
  // ===========================================

  /**
   * Launch an A/B test campaign - split audience among variants
   */
  async launchAbTest(
    workspaceId: string,
    campaignId: string,
  ): Promise<{ totalRecipients: number; variantSplits: Record<string, number> }> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (!campaign.isAbTest) {
      throw new BadRequestException('Campaign is not an A/B test');
    }

    const variants = campaign.abVariants as unknown as ABVariant[];
    if (!variants || variants.length < 2) {
      throw new BadRequestException('A/B test requires at least 2 variants');
    }

    // Validate percentages sum to 100
    const totalPct = variants.reduce((sum, v) => sum + v.percentage, 0);
    if (totalPct !== 100) {
      throw new BadRequestException(`Variant percentages must sum to 100, got ${totalPct}`);
    }

    // Get audience contacts
    const contactIds = await this.getAudienceContactIds(workspaceId, campaign);
    if (contactIds.length === 0) {
      throw new BadRequestException('No contacts found for audience');
    }

    const pageId = await this.getDefaultPageId(workspaceId, campaign);
    if (!pageId) {
      throw new BadRequestException('No active page available');
    }

    // Shuffle contacts for random split
    const shuffled = [...contactIds].sort(() => Math.random() - 0.5);

    // Split audience among variants
    const variantSplits: Record<string, number> = {};
    let offset = 0;

    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      const count =
        i === variants.length - 1
          ? shuffled.length - offset // Last variant gets remainder
          : Math.round((variant.percentage / 100) * shuffled.length);

      const variantContacts = shuffled.slice(offset, offset + count);
      variantSplits[variant.name] = variantContacts.length;
      offset += count;

      // Queue messages for this variant
      for (const contactId of variantContacts) {
        const jobData: MessageJobData = {
          contactId,
          pageId,
          workspaceId,
          content: {
            text: variant.content.text,
            attachmentUrl: variant.content.attachmentUrl,
            attachmentType: variant.content.attachmentType as any,
            quickReplies: variant.content.quickReplies,
          },
          campaignId,
          type: 'CAMPAIGN',
        };

        await this.messageQueue.addMessage(
          jobData,
        );
      }
    }

    // Update campaign status
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.RUNNING,
        startedAt: new Date(),
        totalRecipients: contactIds.length,
      },
    });

    this.logger.log(
      `A/B test campaign ${campaignId} launched: ${JSON.stringify(variantSplits)}`,
    );

    return { totalRecipients: contactIds.length, variantSplits };
  }

  // ===========================================
  // A/B Test Results
  // ===========================================

  /**
   * Get A/B test results with per-variant stats
   */
  async getAbTestResults(
    workspaceId: string,
    campaignId: string,
  ): Promise<ABTestResult> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId, isAbTest: true },
    });

    if (!campaign) {
      throw new NotFoundException('A/B test campaign not found');
    }

    const variants = campaign.abVariants as unknown as ABVariant[];
    if (!variants) {
      throw new BadRequestException('No variants defined');
    }

    // Get per-variant message stats
    const messages = await this.prisma.message.findMany({
      where: { campaignId },
      select: {
        status: true,
        content: true,
        direction: true,
      },
    });

    // Count replies per campaign
    const replies = await this.prisma.message.count({
      where: {
        campaignId,
        direction: 'INBOUND',
      },
    });

    // Build per-variant stats from message metadata
    // Since we store variant info in job metadata, we track by content matching
    const variantStats: ABVariantStats[] = variants.map(variant => {
      // Count messages matching this variant's content
      const variantMessages = messages.filter(m => {
        const content = m.content as any;
        return content?.text === variant.content.text;
      });

      const sent = variantMessages.filter(m => m.status !== 'PENDING' && m.status !== 'FAILED').length;
      const delivered = variantMessages.filter(m => m.status === 'DELIVERED' || m.status === 'READ').length;
      const failed = variantMessages.filter(m => m.status === 'FAILED').length;
      const read = variantMessages.filter(m => m.status === 'READ').length;
      const total = variantMessages.length || 1;

      return {
        name: variant.name,
        percentage: variant.percentage,
        recipientCount: variantMessages.length,
        sentCount: sent,
        deliveredCount: delivered,
        failedCount: failed,
        openedCount: read,
        clickedCount: 0, // Would track via webhook callbacks
        repliedCount: 0, // Would need per-variant reply tracking
        deliveryRate: Math.round((delivered / total) * 100),
        responseRate: 0,
        clickRate: 0,
      };
    });

    // Determine winner
    const isComplete = campaign.status === CampaignStatus.COMPLETED;
    let winnerVariant: string | null = null;

    if (variantStats.length > 0 && (isComplete || campaign.sentCount > 0)) {
      winnerVariant = this.determineWinner(
        variantStats,
        campaign.abWinnerCriteria || ABWinnerCriteria.DELIVERY,
      );
    }

    return {
      campaignId,
      isComplete,
      winnerVariant,
      winnerCriteria: campaign.abWinnerCriteria,
      variants: variantStats,
    };
  }

  /**
   * Determine the winning variant based on criteria
   */
  private determineWinner(
    variants: ABVariantStats[],
    criteria: ABWinnerCriteria,
  ): string {
    let best = variants[0];

    for (const v of variants) {
      switch (criteria) {
        case ABWinnerCriteria.DELIVERY:
          if (v.deliveryRate > best.deliveryRate) best = v;
          break;
        case ABWinnerCriteria.RESPONSE:
          if (v.responseRate > best.responseRate) best = v;
          break;
        case ABWinnerCriteria.CLICK:
          if (v.clickRate > best.clickRate) best = v;
          break;
      }
    }

    return best.name;
  }

  /**
   * Auto-send winning variant to remaining audience
   */
  async sendWinnerToRemaining(
    workspaceId: string,
    campaignId: string,
  ): Promise<{ additionalRecipients: number }> {
    const results = await this.getAbTestResults(workspaceId, campaignId);

    if (!results.winnerVariant) {
      throw new BadRequestException('No winner determined yet');
    }

    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');

    const variants = campaign.abVariants as unknown as ABVariant[];
    const winnerContent = variants.find(v => v.name === results.winnerVariant);
    if (!winnerContent) throw new BadRequestException('Winner variant not found');

    // Get contacts who already received messages
    const sentMessages = await this.prisma.message.findMany({
      where: { campaignId },
      select: { contactId: true },
    });
    const sentContactIds = new Set(sentMessages.map(m => m.contactId));

    // Get all audience contacts
    const allContactIds = await this.getAudienceContactIds(workspaceId, campaign);
    const remainingContactIds = allContactIds.filter(id => !sentContactIds.has(id));

    if (remainingContactIds.length === 0) {
      return { additionalRecipients: 0 };
    }

    const pageId = await this.getDefaultPageId(workspaceId, campaign);
    if (!pageId) throw new BadRequestException('No active page available');

    // Queue messages for remaining contacts with winning content
    for (const contactId of remainingContactIds) {
      const jobData: MessageJobData = {
        contactId,
        pageId,
        workspaceId,
        content: {
          text: winnerContent.content.text,
          attachmentUrl: winnerContent.content.attachmentUrl,
          attachmentType: winnerContent.content.attachmentType as any,
        },
        campaignId,
        type: 'CAMPAIGN',
      };

      await this.messageQueue.addMessage(
        jobData,
      );
    }

    this.logger.log(
      `Sent winner variant "${results.winnerVariant}" to ${remainingContactIds.length} remaining contacts`,
    );

    return { additionalRecipients: remainingContactIds.length };
  }

  // ===========================================
  // Helpers
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
