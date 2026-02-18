import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ===========================================
// Types
// ===========================================

export interface OverviewStats {
  totalContacts: number;
  totalConversations: number;
  totalMessages: number;
  totalCampaigns: number;
  activePages: number;
  openConversations: number;
  pendingConversations: number;
  resolvedConversations: number;
  unreadConversations: number;
}

export interface MessageStats {
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  sentMessages: number;
  deliveredMessages: number;
  readMessages: number;
  failedMessages: number;
  responseRate: number;
  messagesByDay: { date: string; inbound: number; outbound: number; total: number }[];
  messagesByStatus: { status: string; count: number }[];
}

export interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  draftCampaigns: number;
  scheduledCampaigns: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  averageDeliveryRate: number;
  topCampaigns: {
    id: string;
    name: string;
    type: string;
    status: string;
    sentCount: number;
    deliveredCount: number;
    failedCount: number;
    deliveryRate: number;
    createdAt: Date;
  }[];
}

export interface ContactGrowth {
  totalContacts: number;
  newContactsToday: number;
  newContactsThisWeek: number;
  newContactsThisMonth: number;
  contactsByDay: { date: string; count: number; cumulative: number }[];
  contactsBySource: { source: string; count: number }[];
  contactsByEngagement: { level: string; count: number }[];
  subscribedContacts: number;
  unsubscribedContacts: number;
}

export interface PagePerformance {
  pageId: string;
  pageName: string;
  profilePictureUrl: string | null;
  totalContacts: number;
  totalMessages: number;
  totalConversations: number;
  followersCount: number;
  isActive: boolean;
}

