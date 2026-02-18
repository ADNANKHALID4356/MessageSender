import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { BypassMethod, MessageTag } from '@prisma/client';

// ===========================================
// Compliance Types
// ===========================================

export interface ComplianceWarning {
  type: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  details?: string;
}

export interface ComplianceCheckResult {
  canSend: boolean;
  warnings: ComplianceWarning[];
  recommendedBypassMethod: BypassMethod | null;
  cooldownRemaining?: number; // seconds
}

export interface TagUsageRecord {
  contactId: string;
  tag: MessageTag;
  count: number;
  lastUsedAt: string;
}

export interface ComplianceAuditEntry {
  id: string;
  workspaceId: string;
  contactId: string;
  action: string;
  bypassMethod: string;
  messageTag?: string;
  isCompliant: boolean;
  warnings: ComplianceWarning[];
  createdAt: Date;
}

// ===========================================
// Compliance Monitoring Service (FR-7.7)
// ===========================================

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);
  private readonly TAG_USAGE_PREFIX = 'compliance:tag-usage:';
  private readonly COOLDOWN_PREFIX = 'compliance:cooldown:';
  private readonly AUDIT_PREFIX = 'compliance:audit:';

  // Cooldown periods in seconds per tag type
  private readonly TAG_COOLDOWNS: Record<string, number> = {
    CONFIRMED_EVENT_UPDATE: 86400,   // 24 hours between event updates
    POST_PURCHASE_UPDATE: 86400,     // 24 hours between purchase updates
    ACCOUNT_UPDATE: 43200,           // 12 hours between account updates
    HUMAN_AGENT: 604800,             // 7 days (actually controlled by FB)
  };

  // Maximum tag usage per contact per 30-day rolling window
  private readonly MAX_TAG_USAGE_PER_30_DAYS: Record<string, number> = {
    CONFIRMED_EVENT_UPDATE: 10,
    POST_PURCHASE_UPDATE: 15,
    ACCOUNT_UPDATE: 20,
    HUMAN_AGENT: 5,
  };

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // ===========================================
  // Pre-Send Compliance Check (FR-7.7.1)
  // ===========================================

  /**
   * Check compliance before sending a message to a contact
   */
  async checkCompliance(
    workspaceId: string,
    contactId: string,
    pageId: string,
    bypassMethod?: BypassMethod,
    messageTag?: MessageTag,
  ): Promise<ComplianceCheckResult> {
    const warnings: ComplianceWarning[] = [];
    let canSend = true;

    // 1. Check 24-hour window status
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      select: {
        lastMessageFromContactAt: true,
        isSubscribed: true,
        lastMessageToContactAt: true,
      },
    });

    if (!contact) {
      return { canSend: false, warnings: [{ type: 'error', code: 'CONTACT_NOT_FOUND', message: 'Contact not found' }], recommendedBypassMethod: null };
    }

    if (!contact.isSubscribed) {
      return { canSend: false, warnings: [{ type: 'error', code: 'UNSUBSCRIBED', message: 'Contact has unsubscribed' }], recommendedBypassMethod: null };
    }

    const isWithinWindow = contact.lastMessageFromContactAt &&
      (Date.now() - contact.lastMessageFromContactAt.getTime()) < 24 * 60 * 60 * 1000;

    if (!isWithinWindow) {
      if (!bypassMethod || bypassMethod === BypassMethod.WITHIN_WINDOW) {
        warnings.push({
          type: 'warning',
          code: 'OUTSIDE_WINDOW',
          message: '24-hour messaging window has expired. A bypass method is required.',
        });

        // Determine best bypass method
        const recommended = await this.recommendBypassMethod(contactId, pageId);
        if (!recommended) {
          canSend = false;
          warnings.push({
            type: 'error',
            code: 'NO_BYPASS_AVAILABLE',
            message: 'No bypass method available for this contact.',
          });
        }
        return { canSend, warnings, recommendedBypassMethod: recommended };
      }
    }

    // 2. Check tag compliance if using message tag
    if (messageTag) {
      const tagWarnings = await this.checkTagCompliance(contactId, messageTag);
      warnings.push(...tagWarnings);
      if (tagWarnings.some(w => w.type === 'error')) canSend = false;
    }

    // 3. Check cooldown period (FR-7.7.5)
    const cooldownKey = `${this.COOLDOWN_PREFIX}${contactId}:${pageId}`;
    const cooldownExpiry = await this.redis.get(cooldownKey);
    if (cooldownExpiry) {
      const remainingSeconds = Math.max(0, parseInt(cooldownExpiry, 10) - Math.floor(Date.now() / 1000));
      if (remainingSeconds > 0) {
        warnings.push({
          type: 'warning',
          code: 'COOLDOWN_ACTIVE',
          message: `Cool-down period active. ${Math.ceil(remainingSeconds / 60)} minutes remaining.`,
          details: `Next message allowed at ${new Date(Date.now() + remainingSeconds * 1000).toLocaleTimeString()}`,
        });
      }
    }

    // 4. Check message frequency (anti-spam)
    const recentMessageCount = await this.prisma.message.count({
      where: {
        contactId,
        pageId,
        direction: 'OUTBOUND',
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
      },
    });

    if (recentMessageCount >= 10) {
      warnings.push({
        type: 'warning',
        code: 'HIGH_FREQUENCY',
        message: `${recentMessageCount} messages sent to this contact in the last hour.`,
        details: 'Consider reducing message frequency to avoid policy violations.',
      });
    }

    if (recentMessageCount >= 20) {
      canSend = false;
      warnings.push({
        type: 'error',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many messages sent to this contact. Please wait before sending more.',
      });
    }

    return {
      canSend,
      warnings,
      recommendedBypassMethod: isWithinWindow ? BypassMethod.WITHIN_WINDOW : null,
    };
  }

  // ===========================================
  // Tag Compliance (FR-7.7.3)
  // ===========================================

  /**
   * Check tag usage compliance for a contact
   */
  private async checkTagCompliance(
    contactId: string,
    tag: MessageTag,
  ): Promise<ComplianceWarning[]> {
    const warnings: ComplianceWarning[] = [];

    // Get tag usage in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const usageCount = await this.prisma.message.count({
      where: {
        contactId,
        messageTag: tag,
        direction: 'OUTBOUND',
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const maxUsage = this.MAX_TAG_USAGE_PER_30_DAYS[tag] || 10;

    if (usageCount >= maxUsage) {
      warnings.push({
        type: 'error',
        code: 'TAG_LIMIT_EXCEEDED',
        message: `${tag} tag used ${usageCount}/${maxUsage} times in 30 days for this contact.`,
        details: 'Maximum tag usage limit reached. Use a different method.',
      });
    } else if (usageCount >= maxUsage * 0.8) {
      warnings.push({
        type: 'warning',
        code: 'TAG_LIMIT_APPROACHING',
        message: `${tag} tag used ${usageCount}/${maxUsage} times in 30 days (approaching limit).`,
      });
    }

    // Tag-specific compliance warnings
    switch (tag) {
      case 'CONFIRMED_EVENT_UPDATE':
        warnings.push({
          type: 'info',
          code: 'TAG_REQUIREMENT',
          message: 'Must relate to a confirmed event the user registered for.',
        });
        break;
      case 'POST_PURCHASE_UPDATE':
        warnings.push({
          type: 'info',
          code: 'TAG_REQUIREMENT',
          message: 'Must relate to a recent purchase transaction.',
        });
        break;
      case 'ACCOUNT_UPDATE':
        warnings.push({
          type: 'info',
          code: 'TAG_REQUIREMENT',
          message: 'Must be a non-recurring update about the user\'s account or application.',
        });
        break;
      case 'HUMAN_AGENT':
        warnings.push({
          type: 'info',
          code: 'TAG_REQUIREMENT',
          message: 'Must be a response to a user inquiry. Available for 7 days after user message.',
        });
        break;
    }

    return warnings;
  }

  // ===========================================
  // Record & Track (FR-7.7.2)
  // ===========================================

  /**
   * Record bypass method usage for audit trail
   */
  async recordBypassUsage(
    workspaceId: string,
    contactId: string,
    pageId: string,
    bypassMethod: BypassMethod,
    messageTag?: MessageTag,
    isCompliant = true,
    warnings: ComplianceWarning[] = [],
  ): Promise<void> {
    // Log to activity log
    await this.prisma.activityLog.create({
      data: {
        workspaceId,
        action: 'BYPASS_METHOD_USED',
        entityType: 'Message',
        entityId: contactId,
        details: {
          bypassMethod,
          messageTag,
          isCompliant,
          warningCount: warnings.length,
          warnings: warnings.map(w => w.code),
        } as any,
      },
    });

    // Set cooldown
    const cooldownSeconds = messageTag
      ? (this.TAG_COOLDOWNS[messageTag] || 3600)
      : 1800; // Default 30 min cooldown

    const cooldownKey = `${this.COOLDOWN_PREFIX}${contactId}:${pageId}`;
    const expiresAt = Math.floor(Date.now() / 1000) + cooldownSeconds;
    await this.redis.set(cooldownKey, expiresAt.toString(), cooldownSeconds);
  }

  // ===========================================
  // Compliance Audit Report (FR-7.7.6)
  // ===========================================

  /**
   * Generate compliance audit report for a workspace
   */
  async getComplianceReport(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    summary: {
      totalMessages: number;
      withinWindow: number;
      bypassMethodUsage: Record<string, number>;
      tagUsage: Record<string, number>;
      complianceViolations: number;
      averageCooldownRespected: number;
    };
    topViolatingContacts: Array<{
      contactId: string;
      contactName: string;
      violationCount: number;
    }>;
    dailyBreakdown: Array<{
      date: string;
      messages: number;
      bypassMessages: number;
      violations: number;
    }>;
  }> {
    // Get all outbound messages in date range
    const messages = await this.prisma.message.findMany({
      where: {
        page: { workspaceId },
        direction: 'OUTBOUND',
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        bypassMethod: true,
        messageTag: true,
        contactId: true,
        createdAt: true,
        contact: { select: { firstName: true, lastName: true } },
      },
    });

    // Calculate bypass method usage
    const bypassMethodUsage: Record<string, number> = {};
    const tagUsage: Record<string, number> = {};
    let withinWindow = 0;

    for (const msg of messages) {
      if (msg.bypassMethod) {
        bypassMethodUsage[msg.bypassMethod] = (bypassMethodUsage[msg.bypassMethod] || 0) + 1;
        if (msg.bypassMethod === 'WITHIN_WINDOW') withinWindow++;
      } else {
        withinWindow++;
      }
      if (msg.messageTag) {
        tagUsage[msg.messageTag] = (tagUsage[msg.messageTag] || 0) + 1;
      }
    }

    // Get compliance violations from activity log
    const violations = await this.prisma.activityLog.findMany({
      where: {
        workspaceId,
        action: 'BYPASS_METHOD_USED',
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        details: true,
        entityId: true,
      },
    });

    const violationCount = violations.filter(
      v => (v.details as any)?.isCompliant === false,
    ).length;

    // Top violating contacts
    const contactViolations: Record<string, number> = {};
    violations
      .filter(v => (v.details as any)?.isCompliant === false)
      .forEach(v => {
        if (v.entityId) contactViolations[v.entityId] = (contactViolations[v.entityId] || 0) + 1;
      });

    const topViolators = Object.entries(contactViolations)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    const topViolatingContacts = await Promise.all(
      topViolators.map(async ([contactId, count]) => {
        const contact = await this.prisma.contact.findUnique({
          where: { id: contactId },
          select: { firstName: true, lastName: true },
        });
        return {
          contactId,
          contactName: [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') || 'Unknown',
          violationCount: count,
        };
      }),
    );

    // Daily breakdown
    const dailyMap: Record<string, { messages: number; bypassMessages: number; violations: number }> = {};

    for (const msg of messages) {
      const dateKey = msg.createdAt.toISOString().split('T')[0];
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { messages: 0, bypassMessages: 0, violations: 0 };
      dailyMap[dateKey].messages++;
      if (msg.bypassMethod && msg.bypassMethod !== 'WITHIN_WINDOW') {
        dailyMap[dateKey].bypassMessages++;
      }
    }

    const dailyBreakdown = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({ date, ...stats }));

    return {
      summary: {
        totalMessages: messages.length,
        withinWindow,
        bypassMethodUsage,
        tagUsage,
        complianceViolations: violationCount,
        averageCooldownRespected: messages.length > 0 ? Math.round(((messages.length - violationCount) / messages.length) * 100) : 100,
      },
      topViolatingContacts,
      dailyBreakdown,
    };
  }

  // ===========================================
  // Bypass Method Recommendation (FR-7.6)
  // ===========================================

  /**
   * Recommend the best bypass method for a contact
   * Priority: OTN > Recurring > Tag > Sponsored > Blocked
   */
  private async recommendBypassMethod(
    contactId: string,
    pageId: string,
  ): Promise<BypassMethod | null> {
    // Check for available OTN tokens
    const otnTokens = await this.prisma.otnToken.count({
      where: {
        contactId,
        pageId,
        isUsed: false,
        token: { not: '' },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (otnTokens > 0) return BypassMethod.OTN_TOKEN;

    // Check for active recurring subscriptions
    const subscriptions = await this.prisma.recurringSubscription.count({
      where: { contactId, pageId, status: 'ACTIVE' },
    });
    if (subscriptions > 0) return BypassMethod.RECURRING_NOTIFICATION;

    // Check if HUMAN_AGENT tag is applicable (user messaged within 7 days)
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      select: { lastMessageFromContactAt: true },
    });

    if (contact?.lastMessageFromContactAt) {
      const daysSinceMessage = (Date.now() - contact.lastMessageFromContactAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceMessage <= 7) return BypassMethod.MESSAGE_TAG_HUMAN_AGENT;
    }

    // No bypass available
    return BypassMethod.BLOCKED;
  }
}
