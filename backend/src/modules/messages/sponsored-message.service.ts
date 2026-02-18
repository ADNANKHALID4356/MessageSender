import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FacebookApiService } from '../facebook/facebook-api.service';
import { EncryptionService } from '../../common/encryption.service';

// ===========================================
// Sponsored Messages Service (FR-7.6)
// ===========================================
// Facebook Marketing API integration for
// sponsored message campaigns. All campaign
// data persisted in SystemSetting table.
// ===========================================

export interface SponsoredMessageParams {
  pageId: string;
  workspaceId: string;
  messageText: string;
  targetContactIds?: string[];
  dailyBudgetCents: number;
  durationDays: number;
}

export interface SponsoredCampaignResult {
  id: string;
  status: 'draft' | 'pending_review' | 'active' | 'paused' | 'completed' | 'rejected';
  adAccountId: string | null;
  estimatedReach: number;
  budgetCents: number;
  durationDays: number;
  startDate: string | null;
  createdAt: string;
}

export interface SponsoredCampaignStats {
  id: string;
  impressions: number;
  reach: number;
  messagesSent: number;
  messagesOpened: number;
  spent: number;
  ctr: number;
}

interface StoredCampaign extends SponsoredCampaignResult {
  params: SponsoredMessageParams;
  fbCampaignId?: string;
  fbAdSetId?: string;
  fbAdId?: string;
}

@Injectable()
export class SponsoredMessageService {
  private readonly logger = new Logger(SponsoredMessageService.name);

  constructor(
    private prisma: PrismaService,
    private facebookApi: FacebookApiService,
    private encryption: EncryptionService,
  ) {}

  // ===========================================
  // DB Registry (SystemSetting)
  // ===========================================

