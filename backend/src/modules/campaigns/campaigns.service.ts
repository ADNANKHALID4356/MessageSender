import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageQueueService, MessageJobData } from '../messages/message-queue.service';
import { RateLimitService } from '../messages/rate-limit.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignListQueryDto,
  CampaignResponse,
  CampaignStatsResponse,
  CampaignListResponse,
} from './dto';
import {
  CampaignStatus,
  CampaignType,
  AudienceType,
  BypassMethod,
  Prisma,
} from '@prisma/client';

// ===========================================
// Campaigns Service
// ===========================================

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private prisma: PrismaService,
    private messageQueue: MessageQueueService,
    private rateLimit: RateLimitService,
  ) {}

  // ===========================================
  // CRUD Operations
  // ===========================================

  /**
   * Create a new campaign
   */
  async create(
    workspaceId: string,
    userId: string,
    dto: CreateCampaignDto,
  ): Promise<CampaignResponse> {
    // Validate audience
    await this.validateAudience(workspaceId, dto);

    // Calculate total recipients
    const totalRecipients = await this.calculateRecipientCount(workspaceId, dto);

    // Create campaign
    const campaign = await this.prisma.campaign.create({
      data: {
        workspaceId,
        createdByUserId: userId,
        name: dto.name,
        description: dto.description,
        campaignType: dto.campaignType,
        status: CampaignStatus.DRAFT,
        audienceType: dto.audienceType,
        audienceSegmentId: dto.audienceSegmentId,
        audiencePageIds: dto.audiencePageIds || [],
        audienceContactIds: dto.audienceContactIds || [],
        messageContent: dto.messageContent as any,
        bypassMethod: dto.bypassMethod,
        messageTag: dto.messageTag,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        timezone: dto.timezone || 'UTC',
        recurringPattern: dto.recurringPattern as any,
        dripSequence: dto.dripSequence as any,
        isAbTest: dto.isAbTest || false,
        abVariants: dto.abVariants as any,
        abWinnerCriteria: dto.abWinnerCriteria,
        totalRecipients,
      },
    });

    this.logger.log(`Campaign created: ${campaign.id} - ${campaign.name}`);

    return this.formatCampaignResponse(campaign);
  }

  /**
   * Get campaign by ID
   */
  async findById(workspaceId: string, campaignId: string): Promise<CampaignResponse> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
      include: {
        audienceSegment: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, email: true } },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return this.formatCampaignResponse(campaign);
  }

  /**
   * List campaigns with filtering and pagination
   */
  async findAll(
    workspaceId: string,
    query: CampaignListQueryDto,
  ): Promise<CampaignListResponse> {
    const { page = 1, limit = 20, status, type, search, sortBy, sortOrder } = query;

    const where: Prisma.CampaignWhereInput = { workspaceId };

    if (status) where.status = status;
    if (type) where.campaignType = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.CampaignOrderByWithRelationInput = {};
    orderBy[sortBy || 'createdAt'] = sortOrder || 'desc';

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          audienceSegment: { select: { id: true, name: true } },
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return {
      data: campaigns.map(c => this.formatCampaignResponse(c)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a campaign (only DRAFT campaigns can be updated)
   */
  async update(
    workspaceId: string,
    campaignId: string,
    dto: UpdateCampaignDto,
  ): Promise<CampaignResponse> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Only allow updates to DRAFT campaigns
    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft campaigns can be updated. Duplicate the campaign instead.',
      );
    }

    // Recalculate recipients if audience changed
    let totalRecipients = campaign.totalRecipients;
    if (dto.audienceType || dto.audienceSegmentId || dto.audiencePageIds || dto.audienceContactIds) {
      const audienceData = {
        audienceType: dto.audienceType || campaign.audienceType,
        audienceSegmentId: dto.audienceSegmentId,
        audiencePageIds: dto.audiencePageIds,
        audienceContactIds: dto.audienceContactIds,
      } as CreateCampaignDto;
      
      await this.validateAudience(workspaceId, audienceData);
      totalRecipients = await this.calculateRecipientCount(workspaceId, audienceData);
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.messageContent && { messageContent: dto.messageContent as any }),
        ...(dto.audienceType && { audienceType: dto.audienceType }),
        ...(dto.audienceSegmentId !== undefined && { audienceSegmentId: dto.audienceSegmentId }),
        ...(dto.audiencePageIds && { audiencePageIds: dto.audiencePageIds }),
        ...(dto.audienceContactIds && { audienceContactIds: dto.audienceContactIds }),
        ...(dto.bypassMethod !== undefined && { bypassMethod: dto.bypassMethod }),
        ...(dto.messageTag !== undefined && { messageTag: dto.messageTag }),
        ...(dto.scheduledAt !== undefined && { scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null }),
        ...(dto.timezone && { timezone: dto.timezone }),
        totalRecipients,
      },
    });

    this.logger.log(`Campaign updated: ${campaignId}`);

    return this.formatCampaignResponse(updated);
  }

  /**
   * Delete a campaign (only DRAFT or COMPLETED campaigns)
   */
  async delete(workspaceId: string, campaignId: string): Promise<void> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (!(['DRAFT', 'COMPLETED', 'CANCELLED'] as const).includes(campaign.status as any)) {
      throw new BadRequestException(
        'Only draft, completed, or cancelled campaigns can be deleted',
      );
    }

    await this.prisma.campaign.delete({ where: { id: campaignId } });

    this.logger.log(`Campaign deleted: ${campaignId}`);
  }

  /**
   * Duplicate a campaign
   */
  async duplicate(
    workspaceId: string,
    campaignId: string,
    userId: string,
  ): Promise<CampaignResponse> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const newCampaign = await this.prisma.campaign.create({
      data: {
        workspaceId,
        createdByUserId: userId,
        name: `${campaign.name} (Copy)`,
        description: campaign.description,
        campaignType: campaign.campaignType,
        status: CampaignStatus.DRAFT,
        audienceType: campaign.audienceType,
        audienceSegmentId: campaign.audienceSegmentId,
        audiencePageIds: campaign.audiencePageIds,
        audienceContactIds: campaign.audienceContactIds,
        messageContent: campaign.messageContent as any,
        bypassMethod: campaign.bypassMethod,
        messageTag: campaign.messageTag,
        timezone: campaign.timezone,
        recurringPattern: campaign.recurringPattern as any,
        dripSequence: campaign.dripSequence as any,
        isAbTest: campaign.isAbTest,
        abVariants: campaign.abVariants as any,
        abWinnerCriteria: campaign.abWinnerCriteria,
        totalRecipients: campaign.totalRecipients,
      },
    });

    this.logger.log(`Campaign duplicated: ${campaignId} -> ${newCampaign.id}`);

    return this.formatCampaignResponse(newCampaign);
  }

  // ===========================================
  // Campaign Execution
  // ===========================================

  /**
   * Start/launch a campaign
   */
  async launch(workspaceId: string, campaignId: string): Promise<CampaignResponse> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.SCHEDULED) {
      throw new BadRequestException(`Cannot launch campaign with status: ${campaign.status}`);
    }

    if (campaign.totalRecipients === 0) {
      throw new BadRequestException('Campaign has no recipients');
    }

    // Get all contact IDs for the audience
    const contactIds = await this.getAudienceContactIds(workspaceId, campaign);

    if (contactIds.length === 0) {
      throw new BadRequestException('No valid contacts found for this audience');
    }

    // Get the page ID for sending (first page in audience or workspace default)
    const pageId = await this.getDefaultPageId(workspaceId, campaign);

    if (!pageId) {
      throw new BadRequestException('No page available for sending');
    }

    // Update campaign status
    const updatedCampaign = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.RUNNING,
        startedAt: new Date(),
        totalRecipients: contactIds.length,
      },
    });

    // Add messages to queue
    const messageContent: MessageJobData['content'] = {
      text: (campaign.messageContent as any)?.text,
      attachmentUrl: (campaign.messageContent as any)?.attachmentUrl,
      attachmentType: (campaign.messageContent as any)?.attachmentType,
      quickReplies: (campaign.messageContent as any)?.quickReplies,
    };

    await this.messageQueue.addCampaignMessages(
      campaignId,
      workspaceId,
      pageId,
      contactIds,
      messageContent,
      {
        bypassMethod: campaign.bypassMethod as any,
        messageTag: campaign.messageTag?.toString(),
      },
    );

    this.logger.log(`Campaign launched: ${campaignId}, ${contactIds.length} recipients`);

    return this.formatCampaignResponse(updatedCampaign);
  }

  /**
   * Schedule a campaign for later
   */
  async schedule(
    workspaceId: string,
    campaignId: string,
    scheduledAt: Date,
  ): Promise<CampaignResponse> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Only draft campaigns can be scheduled');
    }

    if (scheduledAt <= new Date()) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.SCHEDULED,
        scheduledAt,
      },
    });

    this.logger.log(`Campaign scheduled: ${campaignId} for ${scheduledAt.toISOString()}`);

    return this.formatCampaignResponse(updated);
  }

  /**
   * Pause a running campaign
   */
  async pause(workspaceId: string, campaignId: string): Promise<CampaignResponse> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== CampaignStatus.RUNNING) {
      throw new BadRequestException('Only running campaigns can be paused');
    }

    // Pause the campaign queue
    await this.messageQueue.pauseQueue(MessageQueueService.QUEUES.CAMPAIGNS);

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.PAUSED },
    });

    this.logger.log(`Campaign paused: ${campaignId}`);

    return this.formatCampaignResponse(updated);
  }

  /**
   * Resume a paused campaign
   */
  async resume(workspaceId: string, campaignId: string): Promise<CampaignResponse> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== CampaignStatus.PAUSED) {
      throw new BadRequestException('Only paused campaigns can be resumed');
    }

    // Resume the campaign queue
    await this.messageQueue.resumeQueue(MessageQueueService.QUEUES.CAMPAIGNS);

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.RUNNING },
    });

    this.logger.log(`Campaign resumed: ${campaignId}`);

    return this.formatCampaignResponse(updated);
  }

  /**
   * Cancel a campaign
   */
  async cancel(workspaceId: string, campaignId: string): Promise<CampaignResponse> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (!(['RUNNING', 'PAUSED', 'SCHEDULED'] as const).includes(campaign.status as any)) {
      throw new BadRequestException(`Cannot cancel campaign with status: ${campaign.status}`);
    }

    // Note: Jobs already in queue will complete - we just mark campaign as cancelled
    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.CANCELLED },
    });

    this.logger.log(`Campaign cancelled: ${campaignId}`);

    return this.formatCampaignResponse(updated);
  }

  // ===========================================
  // Statistics
  // ===========================================

  /**
   * Get campaign statistics
   */
  async getStats(workspaceId: string, campaignId: string): Promise<CampaignStatsResponse> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const total = campaign.totalRecipients || 1; // Avoid division by zero

    return {
      totalRecipients: campaign.totalRecipients,
      sentCount: campaign.sentCount,
      deliveredCount: campaign.deliveredCount,
      failedCount: campaign.failedCount,
      openedCount: campaign.openedCount,
      clickedCount: campaign.clickedCount,
      repliedCount: campaign.repliedCount,
      unsubscribedCount: campaign.unsubscribedCount,
      deliveryRate: Math.round((campaign.deliveredCount / total) * 100),
      openRate: Math.round((campaign.openedCount / total) * 100),
      clickRate: Math.round((campaign.clickedCount / total) * 100),
      replyRate: Math.round((campaign.repliedCount / total) * 100),
    };
  }

  /**
   * Get campaign progress
   */
  async getProgress(workspaceId: string, campaignId: string): Promise<{
    total: number;
    sent: number;
    pending: number;
    failed: number;
    progress: number;
  }> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const total = campaign.totalRecipients;
    const sent = campaign.sentCount;
    const failed = campaign.failedCount;
    const pending = total - sent - failed;

    return {
      total,
      sent,
      pending,
      failed,
      progress: total > 0 ? Math.round((sent / total) * 100) : 0,
    };
  }

  /**
   * Update campaign stats (called from message processor)
   */
  async incrementStats(
    campaignId: string,
    stat: 'sent' | 'delivered' | 'failed' | 'opened' | 'clicked' | 'replied',
  ): Promise<void> {
    const incrementField = `${stat}Count`;
    
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { [incrementField]: { increment: 1 } },
    });

    // Check if campaign is complete
    if (stat === 'sent' || stat === 'failed') {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
      });

      if (campaign && campaign.sentCount + campaign.failedCount >= campaign.totalRecipients) {
        await this.prisma.campaign.update({
          where: { id: campaignId },
          data: {
            status: CampaignStatus.COMPLETED,
            completedAt: new Date(),
          },
        });
        this.logger.log(`Campaign completed: ${campaignId}`);
      }
    }
  }

  // ===========================================
  // Helpers
  // ===========================================

  private async validateAudience(workspaceId: string, dto: CreateCampaignDto): Promise<void> {
    if (dto.audienceType === AudienceType.SEGMENT && !dto.audienceSegmentId) {
      throw new BadRequestException('Segment ID is required for SEGMENT audience type');
    }

    if (dto.audienceType === AudienceType.SEGMENT && dto.audienceSegmentId) {
      const segment = await this.prisma.segment.findFirst({
        where: { id: dto.audienceSegmentId, workspaceId },
      });
      if (!segment) {
        throw new BadRequestException('Segment not found');
      }
    }

    if (dto.audienceType === AudienceType.PAGES && (!dto.audiencePageIds || dto.audiencePageIds.length === 0)) {
      throw new BadRequestException('Page IDs are required for PAGES audience type');
    }

    if (dto.audienceType === AudienceType.MANUAL && (!dto.audienceContactIds || dto.audienceContactIds.length === 0)) {
      throw new BadRequestException('Contact IDs are required for MANUAL audience type');
    }
  }

  private async calculateRecipientCount(workspaceId: string, dto: CreateCampaignDto): Promise<number> {
    switch (dto.audienceType) {
      case AudienceType.ALL:
        return this.prisma.contact.count({ where: { workspaceId, isSubscribed: true } });

      case AudienceType.SEGMENT:
        if (!dto.audienceSegmentId) return 0;
        return this.prisma.segmentContact.count({
          where: { segmentId: dto.audienceSegmentId },
        });

      case AudienceType.PAGES:
        if (!dto.audiencePageIds?.length) return 0;
        return this.prisma.contact.count({
          where: {
            workspaceId,
            pageId: { in: dto.audiencePageIds },
            isSubscribed: true,
          },
        });

      case AudienceType.MANUAL:
        return dto.audienceContactIds?.length || 0;

      default:
        return 0;
    }
  }

  private async getAudienceContactIds(workspaceId: string, campaign: any): Promise<string[]> {
    switch (campaign.audienceType) {
      case AudienceType.ALL:
        const allContacts = await this.prisma.contact.findMany({
          where: { workspaceId, isSubscribed: true },
          select: { id: true },
        });
        return allContacts.map(c => c.id);

      case AudienceType.SEGMENT:
        if (!campaign.audienceSegmentId) return [];
        const segmentContacts = await this.prisma.segmentContact.findMany({
          where: { segmentId: campaign.audienceSegmentId },
          select: { contactId: true },
        });
        return segmentContacts.map(sc => sc.contactId);

      case AudienceType.PAGES:
        const pageContacts = await this.prisma.contact.findMany({
          where: {
            workspaceId,
            pageId: { in: campaign.audiencePageIds },
            isSubscribed: true,
          },
          select: { id: true },
        });
        return pageContacts.map(c => c.id);

      case AudienceType.MANUAL:
        return campaign.audienceContactIds || [];

      default:
        return [];
    }
  }

  private async getDefaultPageId(workspaceId: string, campaign: any): Promise<string | null> {
    // If specific pages in audience, use first one
    if (campaign.audiencePageIds?.length > 0) {
      return campaign.audiencePageIds[0];
    }

    // Otherwise get first connected page in workspace
    const page = await this.prisma.page.findFirst({
      where: { workspaceId, isActive: true },
      select: { id: true },
    });

    return page?.id || null;
  }

  private formatCampaignResponse(campaign: any): CampaignResponse {
    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      campaignType: campaign.campaignType,
      status: campaign.status,
      audienceType: campaign.audienceType,
      messageContent: campaign.messageContent,
      bypassMethod: campaign.bypassMethod,
      messageTag: campaign.messageTag,
      scheduledAt: campaign.scheduledAt,
      timezone: campaign.timezone,
      totalRecipients: campaign.totalRecipients,
      sentCount: campaign.sentCount,
      deliveredCount: campaign.deliveredCount,
      failedCount: campaign.failedCount,
      openedCount: campaign.openedCount,
      clickedCount: campaign.clickedCount,
      repliedCount: campaign.repliedCount,
      startedAt: campaign.startedAt,
      completedAt: campaign.completedAt,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
  }
}