export interface EngagementMetrics {
  averageResponseTimeMinutes: number;
  messagesPerContact: number;
  activeContactsLast24h: number;
  activeContactsLast7d: number;
  activeContactsLast30d: number;
  bypassMethodUsage: { method: string; count: number }[];
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get overview stats for a workspace
   */
  async getOverview(workspaceId: string): Promise<OverviewStats> {
    const [
      totalContacts,
      totalConversations,
      totalMessages,
      totalCampaigns,
      activePages,
      conversationsByStatus,
      unreadConversations,
    ] = await Promise.all([
      this.prisma.contact.count({ where: { workspaceId } }),
      this.prisma.conversation.count({ where: { workspaceId } }),
      this.prisma.message.count({
        where: { page: { workspaceId } },
      }),
      this.prisma.campaign.count({ where: { workspaceId } }),
      this.prisma.page.count({ where: { workspaceId, isActive: true } }),
      this.prisma.conversation.groupBy({
        by: ['status'],
        where: { workspaceId },
        _count: true,
      }),
      this.prisma.conversation.count({
        where: { workspaceId, unreadCount: { gt: 0 } },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    conversationsByStatus.forEach((s) => {
      statusMap[s.status] = s._count;
    });

    return {
      totalContacts,
      totalConversations,
      totalMessages,
      totalCampaigns,
      activePages,
      openConversations: statusMap['OPEN'] || 0,
      pendingConversations: statusMap['PENDING'] || 0,
      resolvedConversations: statusMap['RESOLVED'] || 0,
      unreadConversations,
    };
  }

  /**
   * Get detailed message stats for a workspace
   */
  async getMessageStats(workspaceId: string, days: number = 30): Promise<MessageStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const where = {
      page: { workspaceId },
      createdAt: { gte: startDate },
    };

    const [
      totalMessages,
      inboundMessages,
      outboundMessages,
      messagesByStatus,
      dailyMessages,
    ] = await Promise.all([
      this.prisma.message.count({ where }),
      this.prisma.message.count({ where: { ...where, direction: 'INBOUND' } }),
      this.prisma.message.count({ where: { ...where, direction: 'OUTBOUND' } }),
      this.prisma.message.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.$queryRaw<{ date: string; inbound: number; outbound: number }[]>`
        SELECT 
          DATE(m."created_at") as date,
          COUNT(CASE WHEN m.direction = 'INBOUND' THEN 1 END)::int as inbound,
          COUNT(CASE WHEN m.direction = 'OUTBOUND' THEN 1 END)::int as outbound
        FROM messages m
        JOIN pages p ON m.page_id = p.id
        WHERE p.workspace_id = ${workspaceId}
          AND m.created_at >= ${startDate}
        GROUP BY DATE(m."created_at")
        ORDER BY date ASC
      `,
    ]);

    const statusCountMap: Record<string, number> = {};
    messagesByStatus.forEach((s) => {
      statusCountMap[s.status] = s._count;
    });

    const responseRate = outboundMessages > 0
      ? Math.min(inboundMessages / outboundMessages, 1)
      : 0;

    return {
      totalMessages,
      inboundMessages,
      outboundMessages,
      sentMessages: statusCountMap['SENT'] || 0,
      deliveredMessages: statusCountMap['DELIVERED'] || 0,
      readMessages: statusCountMap['READ'] || 0,
      failedMessages: statusCountMap['FAILED'] || 0,
      responseRate,
      messagesByDay: dailyMessages.map((d) => ({
        date: String(d.date),
        inbound: Number(d.inbound),
        outbound: Number(d.outbound),
        total: Number(d.inbound) + Number(d.outbound),
      })),
      messagesByStatus: messagesByStatus.map((s) => ({
        status: s.status,
        count: s._count,
      })),
    };
  }

  /**
   * Get campaign analytics for a workspace
   */
  async getCampaignStats(workspaceId: string): Promise<CampaignStats> {
    const [campaigns, campaignsByStatus] = await Promise.all([
      this.prisma.campaign.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          campaignType: true,
          status: true,
          sentCount: true,
          deliveredCount: true,
          failedCount: true,
          createdAt: true,
        },
      }),
      this.prisma.campaign.groupBy({
        by: ['status'],
        where: { workspaceId },
        _count: true,
        _sum: {
          sentCount: true,
          deliveredCount: true,
          failedCount: true,
        },
      }),
    ]);

    const statusMap: Record<string, { count: number; sent: number; delivered: number; failed: number }> = {};
    campaignsByStatus.forEach((s) => {
      statusMap[s.status] = {
        count: s._count,
        sent: s._sum.sentCount || 0,
        delivered: s._sum.deliveredCount || 0,
        failed: s._sum.failedCount || 0,
      };
    });

    const totalSent = Object.values(statusMap).reduce((sum, s) => sum + s.sent, 0);
    const totalDelivered = Object.values(statusMap).reduce((sum, s) => sum + s.delivered, 0);
    const totalFailed = Object.values(statusMap).reduce((sum, s) => sum + s.failed, 0);

    return {
      totalCampaigns: Object.values(statusMap).reduce((sum, s) => sum + s.count, 0),
      activeCampaigns: (statusMap['RUNNING']?.count || 0),
      completedCampaigns: (statusMap['COMPLETED']?.count || 0),
      draftCampaigns: (statusMap['DRAFT']?.count || 0),
      scheduledCampaigns: (statusMap['SCHEDULED']?.count || 0),
      totalSent,
      totalDelivered,
      totalFailed,
      averageDeliveryRate: totalSent > 0 ? totalDelivered / totalSent : 0,
      topCampaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.campaignType,
        status: c.status,
        sentCount: c.sentCount,
        deliveredCount: c.deliveredCount,
        failedCount: c.failedCount,
        deliveryRate: c.sentCount > 0 ? c.deliveredCount / c.sentCount : 0,
        createdAt: c.createdAt,
      })),
    };
  }

  /**
   * Get contact growth analytics
   */
  async getContactGrowth(workspaceId: string, days: number = 30): Promise<ContactGrowth> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);

    const [
      totalContacts,
      newContactsToday,
      newContactsThisWeek,
      newContactsThisMonth,
      contactsBySource,
      contactsByEngagement,
      subscribedContacts,
      dailyGrowth,
    ] = await Promise.all([
      this.prisma.contact.count({ where: { workspaceId } }),
      this.prisma.contact.count({
        where: { workspaceId, createdAt: { gte: todayStart } },
      }),
      this.prisma.contact.count({
        where: { workspaceId, createdAt: { gte: weekStart } },
      }),
      this.prisma.contact.count({
        where: { workspaceId, createdAt: { gte: monthStart } },
      }),
      this.prisma.contact.groupBy({
        by: ['source'],
        where: { workspaceId },
        _count: true,
      }),
      this.prisma.contact.groupBy({
        by: ['engagementLevel'],
        where: { workspaceId },
        _count: true,
      }),
      this.prisma.contact.count({
        where: { workspaceId, isSubscribed: true },
      }),
      this.prisma.$queryRaw<{ date: string; count: number }[]>`
        SELECT 
          DATE(created_at) as date,
          COUNT(*)::int as count
        FROM contacts
        WHERE workspace_id = ${workspaceId}
          AND created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
    ]);

    // Calculate cumulative growth
    let cumulative = totalContacts - dailyGrowth.reduce((sum, d) => sum + Number(d.count), 0);
    const contactsByDay = dailyGrowth.map((d) => {
      cumulative += Number(d.count);
      return {
        date: String(d.date),
        count: Number(d.count),
        cumulative,
      };
    });

    return {
      totalContacts,
      newContactsToday,
      newContactsThisWeek,
      newContactsThisMonth,
      contactsByDay,
      contactsBySource: contactsBySource.map((s) => ({
        source: s.source,
        count: s._count,
      })),
      contactsByEngagement: contactsByEngagement.map((e) => ({
        level: e.engagementLevel,
        count: e._count,
      })),
      subscribedContacts,
      unsubscribedContacts: totalContacts - subscribedContacts,
    };
  }

  /**
   * Get page performance for a workspace
   */
  async getPagePerformance(workspaceId: string): Promise<PagePerformance[]> {
    const pages = await this.prisma.page.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        profilePictureUrl: true,
        followersCount: true,
        isActive: true,
        _count: {
          select: {
            contacts: true,
            messages: true,
            conversations: true,
          },
        },
      },
    });

    return pages.map((p) => ({
      pageId: p.id,
      pageName: p.name,
      profilePictureUrl: p.profilePictureUrl,
      totalContacts: p._count.contacts,
      totalMessages: p._count.messages,
      totalConversations: p._count.conversations,
      followersCount: p.followersCount,
      isActive: p.isActive,
    }));
  }

  /**
   * Get engagement metrics for a workspace
   */
  async getEngagementMetrics(workspaceId: string): Promise<EngagementMetrics> {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalContacts,
      totalMessages,
      activeContacts24h,
      activeContacts7d,
      activeContacts30d,
      bypassUsage,
    ] = await Promise.all([
      this.prisma.contact.count({ where: { workspaceId } }),
      this.prisma.message.count({ where: { page: { workspaceId } } }),
      this.prisma.contact.count({
        where: { workspaceId, lastInteractionAt: { gte: last24h } },
      }),
      this.prisma.contact.count({
        where: { workspaceId, lastInteractionAt: { gte: last7d } },
      }),
      this.prisma.contact.count({
        where: { workspaceId, lastInteractionAt: { gte: last30d } },
      }),
      this.prisma.message.groupBy({
        by: ['bypassMethod'],
        where: {
          page: { workspaceId },
          direction: 'OUTBOUND',
          bypassMethod: { not: null },
        },
        _count: true,
      }),
    ]);

    // Calculate average response time from conversations
    const conversations = await this.prisma.conversation.findMany({
      where: { workspaceId },
      select: { createdAt: true, lastMessageAt: true },
      take: 100,
      orderBy: { lastMessageAt: 'desc' },
    });

    let avgResponseTime = 0;
    if (conversations.length > 0) {
      const totalResponseTime = conversations.reduce((sum, c) => {
        if (c.lastMessageAt) {
          return sum + (c.lastMessageAt.getTime() - c.createdAt.getTime());
        }
        return sum;
      }, 0);
      avgResponseTime = totalResponseTime / conversations.length / 60000; // minutes
    }

    return {
      averageResponseTimeMinutes: Math.round(avgResponseTime * 10) / 10,
      messagesPerContact: totalContacts > 0 ? Math.round((totalMessages / totalContacts) * 10) / 10 : 0,
      activeContactsLast24h: activeContacts24h,
      activeContactsLast7d: activeContacts7d,
      activeContactsLast30d: activeContacts30d,
      bypassMethodUsage: bypassUsage.map((b) => ({
        method: b.bypassMethod || 'NONE',
        count: b._count,
      })),
    };
  }
}
