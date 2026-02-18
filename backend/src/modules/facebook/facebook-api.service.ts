import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { FacebookConfigService } from './facebook-config.service';

export interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface FacebookUserInfo {
  id: string;
  name: string;
  email?: string;
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

export interface FacebookPagesResponse {
  data: FacebookPage[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

export interface FacebookMessageAttachment {
  type: 'image' | 'video' | 'audio' | 'file' | 'template';
  payload: {
    url?: string;
    template_type?: string;
    elements?: unknown[];
  };
}

export interface FacebookSendMessagePayload {
  recipient: {
    id: string;
  };
  message?: {
    text?: string;
    attachment?: FacebookMessageAttachment;
  };
  messaging_type: 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG';
  tag?: string;
}

export interface FacebookSendResponse {
  recipient_id: string;
  message_id: string;
}

@Injectable()
export class FacebookApiService {
  private readonly logger = new Logger(FacebookApiService.name);

  constructor(private fbConfig: FacebookConfigService) {}

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    redirectUri: string
  ): Promise<FacebookTokenResponse> {
    const url = this.fbConfig.buildTokenUrl(code, redirectUri);

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        this.logger.error('Token exchange error:', data.error);
        throw new HttpException(
          data.error.message || 'Failed to exchange code for token',
          HttpStatus.BAD_REQUEST
        );
      }

      return data as FacebookTokenResponse;
    } catch (error) {
      this.logger.error('Token exchange failed:', error);
      throw new HttpException(
        'Failed to exchange authorization code',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Exchange short-lived token for long-lived token
   */
  async getLongLivedToken(shortLivedToken: string): Promise<FacebookTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.fbConfig.appId,
      client_secret: this.fbConfig.appSecret,
      fb_exchange_token: shortLivedToken,
    });

    const url = `${this.fbConfig.graphUrl}/${this.fbConfig.apiVersion}/oauth/access_token?${params.toString()}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        this.logger.error('Long-lived token error:', data.error);
        throw new HttpException(
          data.error.message || 'Failed to get long-lived token',
          HttpStatus.BAD_REQUEST
        );
      }

      return data as FacebookTokenResponse;
    } catch (error) {
      this.logger.error('Long-lived token failed:', error);
      throw new HttpException(
        'Failed to get long-lived token',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get user information
   */
  async getUserInfo(accessToken: string): Promise<FacebookUserInfo> {
    const url = this.fbConfig.buildGraphUrl(`me?fields=id,name,email&access_token=${accessToken}`);

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        this.logger.error('Get user info error:', data.error);
        throw new HttpException(
          data.error.message || 'Failed to get user info',
          HttpStatus.BAD_REQUEST
        );
      }

      return data as FacebookUserInfo;
    } catch (error) {
      this.logger.error('Get user info failed:', error);
      throw new HttpException(
        'Failed to get user information',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get pages the user manages
   */
  async getUserPages(accessToken: string): Promise<FacebookPage[]> {
    const url = this.fbConfig.buildGraphUrl(
      `me/accounts?fields=id,name,access_token,category,picture&access_token=${accessToken}`
    );

    try {
      const response = await fetch(url);
      const data: FacebookPagesResponse = await response.json();

      if ((data as unknown as { error?: { message: string } }).error) {
        const errorData = data as unknown as { error: { message: string } };
        this.logger.error('Get pages error:', errorData.error);
        throw new HttpException(
          errorData.error.message || 'Failed to get pages',
          HttpStatus.BAD_REQUEST
        );
      }

      return data.data || [];
    } catch (error) {
      this.logger.error('Get pages failed:', error);
      throw new HttpException(
        'Failed to get user pages',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get page access token (never expires)
   */
  async getPageAccessToken(
    pageId: string,
    userAccessToken: string
  ): Promise<string> {
    const url = this.fbConfig.buildGraphUrl(
      `${pageId}?fields=access_token&access_token=${userAccessToken}`
    );

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        this.logger.error('Get page token error:', data.error);
        throw new HttpException(
          data.error.message || 'Failed to get page access token',
          HttpStatus.BAD_REQUEST
        );
      }

      return data.access_token;
    } catch (error) {
      this.logger.error('Get page token failed:', error);
      throw new HttpException(
        'Failed to get page access token',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Subscribe page to webhook
   */
  async subscribePageToWebhook(
    pageId: string,
    pageAccessToken: string
  ): Promise<boolean> {
    const url = this.fbConfig.buildGraphUrl(
      `${pageId}/subscribed_apps?subscribed_fields=messages,messaging_optins,messaging_postbacks,message_deliveries,message_reads,messaging_referrals&access_token=${pageAccessToken}`
    );

    try {
      const response = await fetch(url, { method: 'POST' });
      const data = await response.json();

      if (data.error) {
        this.logger.error('Subscribe webhook error:', data.error);
        return false;
      }

      return data.success === true;
    } catch (error) {
      this.logger.error('Subscribe webhook failed:', error);
      return false;
    }
  }

  /**
   * Unsubscribe page from webhook
   */
  async unsubscribePageFromWebhook(
    pageId: string,
    pageAccessToken: string
  ): Promise<boolean> {
    const url = this.fbConfig.buildGraphUrl(
      `${pageId}/subscribed_apps?access_token=${pageAccessToken}`
    );

    try {
      const response = await fetch(url, { method: 'DELETE' });
      const data = await response.json();

      return data.success === true;
    } catch (error) {
      this.logger.error('Unsubscribe webhook failed:', error);
      return false;
    }
  }

  /**
   * Send a message to a user
   */
  async sendMessage(
    pageAccessToken: string,
    payload: FacebookSendMessagePayload
  ): Promise<FacebookSendResponse> {
    const url = this.fbConfig.buildGraphUrl(
      `me/messages?access_token=${pageAccessToken}`
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.error) {
        this.logger.error('Send message error:', data.error);
        throw new HttpException(
          data.error.message || 'Failed to send message',
          HttpStatus.BAD_REQUEST
        );
      }

      return data as FacebookSendResponse;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Send message failed:', error);
      throw new HttpException(
        'Failed to send message',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get page info
   */
  async getPageInfo(pageId: string, accessToken: string) {
    const url = this.fbConfig.buildGraphUrl(
      `${pageId}?fields=id,name,category,picture,fan_count,link&access_token=${accessToken}`
    );

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        this.logger.error('Get page info error:', data.error);
        throw new HttpException(
          data.error.message || 'Failed to get page info',
          HttpStatus.BAD_REQUEST
        );
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Get page info failed:', error);
      throw new HttpException(
        'Failed to get page information',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Debug token to check validity
   */
  async debugToken(
    inputToken: string
  ): Promise<{
    is_valid: boolean;
    expires_at?: number;
    scopes?: string[];
    user_id?: string;
    app_id?: string;
  }> {
    const params = new URLSearchParams({
      input_token: inputToken,
      access_token: `${this.fbConfig.appId}|${this.fbConfig.appSecret}`,
    });

    const url = this.fbConfig.buildGraphUrl(`debug_token?${params.toString()}`);

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        return { is_valid: false };
      }

      return data.data;
    } catch (error) {
      this.logger.error('Debug token failed:', error);
      return { is_valid: false };
    }
  }

  // ===========================================
  // Sponsored Messages / Marketing API (FR-7.6)
  // ===========================================

  /**
   * Create a sponsored message ad via Marketing API
   */
  async createSponsoredMessageAd(params: {
    adAccountId: string;
    accessToken: string;
    pageId: string;
    messageText: string;
    dailyBudgetCents: number;
    campaignName: string;
  }): Promise<{ campaignId: string; adSetId: string; adId: string }> {
    const { adAccountId, accessToken, pageId, messageText, dailyBudgetCents, campaignName } = params;

    // Step 1: Create Campaign
    const campaignUrl = this.fbConfig.buildGraphUrl(
      `act_${adAccountId}/campaigns?access_token=${accessToken}`
    );
    const campaignResp = await fetch(campaignUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: campaignName,
        objective: 'MESSAGES',
        status: 'PAUSED',
        special_ad_categories: [],
      }),
    });
    const campaignData = await campaignResp.json();
    if (campaignData.error) {
      this.logger.error('Create campaign error:', campaignData.error);
      throw new HttpException(
        campaignData.error.message || 'Failed to create campaign',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Step 2: Create Ad Set with sponsored_message optimization
    const adSetUrl = this.fbConfig.buildGraphUrl(
      `act_${adAccountId}/adsets?access_token=${accessToken}`
    );
    const adSetResp = await fetch(adSetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${campaignName} - Ad Set`,
        campaign_id: campaignData.id,
        daily_budget: dailyBudgetCents,
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'IMPRESSIONS',
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting: {
          custom_audiences: [],
        },
        promoted_object: {
          page_id: pageId,
        },
        status: 'PAUSED',
      }),
    });
    const adSetData = await adSetResp.json();
    if (adSetData.error) {
      this.logger.error('Create ad set error:', adSetData.error);
      throw new HttpException(
        adSetData.error.message || 'Failed to create ad set',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Step 3: Create Ad Creative with sponsored message
    const creativeUrl = this.fbConfig.buildGraphUrl(
      `act_${adAccountId}/adcreatives?access_token=${accessToken}`
    );
    const creativeResp = await fetch(creativeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${campaignName} - Creative`,
        object_story_spec: {
          page_id: pageId,
        },
        asset_feed_spec: {
          bodies: [{ text: messageText }],
          optimization_type: 'REGULAR',
        },
      }),
    });
    const creativeData = await creativeResp.json();
    if (creativeData.error) {
      this.logger.error('Create creative error:', creativeData.error);
      throw new HttpException(
        creativeData.error.message || 'Failed to create ad creative',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Step 4: Create Ad
    const adUrl = this.fbConfig.buildGraphUrl(
      `act_${adAccountId}/ads?access_token=${accessToken}`
    );
    const adResp = await fetch(adUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${campaignName} - Ad`,
        adset_id: adSetData.id,
        creative: { creative_id: creativeData.id },
        status: 'PAUSED',
      }),
    });
    const adData = await adResp.json();
    if (adData.error) {
      this.logger.error('Create ad error:', adData.error);
      throw new HttpException(
        adData.error.message || 'Failed to create ad',
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      campaignId: campaignData.id,
      adSetId: adSetData.id,
      adId: adData.id,
    };
  }

  /**
   * Update sponsored message campaign status on Facebook
   */
  async updateSponsoredCampaignStatus(
    fbCampaignId: string,
    accessToken: string,
    status: 'ACTIVE' | 'PAUSED' | 'DELETED',
  ): Promise<boolean> {
    const url = this.fbConfig.buildGraphUrl(
      `${fbCampaignId}?access_token=${accessToken}`
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (data.error) {
        this.logger.error('Update campaign status error:', data.error);
        return false;
      }
      return data.success === true;
    } catch (error) {
      this.logger.error('Update campaign status failed:', error);
      return false;
    }
  }

  /**
   * Get sponsored campaign insights (impressions, reach, spend, etc.)
   */
  async getSponsoredCampaignInsights(
    fbCampaignId: string,
    accessToken: string,
  ): Promise<{
    impressions: number;
    reach: number;
    spend: number;
    clicks: number;
    ctr: number;
    actions?: { action_type: string; value: string }[];
  }> {
    const url = this.fbConfig.buildGraphUrl(
      `${fbCampaignId}/insights?fields=impressions,reach,spend,clicks,ctr,actions&access_token=${accessToken}`
    );

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        this.logger.error('Get campaign insights error:', data.error);
        return { impressions: 0, reach: 0, spend: 0, clicks: 0, ctr: 0 };
      }

      const row = data.data?.[0];
      if (!row) {
        return { impressions: 0, reach: 0, spend: 0, clicks: 0, ctr: 0 };
      }

      return {
        impressions: parseInt(row.impressions || '0', 10),
        reach: parseInt(row.reach || '0', 10),
        spend: parseFloat(row.spend || '0'),
        clicks: parseInt(row.clicks || '0', 10),
        ctr: parseFloat(row.ctr || '0'),
        actions: row.actions,
      };
    } catch (error) {
      this.logger.error('Get campaign insights failed:', error);
      return { impressions: 0, reach: 0, spend: 0, clicks: 0, ctr: 0 };
    }
  }
}
