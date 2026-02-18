import { Test, TestingModule } from '@nestjs/testing';
import { SponsoredMessageService } from './sponsored-message.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FacebookApiService } from '../facebook/facebook-api.service';
import { EncryptionService } from '../../common/encryption.service';

// =============================================
// Sponsored Message Service - Unit Tests
// =============================================

describe('SponsoredMessageService', () => {
  let service: SponsoredMessageService;
  const settingStore = new Map<string, any>();

  const mockFacebookApi = {
    createSponsoredMessageAd: jest.fn(),
    updateSponsoredCampaignStatus: jest.fn(),
    getSponsoredCampaignInsights: jest.fn(),
  };

  const mockEncryption = {
    encrypt: jest.fn((val: string) => `enc_${val}`),
    decrypt: jest.fn((val: string) => val.replace('enc_', '')),
  };

  const mockPrisma = {
    page: { findUnique: jest.fn() },
    contact: { count: jest.fn() },
    systemSetting: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    settingStore.clear();
    jest.clearAllMocks();

    mockPrisma.systemSetting.findUnique.mockImplementation(({ where }: any) => {
      const val = settingStore.get(where.key);
      return Promise.resolve(val !== undefined ? { key: where.key, value: val } : null);
    });
    mockPrisma.systemSetting.upsert.mockImplementation(({ where, create, update }: any) => {
      const val = settingStore.has(where.key) ? update.value : create.value;
      settingStore.set(where.key, val);
      return Promise.resolve({ key: where.key, value: val });
    });
    mockPrisma.systemSetting.findMany.mockImplementation(({ where }: any) => {
      const results: any[] = [];
      for (const [key, value] of settingStore) {
        if (where?.key?.startsWith && key.startsWith(where.key.startsWith)) {
          results.push({ key, value });
        }
      }
      return Promise.resolve(results);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SponsoredMessageService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FacebookApiService, useValue: mockFacebookApi },
        { provide: EncryptionService, useValue: mockEncryption },
      ],
    }).compile();

    service = module.get<SponsoredMessageService>(SponsoredMessageService);
  });

  describe('createSponsoredCampaign', () => {
    it('should create a draft sponsored campaign', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({ id: 'page1', fbPageId: 'fb123' });
      mockPrisma.contact.count.mockResolvedValue(150);

      const campaign = await service.createSponsoredCampaign({
        pageId: 'page1',
        workspaceId: 'ws1',
        messageText: 'Check out our new product!',
        dailyBudgetCents: 500,
        durationDays: 7,
      });

      expect(campaign.id).toBeDefined();
      expect(campaign.status).toBe('draft');
      expect(campaign.budgetCents).toBe(3500); // 500 * 7
      expect(campaign.durationDays).toBe(7);
      expect(campaign.estimatedReach).toBe(150);
    });

    it('should throw for non-existent page', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);

      await expect(
        service.createSponsoredCampaign({
          pageId: 'nonexistent',
          workspaceId: 'ws1',
          messageText: 'Test',
          dailyBudgetCents: 500,
          durationDays: 7,
        }),
      ).rejects.toThrow('Page not found');
    });

    it('should use target contact count when provided', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({ id: 'page1' });

      const campaign = await service.createSponsoredCampaign({
        pageId: 'page1',
        workspaceId: 'ws1',
        messageText: 'Test',
        targetContactIds: ['c1', 'c2', 'c3'],
        dailyBudgetCents: 1000,
        durationDays: 5,
      });

      expect(campaign.estimatedReach).toBe(3);
    });
  });

  describe('submitForReview', () => {
    it('should transition draft to pending_review', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({
        id: 'page1',
        fbPageId: 'fb_page_1',
        accessToken: 'enc_tok',
        facebookAccount: { fbUserId: 'act_123' },
      });
      mockPrisma.contact.count.mockResolvedValue(10);
      mockFacebookApi.createSponsoredMessageAd.mockResolvedValue({
        campaignId: 'fb_camp_1',
        adSetId: 'fb_adset_1',
        adId: 'fb_ad_1',
      });

      const campaign = await service.createSponsoredCampaign({
        pageId: 'page1',
        workspaceId: 'ws1',
        messageText: 'Test',
        dailyBudgetCents: 500,
        durationDays: 3,
      });

      const submitted = await service.submitForReview(campaign.id);
      expect(submitted.status).toBe('pending_review');
      expect(mockFacebookApi.createSponsoredMessageAd).toHaveBeenCalled();
    });

    it('should still submit even if FB ad creation fails', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({
        id: 'page1',
        fbPageId: 'fb_page_1',
        accessToken: 'enc_tok',
        facebookAccount: { fbUserId: 'act_123' },
      });
      mockPrisma.contact.count.mockResolvedValue(10);
      mockFacebookApi.createSponsoredMessageAd.mockRejectedValue(new Error('FB error'));

      const campaign = await service.createSponsoredCampaign({
        pageId: 'page1',
        workspaceId: 'ws1',
        messageText: 'Test',
        dailyBudgetCents: 500,
        durationDays: 3,
      });

      const submitted = await service.submitForReview(campaign.id);
      expect(submitted.status).toBe('pending_review');
    });

    it('should throw for non-draft campaigns', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({
        id: 'page1',
        fbPageId: 'fb_page_1',
        accessToken: 'enc_tok',
        facebookAccount: { fbUserId: 'act_123' },
      });
      mockPrisma.contact.count.mockResolvedValue(10);
      mockFacebookApi.createSponsoredMessageAd.mockResolvedValue({
        campaignId: 'fb_camp_1', adSetId: 'fb_adset_1', adId: 'fb_ad_1',
      });

      const campaign = await service.createSponsoredCampaign({
        pageId: 'page1',
        workspaceId: 'ws1',
        messageText: 'Test',
        dailyBudgetCents: 500,
        durationDays: 3,
      });

      await service.submitForReview(campaign.id);
      await expect(service.submitForReview(campaign.id)).rejects.toThrow();
    });
  });

  describe('getCampaignStats', () => {
    it('should return FB insights when fbCampaignId exists', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({
        id: 'page1',
        fbPageId: 'fb_page_1',
        accessToken: 'enc_tok',
        facebookAccount: { fbUserId: 'act_123' },
      });
      mockPrisma.contact.count.mockResolvedValue(10);
      mockFacebookApi.createSponsoredMessageAd.mockResolvedValue({
        campaignId: 'fb_camp_1', adSetId: 'fb_adset_1', adId: 'fb_ad_1',
      });
      mockFacebookApi.getSponsoredCampaignInsights.mockResolvedValue({
        impressions: 5000,
        reach: 3000,
        spend: 15.5,
        clicks: 200,
        ctr: 4.0,
        actions: [
          { action_type: 'onsite_conversion.messaging_first_reply', value: '50' },
          { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '30' },
        ],
      });

      const campaign = await service.createSponsoredCampaign({
        pageId: 'page1',
        workspaceId: 'ws1',
        messageText: 'Test',
        dailyBudgetCents: 500,
        durationDays: 3,
      });
      await service.submitForReview(campaign.id);

      const stats = await service.getCampaignStats(campaign.id);
      expect(stats.impressions).toBe(5000);
      expect(stats.reach).toBe(3000);
      expect(stats.messagesSent).toBe(50);
      expect(stats.messagesOpened).toBe(30);
      expect(stats.spent).toBe(1550);
      expect(stats.ctr).toBe(4.0);
    });

    it('should return zeros when no fbCampaignId', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({ id: 'page1' });
      mockPrisma.contact.count.mockResolvedValue(10);

      const campaign = await service.createSponsoredCampaign({
        pageId: 'page1',
        workspaceId: 'ws1',
        messageText: 'Test',
        dailyBudgetCents: 500,
        durationDays: 3,
      });

      const stats = await service.getCampaignStats(campaign.id);
      expect(stats.impressions).toBe(0);
      expect(stats.reach).toBe(0);
    });

    it('should throw for non-existent campaign', async () => {
      await expect(service.getCampaignStats('nonexistent')).rejects.toThrow('Sponsored campaign not found');
    });
  });

  describe('listCampaigns', () => {
    it('should list campaigns for a workspace', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({ id: 'page1' });
      mockPrisma.contact.count.mockResolvedValue(10);

      await service.createSponsoredCampaign({
        pageId: 'page1',
        workspaceId: 'ws1',
        messageText: 'Campaign 1',
        dailyBudgetCents: 500,
        durationDays: 3,
      });
      await service.createSponsoredCampaign({
        pageId: 'page1',
        workspaceId: 'ws2',
        messageText: 'Campaign 2',
        dailyBudgetCents: 500,
        durationDays: 3,
      });

      const ws1Campaigns = await service.listCampaigns('ws1');
      expect(ws1Campaigns.length).toBe(1);
    });
  });

  describe('deleteCampaign', () => {
    it('should delete draft campaign', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({ id: 'page1' });
      mockPrisma.contact.count.mockResolvedValue(10);

      const campaign = await service.createSponsoredCampaign({
        pageId: 'page1',
        workspaceId: 'ws1',
        messageText: 'Test',
        dailyBudgetCents: 500,
        durationDays: 3,
      });

      const result = await service.deleteCampaign(campaign.id);
      expect(result.success).toBe(true);
    });

    it('should prevent deleting non-draft campaigns', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({ id: 'page1' });
      mockPrisma.contact.count.mockResolvedValue(10);

      const campaign = await service.createSponsoredCampaign({
        pageId: 'page1',
        workspaceId: 'ws1',
        messageText: 'Test',
        dailyBudgetCents: 500,
        durationDays: 3,
      });

      await service.submitForReview(campaign.id);
      await expect(service.deleteCampaign(campaign.id)).rejects.toThrow('Can only delete draft');
    });
  });
});