  private async getRegistry(workspaceId: string): Promise<StoredCampaign[]> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: `sponsored_campaigns_${workspaceId}` },
    });
    return setting ? (setting.value as unknown as StoredCampaign[]) : [];
  }

  private async saveRegistry(workspaceId: string, campaigns: StoredCampaign[]): Promise<void> {
    await this.prisma.systemSetting.upsert({
      where: { key: `sponsored_campaigns_${workspaceId}` },
      create: { key: `sponsored_campaigns_${workspaceId}`, value: campaigns as any },
      update: { value: campaigns as any },
    });
  }

  private async findCampaignInDb(campaignId: string): Promise<{ campaign: StoredCampaign; workspaceId: string } | null> {
    const settings = await this.prisma.systemSetting.findMany({
      where: { key: { startsWith: 'sponsored_campaigns_' } },
    });
    for (const s of settings) {
      const list = s.value as unknown as StoredCampaign[];
      const found = list.find(c => c.id === campaignId);
      if (found) return { campaign: found, workspaceId: s.key.replace('sponsored_campaigns_', '') };
    }
    return null;
  }

  // ===========================================
  // Create Sponsored Campaign
  // ===========================================

  async createSponsoredCampaign(params: SponsoredMessageParams): Promise<SponsoredCampaignResult> {
    const page = await this.prisma.page.findUnique({ where: { id: params.pageId } });
    if (!page) throw new NotFoundException('Page not found');

    const campaignId = `smc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    let estimatedReach = 0;
    if (params.targetContactIds?.length) {
      estimatedReach = params.targetContactIds.length;
    } else {
      estimatedReach = await this.prisma.contact.count({ where: { pageId: params.pageId } });
    }

    const stored: StoredCampaign = {
      id: campaignId,
      status: 'draft',
      adAccountId: null,
      estimatedReach,
      budgetCents: params.dailyBudgetCents * params.durationDays,
      durationDays: params.durationDays,
      startDate: null,
      createdAt: new Date().toISOString(),
      params,
    };

    const registry = await this.getRegistry(params.workspaceId);
    registry.unshift(stored);
    await this.saveRegistry(params.workspaceId, registry);

    this.logger.log(
      `Sponsored campaign created: ${campaignId}, budget: $${(stored.budgetCents / 100).toFixed(2)}, reach: ${estimatedReach}`,
    );
    return this.stripParams(stored);
  }

  // ===========================================
  // Lifecycle
  // ===========================================

  async submitForReview(campaignId: string): Promise<SponsoredCampaignResult> {
    const found = await this.findCampaignInDb(campaignId);
    if (!found) throw new NotFoundException('Sponsored campaign not found');
    if (found.campaign.status !== 'draft') {
      throw new BadRequestException('Can only submit draft campaigns for review');
    }

    // Attempt to create the ad on Facebook Marketing API
    const page = await this.prisma.page.findUnique({
      where: { id: found.campaign.params.pageId },
      include: { facebookAccount: true },
    });

    let fbCampaignId: string | undefined;
    let fbAdSetId: string | undefined;
    let fbAdId: string | undefined;
    let adAccountId: string | null = found.campaign.adAccountId;

    if (page?.facebookAccount) {
      try {
        const accessToken = this.encryption.decrypt(page.accessToken);
        const fbAccountId = page.facebookAccount.fbUserId;
        adAccountId = adAccountId || fbAccountId;

        const result = await this.facebookApi.createSponsoredMessageAd({
          adAccountId: adAccountId!,
          accessToken,
          pageId: page.fbPageId,
          messageText: found.campaign.params.messageText,
          dailyBudgetCents: found.campaign.params.dailyBudgetCents,
          campaignName: `SM_${campaignId}`,
        });

        fbCampaignId = result.campaignId;
        fbAdSetId = result.adSetId;
        fbAdId = result.adId;
        this.logger.log(`Facebook ad created for ${campaignId}: fb_campaign=${fbCampaignId}`);
      } catch (fbErr) {
        this.logger.warn(`Facebook ad creation failed for ${campaignId}: ${fbErr.message}`);
        // Still transition to pending_review — manual review possible
      }
    }

    const registry = await this.getRegistry(found.workspaceId);
    const idx = registry.findIndex(c => c.id === campaignId);
    if (idx >= 0) {
      registry[idx].status = 'pending_review';
      registry[idx].adAccountId = adAccountId;
      if (fbCampaignId) registry[idx].fbCampaignId = fbCampaignId;
      if (fbAdSetId) registry[idx].fbAdSetId = fbAdSetId;
      if (fbAdId) registry[idx].fbAdId = fbAdId;
      await this.saveRegistry(found.workspaceId, registry);
    }

    this.logger.log(`Sponsored campaign ${campaignId} submitted for review`);
    return this.stripParams({ ...found.campaign, status: 'pending_review', adAccountId });
  }

  async pauseCampaign(campaignId: string): Promise<SponsoredCampaignResult> {
    return this.updateStatus(campaignId, 'active', 'paused', 'paused');
  }

  async resumeCampaign(campaignId: string): Promise<SponsoredCampaignResult> {
    return this.updateStatus(campaignId, 'paused', 'active', 'resumed');
  }

  private async updateStatus(
    campaignId: string,
    requiredStatus: string,
    newStatus: StoredCampaign['status'],
    action: string,
  ): Promise<SponsoredCampaignResult> {
    const found = await this.findCampaignInDb(campaignId);
    if (!found) throw new NotFoundException('Sponsored campaign not found');

    if (found.campaign.status !== requiredStatus) {
      throw new BadRequestException(`Cannot ${action} campaign in ${found.campaign.status} status`);
    }

    const registry = await this.getRegistry(found.workspaceId);
    const idx = registry.findIndex(c => c.id === campaignId);
    if (idx >= 0) {
      registry[idx].status = newStatus;
      if (newStatus === 'active' && !registry[idx].startDate) {
        registry[idx].startDate = new Date().toISOString();
      }
      await this.saveRegistry(found.workspaceId, registry);
    }

    this.logger.log(`Sponsored campaign ${campaignId} ${action}`);
    return this.stripParams({ ...found.campaign, status: newStatus });
  }

  // ===========================================
  // Query
  // ===========================================

  async getCampaign(campaignId: string): Promise<SponsoredCampaignResult | null> {
    const found = await this.findCampaignInDb(campaignId);
    return found ? this.stripParams(found.campaign) : null;
  }

  async listCampaigns(workspaceId: string): Promise<SponsoredCampaignResult[]> {
    const registry = await this.getRegistry(workspaceId);
    return registry.map(c => this.stripParams(c)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getCampaignStats(campaignId: string): Promise<SponsoredCampaignStats> {
    const found = await this.findCampaignInDb(campaignId);
    if (!found) throw new NotFoundException('Sponsored campaign not found');

    // If we have a Facebook campaign ID, fetch real insights
    if (found.campaign.fbCampaignId) {
      try {
        const page = await this.prisma.page.findUnique({
          where: { id: found.campaign.params.pageId },
        });
        if (page) {
          const accessToken = this.encryption.decrypt(page.accessToken);
          const insights = await this.facebookApi.getSponsoredCampaignInsights(
            found.campaign.fbCampaignId,
            accessToken,
          );

          // Extract message-specific actions
          const messagesSent = insights.actions?.find(
            a => a.action_type === 'onsite_conversion.messaging_first_reply',
          );
          const messagesOpened = insights.actions?.find(
            a => a.action_type === 'onsite_conversion.messaging_conversation_started_7d',
          );

          return {
            id: campaignId,
            impressions: insights.impressions,
            reach: insights.reach,
            messagesSent: messagesSent ? parseInt(messagesSent.value, 10) : 0,
            messagesOpened: messagesOpened ? parseInt(messagesOpened.value, 10) : 0,
            spent: insights.spend * 100, // convert to cents
            ctr: insights.ctr,
          };
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch FB insights for ${campaignId}: ${err.message}`);
      }
    }

    // Fallback: return zeros
    return {
      id: campaignId,
      impressions: 0,
      reach: 0,
      messagesSent: 0,
      messagesOpened: 0,
      spent: 0,
      ctr: 0,
    };
  }

  // ===========================================
  // Delete
  // ===========================================

  async deleteCampaign(campaignId: string): Promise<{ success: boolean }> {
    const found = await this.findCampaignInDb(campaignId);
    if (!found) throw new NotFoundException('Sponsored campaign not found');
    if (found.campaign.status !== 'draft') {
      throw new BadRequestException('Can only delete draft campaigns');
    }

    const registry = await this.getRegistry(found.workspaceId);
    const filtered = registry.filter(c => c.id !== campaignId);
    await this.saveRegistry(found.workspaceId, filtered);
    return { success: true };
  }

  private stripParams(campaign: StoredCampaign): SponsoredCampaignResult {
    const { params, ...result } = campaign;
    return result;
  }
}
