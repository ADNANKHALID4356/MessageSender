import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { FacebookApiService } from '../facebook/facebook-api.service';
import { EncryptionService } from '../../common/encryption.service';

// ===========================================
// Page Sync Service (FR-3.2.5)
// Syncs page data every 15 minutes via @Cron and handles token refresh
// ===========================================

@Injectable()
export class PageSyncService implements OnApplicationShutdown {
  private readonly logger = new Logger(PageSyncService.name);
  private isSyncing = false;
  private isShuttingDown = false;

  constructor(
    private prisma: PrismaService,
    private facebookApi: FacebookApiService,
    private encryption: EncryptionService,
  ) {}

  // ===========================================
  // Lifecycle
  // ===========================================

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Stopping page sync on ${signal || 'shutdown'}...`);
    this.isShuttingDown = true;
  }

  // ===========================================
  // Scheduled Sync — runs every 15 minutes
  // ===========================================

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleScheduledSync(): Promise<void> {
    if (this.isShuttingDown) return;
    if (this.isSyncing) {
      this.logger.warn('Page sync already in progress, skipping this run');
      return;
    }

    try {
      this.isSyncing = true;
      await this.syncAllPages();
    } catch (error) {
      this.logger.error('Scheduled page sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * @deprecated Use @Cron-based scheduling. Kept for backward compatibility in tests.
   */
  startPeriodicSync(): void {
    this.logger.log('Page sync is managed by @Cron scheduler');
  }

  /**
   * @deprecated Use @Cron-based scheduling. Kept for backward compatibility in tests.
   */
  stopPeriodicSync(): void {
    this.isShuttingDown = true;
    this.logger.log('Page sync stopped');
  }

  // ===========================================
  // Sync All Pages
  // ===========================================

  /**
   * Sync all active pages across all workspaces
   */
  async syncAllPages(): Promise<{
    synced: number;
    failed: number;
    tokenRefreshed: number;
    errors: Array<{ pageId: string; error: string }>;
  }> {
    const pages = await this.prisma.page.findMany({
      where: { isActive: true },
      include: {
        facebookAccount: {
          select: { accessToken: true, tokenExpiresAt: true },
        },
      },
    });

    let synced = 0;
    let failed = 0;
    let tokenRefreshed = 0;
    const errors: Array<{ pageId: string; error: string }> = [];

    for (const page of pages) {
      try {
        // Check if token needs refresh first
        const tokenStatus = await this.checkTokenExpiry(page);
        if (tokenStatus === 'refreshed') tokenRefreshed++;

        // Sync page data from Facebook
        await this.syncPageData(page.id);
        synced++;
      } catch (error: any) {
        failed++;
        errors.push({ pageId: page.id, error: error.message });
        this.logger.warn(`Failed to sync page ${page.id}: ${error.message}`);

        // Record error
        await this.prisma.page.update({
          where: { id: page.id },
          data: { tokenError: error.message },
        }).catch(() => {});
      }
    }

    this.logger.log(
      `Page sync complete: ${synced} synced, ${failed} failed, ${tokenRefreshed} tokens refreshed`,
    );

    return { synced, failed, tokenRefreshed, errors };
  }

  // ===========================================
  // Sync Individual Page
  // ===========================================

  /**
   * Sync a single page's data from Facebook API
   */
  async syncPageData(pageId: string): Promise<void> {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
      select: {
        id: true,
        fbPageId: true,
        accessToken: true,
      },
    });

    if (!page) return;

    try {
      // Fetch updated page info from Facebook
      const pageInfo = await this.facebookApi.getPageInfo(page.fbPageId, this.encryption.decryptIfNeeded(page.accessToken));

      // Update page data
      await this.prisma.page.update({
        where: { id: page.id },
        data: {
          name: pageInfo.name || undefined,
          profilePictureUrl: pageInfo.picture?.data?.url || undefined,
          followersCount: pageInfo.followers_count || undefined,
          category: pageInfo.category || undefined,
          lastSyncedAt: new Date(),
          tokenError: null, // Clear any previous errors
        },
      });

      this.logger.debug(`Page ${page.id} synced successfully`);
    } catch (error: any) {
      // Update page with error but don't throw
      await this.prisma.page.update({
        where: { id: page.id },
        data: { tokenError: `Sync failed: ${error.message}` },
      });
      throw error;
    }
  }

  // ===========================================
  // Token Management
  // ===========================================

  /**
   * Check token expiry and attempt refresh if needed
   */
  private async checkTokenExpiry(page: any): Promise<'valid' | 'refreshed' | 'expired'> {
    // Check page token expiry
    if (page.tokenExpiresAt) {
      const expiresIn = new Date(page.tokenExpiresAt).getTime() - Date.now();
      const daysUntilExpiry = expiresIn / (1000 * 60 * 60 * 24);

      // If token expires within 7 days, attempt refresh
      if (daysUntilExpiry <= 7) {
        try {
          await this.refreshPageToken(page.id);
          return 'refreshed';
        } catch (error: any) {
          this.logger.warn(`Token refresh failed for page ${page.id}: ${error.message}`);
          if (daysUntilExpiry <= 0) return 'expired';
        }
      }
    }

    // Check Facebook account token
    if (page.facebookAccount?.tokenExpiresAt) {
      const accountExpiresIn = new Date(page.facebookAccount.tokenExpiresAt).getTime() - Date.now();
      if (accountExpiresIn <= 7 * 24 * 60 * 60 * 1000) {
        this.logger.warn(
          `Facebook account token for page ${page.id} expires soon. User re-auth may be needed.`,
        );
      }
    }

    return 'valid';
  }

  /**
   * Refresh a page's access token using the long-lived token exchange
   */
  async refreshPageToken(pageId: string): Promise<void> {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
      include: {
        facebookAccount: true,
      },
    });

    if (!page) return;

    try {
      // Exchange for a new long-lived page token using the Facebook Account token
      const newToken = await this.facebookApi.getLongLivedToken(
        this.encryption.decryptIfNeeded(page.facebookAccount.accessToken),
      );

      // Re-fetch page tokens using the account token
      const pageToken = await this.facebookApi.getPageAccessToken(
        page.fbPageId,
        this.encryption.decryptIfNeeded(page.facebookAccount.accessToken),
      );

      if (pageToken) {
        await this.prisma.page.update({
          where: { id: page.id },
          data: {
            accessToken: this.encryption.encrypt(pageToken),
            tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // ~60 days
            tokenError: null,
          },
        });

        this.logger.log(`Token refreshed for page ${page.id}`);
      }
    } catch (error: any) {
      this.logger.error(`Token refresh failed for page ${pageId}: ${error.message}`);
      await this.prisma.page.update({
        where: { id: pageId },
        data: { tokenError: `Token refresh failed: ${error.message}` },
      });
      throw error;
    }
  }

  // ===========================================
  // Webhook Management
  // ===========================================

  /**
   * Re-subscribe webhooks for pages that lost their subscription
   */
  async resubscribeWebhooks(): Promise<{
    resubscribed: number;
    failed: number;
  }> {
    const unsubscribedPages = await this.prisma.page.findMany({
      where: {
        isActive: true,
        webhookSubscribed: false,
      },
    });

    let resubscribed = 0;
    let failed = 0;

    for (const page of unsubscribedPages) {
      try {
        await this.facebookApi.subscribePageToWebhook(page.fbPageId, this.encryption.decryptIfNeeded(page.accessToken));
        await this.prisma.page.update({
          where: { id: page.id },
          data: { webhookSubscribed: true },
        });
        resubscribed++;
      } catch (error: any) {
        failed++;
        this.logger.warn(`Webhook resubscribe failed for page ${page.id}: ${error.message}`);
      }
    }

    return { resubscribed, failed };
  }

  // ===========================================
  // Health Status
  // ===========================================

  /**
   * Get page health status for all pages in a workspace
   */
  async getPageHealthStatus(workspaceId: string): Promise<Array<{
    pageId: string;
    pageName: string;
    isActive: boolean;
    webhookSubscribed: boolean;
    tokenStatus: 'valid' | 'expiring_soon' | 'expired' | 'error';
    lastSyncedAt: string | null;
    tokenError: string | null;
    followersCount: number;
  }>> {
    const pages = await this.prisma.page.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        isActive: true,
        webhookSubscribed: true,
        tokenExpiresAt: true,
        lastSyncedAt: true,
        tokenError: true,
        followersCount: true,
      },
    });

    return pages.map(page => {
      let tokenStatus: 'valid' | 'expiring_soon' | 'expired' | 'error' = 'valid';
      if (page.tokenError) tokenStatus = 'error';
      else if (page.tokenExpiresAt) {
        const daysLeft = (new Date(page.tokenExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        if (daysLeft <= 0) tokenStatus = 'expired';
        else if (daysLeft <= 7) tokenStatus = 'expiring_soon';
      }

      return {
        pageId: page.id,
        pageName: page.name,
        isActive: page.isActive,
        webhookSubscribed: page.webhookSubscribed,
        tokenStatus,
        lastSyncedAt: page.lastSyncedAt?.toISOString() || null,
        tokenError: page.tokenError,
        followersCount: page.followersCount,
      };
    });
  }
}
