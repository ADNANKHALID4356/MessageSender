import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EngagementLevel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// ===========================================
// Engagement Scoring Service
// ===========================================
// Calculates engagement scores for contacts
// based on activity patterns (messages, recency,
// response rate). Runs via @nestjs/schedule cron.
// ===========================================

interface ScoringWeights {
  recentMessage: number;      // Points for message within 24h
  messageVolume: number;      // Points per message (capped)
  bidirectional: number;      // Bonus for two-way conversations
  recencyDecay: number;       // Decay factor per day of inactivity
  subscriptionBonus: number;  // Bonus for active subscriptions
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  recentMessage: 20,
  messageVolume: 2,
  bidirectional: 15,
  recencyDecay: 1.5,
  subscriptionBonus: 10,
};

/** Shape returned by the Contact query with _count */
interface ContactForScoring {
  id: string;
  lastMessageFromContactAt: Date | null;
  lastMessageToContactAt: Date | null;
  lastInteractionAt: Date | null;
  firstInteractionAt: Date | null;
  isSubscribed: boolean;
  _count: { messages: number };
}

@Injectable()
export class EngagementScoringService {
  private readonly logger = new Logger(EngagementScoringService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Cron job: Recalculate engagement scores every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async recalculateAllScores(): Promise<void> {
    this.logger.log('Starting engagement score recalculation...');
    const startTime = Date.now();

    try {
      // Process in batches of 500
      let processed = 0;
      let skip = 0;
      const batchSize = 500;

      while (true) {
        const contacts = await this.prisma.contact.findMany({
          skip,
          take: batchSize,
          select: {
            id: true,
            lastMessageFromContactAt: true,
            lastMessageToContactAt: true,
            lastInteractionAt: true,
            firstInteractionAt: true,
            isSubscribed: true,
            _count: { select: { messages: true } },
          },
        });

        if (contacts.length === 0) break;

        const updates = contacts.map((contact) => {
          const score = this.calculateScore(contact);
          const level = this.scoreToLevel(score);
          return this.prisma.contact.update({
            where: { id: contact.id },
            data: { engagementScore: score, engagementLevel: level },
          });
        });

        await this.prisma.$transaction(updates);
        processed += contacts.length;
        skip += batchSize;
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      this.logger.log(`Engagement scores recalculated: ${processed} contacts in ${elapsed}s`);
    } catch (error: any) {
      this.logger.error(`Engagement scoring failed: ${error.message}`);
    }
  }

  /**
   * Calculate engagement score for a single contact (0-100)
   */
  calculateScore(
    contact: ContactForScoring,
    weights: ScoringWeights = DEFAULT_WEIGHTS,
  ): number {
    let score = 0;
    const now = Date.now();

    // 1. Recent activity bonus — message from contact within 24h
    if (contact.lastMessageFromContactAt) {
      const hoursSince = (now - contact.lastMessageFromContactAt.getTime()) / (1000 * 60 * 60);
      if (hoursSince <= 24) {
        score += weights.recentMessage;
      }
    }

    // 2. Message volume (capped at 30 points)
    const totalMessages = contact._count.messages;
    score += Math.min(totalMessages * weights.messageVolume, 30);

    // 3. Bidirectional conversation bonus
    //    If the contact has both sent and received messages, award points
    if (contact.lastMessageFromContactAt && contact.lastMessageToContactAt) {
      score += weights.bidirectional;
    }

    // 4. Subscription bonus
    if (contact.isSubscribed) {
      score += weights.subscriptionBonus;
    }

    // 5. Recency decay — reduce score based on inactivity
    if (contact.lastInteractionAt) {
      const daysSinceInteraction = (now - contact.lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24);
      const decay = Math.max(0, daysSinceInteraction * weights.recencyDecay);
      score = Math.max(0, score - decay);
    }

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Convert numeric score to EngagementLevel enum value
   */
  scoreToLevel(score: number): EngagementLevel {
    if (score >= 75) return EngagementLevel.HOT;
    if (score >= 40) return EngagementLevel.WARM;
    if (score >= 10) return EngagementLevel.COLD;
    return EngagementLevel.INACTIVE;
  }

  /**
   * Manually trigger scoring for a specific workspace
   */
  async scoreWorkspaceContacts(workspaceId: string): Promise<{ processed: number }> {
    const contacts = await this.prisma.contact.findMany({
      where: { workspaceId },
      select: {
        id: true,
        lastMessageFromContactAt: true,
        lastMessageToContactAt: true,
        lastInteractionAt: true,
        firstInteractionAt: true,
        isSubscribed: true,
        _count: { select: { messages: true } },
      },
    });

    const updates = contacts.map((contact) => {
      const score = this.calculateScore(contact);
      const level = this.scoreToLevel(score);
      return this.prisma.contact.update({
        where: { id: contact.id },
        data: { engagementScore: score, engagementLevel: level },
      });
    });

    await this.prisma.$transaction(updates);
    return { processed: contacts.length };
  }
}
