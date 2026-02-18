import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { FacebookApiService } from './facebook-api.service';
import { FacebookConfigService } from './facebook-config.service';

// =============================================
// Facebook API - Marketing / Sponsored Messages
// =============================================

describe('FacebookApiService - Marketing API', () => {
  let service: FacebookApiService;
  let fetchSpy: jest.SpyInstance;

  const mockFbConfig = {
    appId: 'test-app-id',
    appSecret: 'test-app-secret',
    graphUrl: 'https://graph.facebook.com',
    apiVersion: 'v18.0',
    buildGraphUrl: jest.fn((path: string) => `https://graph.facebook.com/v18.0/${path}`),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FacebookApiService,
        { provide: FacebookConfigService, useValue: mockFbConfig },
      ],
    }).compile();

    service = module.get<FacebookApiService>(FacebookApiService);
    fetchSpy = jest.spyOn(global, 'fetch');
    jest.clearAllMocks();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('subscribePageToWebhook', () => {
    it('should include messaging_referrals in subscription fields', async () => {
      fetchSpy.mockResolvedValue({
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await service.subscribePageToWebhook('page-123', 'token-abc');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('messaging_referrals'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should include all required webhook fields', async () => {
      fetchSpy.mockResolvedValue({
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await service.subscribePageToWebhook('page-123', 'token-abc');

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('messages');
      expect(url).toContain('messaging_optins');
      expect(url).toContain('messaging_postbacks');
      expect(url).toContain('message_deliveries');
      expect(url).toContain('message_reads');
      expect(url).toContain('messaging_referrals');
    });
  });

  describe('createSponsoredMessageAd', () => {
    it('should create campaign, adset, creative, and ad in sequence', async () => {
      fetchSpy
        .mockResolvedValueOnce({ json: () => Promise.resolve({ id: 'camp-1' }) } as Response)
        .mockResolvedValueOnce({ json: () => Promise.resolve({ id: 'adset-1' }) } as Response)
        .mockResolvedValueOnce({ json: () => Promise.resolve({ id: 'creative-1' }) } as Response)
        .mockResolvedValueOnce({ json: () => Promise.resolve({ id: 'ad-1' }) } as Response);

      const result = await service.createSponsoredMessageAd({
        adAccountId: 'acc-123',
        accessToken: 'token-abc',
        pageId: 'page-456',
        messageText: 'Promotional message!',
        dailyBudgetCents: 1000,
        campaignName: 'SM_test',
      });

      expect(result.campaignId).toBe('camp-1');
      expect(result.adSetId).toBe('adset-1');
      expect(result.adId).toBe('ad-1');
      expect(fetchSpy).toHaveBeenCalledTimes(4);
    });

    it('should throw on campaign creation error', async () => {
      fetchSpy.mockResolvedValueOnce({
        json: () => Promise.resolve({
          error: { message: 'Invalid ad account' },
        }),
      } as Response);

      await expect(
        service.createSponsoredMessageAd({
          adAccountId: 'bad-acc',
          accessToken: 'token',
          pageId: 'page-1',
          messageText: 'Test',
          dailyBudgetCents: 500,
          campaignName: 'test',
        }),
      ).rejects.toThrow(HttpException);
    });

    it('should throw on ad set creation error', async () => {
      fetchSpy
        .mockResolvedValueOnce({ json: () => Promise.resolve({ id: 'camp-1' }) } as Response)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ error: { message: 'Budget too low' } }),
        } as Response);

      await expect(
        service.createSponsoredMessageAd({
          adAccountId: 'acc-123',
          accessToken: 'token',
          pageId: 'page-1',
          messageText: 'Test',
          dailyBudgetCents: 1,
          campaignName: 'test',
        }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('updateSponsoredCampaignStatus', () => {
    it('should update campaign status successfully', async () => {
      fetchSpy.mockResolvedValue({
        json: () => Promise.resolve({ success: true }),
      } as Response);

      const result = await service.updateSponsoredCampaignStatus(
        'camp-123', 'token', 'ACTIVE',
      );

      expect(result).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('camp-123'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should return false on error', async () => {
      fetchSpy.mockResolvedValue({
        json: () => Promise.resolve({ error: { message: 'Forbidden' } }),
      } as Response);

      const result = await service.updateSponsoredCampaignStatus(
        'camp-123', 'token', 'ACTIVE',
      );

      expect(result).toBe(false);
    });
  });

  describe('getSponsoredCampaignInsights', () => {
    it('should return parsed insights', async () => {
      fetchSpy.mockResolvedValue({
        json: () => Promise.resolve({
          data: [{
            impressions: '5000',
            reach: '3000',
            spend: '15.50',
            clicks: '200',
            ctr: '4.0',
            actions: [
              { action_type: 'onsite_conversion.messaging_first_reply', value: '50' },
            ],
          }],
        }),
      } as Response);

      const insights = await service.getSponsoredCampaignInsights('camp-123', 'token');

      expect(insights.impressions).toBe(5000);
      expect(insights.reach).toBe(3000);
      expect(insights.spend).toBe(15.5);
      expect(insights.clicks).toBe(200);
      expect(insights.ctr).toBe(4.0);
      expect(insights.actions).toHaveLength(1);
    });

    it('should return zeros when no data available', async () => {
      fetchSpy.mockResolvedValue({
        json: () => Promise.resolve({ data: [] }),
      } as Response);

      const insights = await service.getSponsoredCampaignInsights('camp-123', 'token');

      expect(insights.impressions).toBe(0);
      expect(insights.reach).toBe(0);
      expect(insights.spend).toBe(0);
    });

    it('should return zeros on API error', async () => {
      fetchSpy.mockResolvedValue({
        json: () => Promise.resolve({ error: { message: 'Rate limited' } }),
      } as Response);

      const insights = await service.getSponsoredCampaignInsights('camp-123', 'token');

      expect(insights.impressions).toBe(0);
    });

    it('should handle fetch failure gracefully', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));

      const insights = await service.getSponsoredCampaignInsights('camp-123', 'token');

      expect(insights.impressions).toBe(0);
      expect(insights.reach).toBe(0);
    });
  });
});
