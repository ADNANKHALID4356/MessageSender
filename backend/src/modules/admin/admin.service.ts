import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ===========================================
// Types
// ===========================================

export interface SystemSettingsMap {
  [key: string]: any;
}

export interface ActivityLogEntry {
  id: string;
  workspaceId: string | null;
  adminId: string | null;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: any;
  ipAddress: string | null;
  createdAt: Date;
  admin?: { firstName: string | null; lastName: string | null; email: string } | null;
  user?: { firstName: string; lastName: string | null; email: string } | null;
}

export interface AdminDashboardStats {
  totalWorkspaces: number;
  activeWorkspaces: number;
  totalTeamMembers: number;
  activeTeamMembers: number;
  pendingInvitations: number;
  totalContacts: number;
  totalMessages: number;
  totalCampaigns: number;
  totalPages: number;
  activePages: number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================
  // System Settings
  // ===========================================

  /**
   * Get all system settings
   */
  async getSettings(): Promise<SystemSettingsMap> {
    const settings = await this.prisma.systemSetting.findMany();
    const map: SystemSettingsMap = {};
    settings.forEach((s) => {
      map[s.key] = s.value;
    });
    return map;
  }

  /**
   * Get a single system setting
   */
  async getSetting(key: string): Promise<any> {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    return setting?.value ?? null;
  }

  /**
   * Set a system setting (upsert)
   */
  async setSetting(key: string, value: any): Promise<void> {
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    this.logger.log(`System setting updated: ${key}`);
  }

  /**
   * Update multiple settings at once
   */
  async updateSettings(settings: Record<string, any>): Promise<void> {
    const operations = Object.entries(settings).map(([key, value]) =>
      this.prisma.systemSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      }),
    );
    await this.prisma.$transaction(operations);
    this.logger.log(`Updated ${operations.length} system settings`);
  }

  /**
   * Delete a system setting
   */
  async deleteSetting(key: string): Promise<void> {
    await this.prisma.systemSetting.deleteMany({ where: { key } });
  }

  // ===========================================
  // Activity Logging
  // ===========================================

  /**
   * Log an activity
   */
  async logActivity(params: {
    workspaceId?: string;
    adminId?: string;
    userId?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    details?: any;
    ipAddress?: string;
  }): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          workspaceId: params.workspaceId || null,
          adminId: params.adminId || null,
          userId: params.userId || null,
          action: params.action,
          entityType: params.entityType || null,
          entityId: params.entityId || null,
          details: params.details || null,
          ipAddress: params.ipAddress || null,
        },
      });
    } catch (error) {
      // Don't throw on logging failure — just warn
      this.logger.warn(`Failed to log activity: ${error.message}`);
    }
  }

  /**
   * Get activity logs with pagination and filters
   */
  async getActivityLogs(params: {
    workspaceId?: string;
    adminId?: string;
    userId?: string;
    action?: string;
    entityType?: string;
    page?: number;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ data: ActivityLogEntry[]; total: number; page: number; limit: number }> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.workspaceId) where.workspaceId = params.workspaceId;
    if (params.adminId) where.adminId = params.adminId;
    if (params.userId) where.userId = params.userId;
    if (params.action) where.action = { contains: params.action, mode: 'insensitive' };
    if (params.entityType) where.entityType = params.entityType;
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: { select: { firstName: true, lastName: true, email: true } },
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ===========================================
  // Admin Dashboard
  // ===========================================

  /**
   * Get admin dashboard stats (system-wide)
   */
  async getDashboardStats(): Promise<AdminDashboardStats> {
    const [
      totalWorkspaces,
      activeWorkspaces,
      totalTeamMembers,
      activeTeamMembers,
      pendingInvitations,
      totalContacts,
      totalMessages,
      totalCampaigns,
      totalPages,
      activePages,
    ] = await Promise.all([
      this.prisma.workspace.count(),
      this.prisma.workspace.count({ where: { isActive: true } }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { status: 'PENDING' } }),
      this.prisma.contact.count(),
      this.prisma.message.count(),
      this.prisma.campaign.count(),
      this.prisma.page.count(),
      this.prisma.page.count({ where: { isActive: true } }),
    ]);

    return {
      totalWorkspaces,
      activeWorkspaces,
      totalTeamMembers,
      activeTeamMembers,
      pendingInvitations,
      totalContacts,
      totalMessages,
      totalCampaigns,
      totalPages,
      activePages,
    };
  }

  // ===========================================
  // Data Export
  // ===========================================

  /**
   * Export contacts for a workspace as JSON
   */
  async exportContacts(workspaceId: string): Promise<any[]> {
    const contacts = await this.prisma.contact.findMany({
      where: { workspaceId },
      include: {
        tags: { include: { tag: true } },
        page: { select: { name: true, fbPageId: true } },
      },
    });

    return contacts.map((c) => ({
      id: c.id,
      psid: c.psid,
      firstName: c.firstName,
      lastName: c.lastName,
      fullName: c.fullName,
      source: c.source,
      engagementLevel: c.engagementLevel,
      engagementScore: c.engagementScore,
      isSubscribed: c.isSubscribed,
      customFields: c.customFields,
      tags: c.tags.map((t) => t.tag.name),
      pageName: c.page.name,
      firstInteractionAt: c.firstInteractionAt,
      lastInteractionAt: c.lastInteractionAt,
      createdAt: c.createdAt,
    }));
  }

  /**
   * Export campaigns for a workspace as JSON
   */
  async exportCampaigns(workspaceId: string): Promise<any[]> {
    const campaigns = await this.prisma.campaign.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        description: true,
        campaignType: true,
        status: true,
        audienceType: true,
        totalRecipients: true,
        sentCount: true,
        deliveredCount: true,
        failedCount: true,
        scheduledAt: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
      },
    });

    return campaigns;
  }
}
