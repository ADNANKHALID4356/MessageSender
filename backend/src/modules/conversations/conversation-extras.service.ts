import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ===========================================
// DTOs
// ===========================================

export class CreateNoteDto {
  content: string;
}

export class UpdateLabelsDto {
  labels: string[];
}

export class AddLabelDto {
  label: string;
}

// ===========================================
// Service
// ===========================================

@Injectable()
export class ConversationExtrasService {
  private readonly logger = new Logger(ConversationExtrasService.name);

  constructor(private prisma: PrismaService) {}

  // ===========================================
  // NOTES
  // ===========================================

  /**
   * Get all notes for a conversation
   */
  async getNotes(workspaceId: string, conversationId: string) {
    await this.verifyConversation(workspaceId, conversationId);

    return this.prisma.conversationNote.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdByAdmin: { select: { id: true, username: true, firstName: true, lastName: true } },
        createdByUser: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Create a note on a conversation
   */
  async createNote(
    workspaceId: string,
    conversationId: string,
    content: string,
    createdBy: { adminId?: string; userId?: string },
  ) {
    await this.verifyConversation(workspaceId, conversationId);

    return this.prisma.conversationNote.create({
      data: {
        conversationId,
        content,
        createdByAdminId: createdBy.adminId,
        createdByUserId: createdBy.userId,
      },
      include: {
        createdByAdmin: { select: { id: true, username: true, firstName: true, lastName: true } },
        createdByUser: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Delete a note
   */
  async deleteNote(workspaceId: string, conversationId: string, noteId: string) {
    await this.verifyConversation(workspaceId, conversationId);

    const note = await this.prisma.conversationNote.findFirst({
      where: { id: noteId, conversationId },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    await this.prisma.conversationNote.delete({ where: { id: noteId } });
    return { deleted: true };
  }

  // ===========================================
  // LABELS
  // ===========================================

  /**
   * Get labels for a conversation
   */
  async getLabels(workspaceId: string, conversationId: string) {
    const conversation = await this.verifyConversation(workspaceId, conversationId);
    return { labels: conversation.labels };
  }

  /**
   * Set labels on a conversation (replace all)
   */
  async setLabels(workspaceId: string, conversationId: string, labels: string[]) {
    await this.verifyConversation(workspaceId, conversationId);

    // Deduplicate and normalize
    const uniqueLabels = [...new Set(labels.map((l) => l.trim().toLowerCase()))].filter(Boolean);

    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { labels: uniqueLabels },
      select: { id: true, labels: true },
    });
  }

  /**
   * Add a label to a conversation
   */
  async addLabel(workspaceId: string, conversationId: string, label: string) {
    const conversation = await this.verifyConversation(workspaceId, conversationId);

    const normalizedLabel = label.trim().toLowerCase();
    if (!normalizedLabel) return { labels: conversation.labels };

    if (conversation.labels.includes(normalizedLabel)) {
      return { labels: conversation.labels };
    }

    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { labels: [...conversation.labels, normalizedLabel] },
      select: { id: true, labels: true },
    });
  }

  /**
   * Remove a label from a conversation
   */
  async removeLabel(workspaceId: string, conversationId: string, label: string) {
    const conversation = await this.verifyConversation(workspaceId, conversationId);
    const normalizedLabel = label.trim().toLowerCase();

    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { labels: conversation.labels.filter((l) => l !== normalizedLabel) },
      select: { id: true, labels: true },
    });
  }

  /**
   * Get all unique labels used across workspace
   */
  async getAllLabels(workspaceId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { workspaceId },
      select: { labels: true },
    });

    const labelCounts = new Map<string, number>();
    for (const conv of conversations) {
      for (const label of conv.labels) {
        labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
      }
    }

    return Array.from(labelCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }

  // ===========================================
  // Private
  // ===========================================

  private async verifyConversation(workspaceId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }
}
