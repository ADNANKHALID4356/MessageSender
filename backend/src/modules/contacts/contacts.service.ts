import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateContactDto,
  UpdateContactDto,
  ContactListQueryDto,
  CreateTagDto,
  UpdateTagDto,
  BulkUpdateContactsDto,
} from './dto';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new contact
   */
  async create(workspaceId: string, dto: CreateContactDto) {
    // Verify page belongs to workspace
    const page = await this.prisma.page.findFirst({
      where: { id: dto.pageId, workspaceId },
    });

    if (!page) {
      throw new NotFoundException('Page not found in this workspace');
    }

    // Build full name
    const fullName = [dto.firstName, dto.lastName].filter(Boolean).join(' ') || null;

    return this.prisma.contact.create({
      data: {
        workspaceId,
        pageId: dto.pageId,
        psid: dto.psid,
        firstName: dto.firstName,
        lastName: dto.lastName,
        fullName,
        profilePictureUrl: dto.profilePictureUrl,
        locale: dto.locale,
        timezone: dto.timezone,
        gender: dto.gender,
        source: dto.source,
        customFields: (dto.customFields || {}) as any,
        notes: dto.notes,
        firstInteractionAt: new Date(),
      },
      include: {
        tags: { include: { tag: true } },
        page: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Get contacts for workspace with pagination and filters
   */
  async findAll(workspaceId: string, query: ContactListQueryDto) {
    const {
      page = 1,
      limit = 20,
      search,
      engagementLevel,
      pageId,
      tagIds,
      isSubscribed,
      sortBy = 'lastInteractionAt',
      sortOrder = 'desc',
    } = query;

    const where: Record<string, unknown> = { workspaceId };

    // Search filter
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { psid: { contains: search } },
      ];
    }

    // Other filters
    if (engagementLevel) where.engagementLevel = engagementLevel;
    if (pageId) where.pageId = pageId;
    if (typeof isSubscribed === 'boolean') where.isSubscribed = isSubscribed;

    // Tag filter
    if (tagIds && tagIds.length > 0) {
      where.tags = {
        some: {
          tagId: { in: tagIds },
        },
      };
    }

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        include: {
          tags: { include: { tag: true } },
          page: { select: { id: true, name: true } },
          _count: { select: { messages: true, conversations: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      data: contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get contact by ID
   */
  async findById(workspaceId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, workspaceId },
      include: {
        tags: { include: { tag: true } },
        page: { select: { id: true, name: true, profilePictureUrl: true } },
        conversations: {
          take: 5,
          orderBy: { lastMessageAt: 'desc' },
          select: {
            id: true,
            status: true,
            lastMessageAt: true,
            lastMessagePreview: true,
            unreadCount: true,
          },
        },
        _count: {
          select: { messages: true, conversations: true },
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  /**
   * Get contact by PSID and Page
   */
  async findByPsid(pageId: string, psid: string) {
    return this.prisma.contact.findUnique({
      where: { pageId_psid: { pageId, psid } },
      include: {
        tags: { include: { tag: true } },
      },
    });
  }

  /**
   * Get contact by PSID and Page (workspace-scoped version for webhooks)
   */
  async findByPsidAndPage(workspaceId: string, psid: string, pageId: string) {
    return this.prisma.contact.findFirst({
      where: {
        workspaceId,
        pageId,
        psid,
      },
      include: {
        tags: { include: { tag: true } },
      },
    });
  }

  /**
   * Update last interaction timestamp (for 24-hour window tracking)
   */
  async updateLastInteraction(
    contactId: string,
    timestamp: Date,
    direction: 'sent' | 'received',
  ) {
    const data: Record<string, unknown> = {
      lastInteractionAt: timestamp,
    };

    if (direction === 'received') {
      data.lastMessageFromContactAt = timestamp;
      // Increment engagement score when user messages us
      data.engagementScore = { increment: 5 };
    } else {
      data.lastMessageToContactAt = timestamp;
    }

    await this.prisma.contact.update({
      where: { id: contactId },
      data,
    });
  }

  /**
   * Update contact
   */
  async update(workspaceId: string, id: string, dto: UpdateContactDto) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, workspaceId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // Update full name if first or last name changed
    let fullName = contact.fullName;
    if (dto.firstName !== undefined || dto.lastName !== undefined) {
      const firstName = dto.firstName ?? contact.firstName;
      const lastName = dto.lastName ?? contact.lastName;
      fullName = [firstName, lastName].filter(Boolean).join(' ') || null;
    }

    return this.prisma.contact.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        profilePictureUrl: dto.profilePictureUrl,
        engagementLevel: dto.engagementLevel,
        customFields: dto.customFields as any,
        isSubscribed: dto.isSubscribed,
        notes: dto.notes,
        fullName,
        unsubscribedAt: dto.isSubscribed === false ? new Date() : undefined,
      },
      include: {
        tags: { include: { tag: true } },
        page: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Delete contact
   */
  async delete(workspaceId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, workspaceId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    await this.prisma.contact.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Add tags to contact
   */
  async addTags(workspaceId: string, contactId: string, tagIds: string[]) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, workspaceId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // Verify all tags belong to workspace
    const tags = await this.prisma.tag.findMany({
      where: { id: { in: tagIds }, workspaceId },
    });

    if (tags.length !== tagIds.length) {
      throw new BadRequestException('Some tags not found in workspace');
    }

    // Create tag associations (ignore duplicates)
    await this.prisma.contactTag.createMany({
      data: tagIds.map((tagId) => ({
        contactId,
        tagId,
      })),
      skipDuplicates: true,
    });

    return this.findById(workspaceId, contactId);
  }

  /**
   * Remove tags from contact
   */
  async removeTags(workspaceId: string, contactId: string, tagIds: string[]) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, workspaceId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    await this.prisma.contactTag.deleteMany({
      where: {
        contactId,
        tagId: { in: tagIds },
      },
    });

    return this.findById(workspaceId, contactId);
  }

  /**
   * Bulk update contacts
   */
  async bulkUpdate(workspaceId: string, dto: BulkUpdateContactsDto) {
    const { contactIds, addTagIds, removeTagIds, engagementLevel, isSubscribed } = dto;

    // Verify contacts belong to workspace
    const contacts = await this.prisma.contact.findMany({
      where: { id: { in: contactIds }, workspaceId },
      select: { id: true },
    });

    if (contacts.length !== contactIds.length) {
      throw new BadRequestException('Some contacts not found in workspace');
    }

    // Add tags
    if (addTagIds && addTagIds.length > 0) {
      const tagData = contactIds.flatMap((contactId) =>
        addTagIds.map((tagId) => ({ contactId, tagId }))
      );
      await this.prisma.contactTag.createMany({
        data: tagData,
        skipDuplicates: true,
      });
    }

    // Remove tags
    if (removeTagIds && removeTagIds.length > 0) {
      await this.prisma.contactTag.deleteMany({
        where: {
          contactId: { in: contactIds },
          tagId: { in: removeTagIds },
        },
      });
    }

    // Update engagement level and subscription status
    if (engagementLevel || typeof isSubscribed === 'boolean') {
      await this.prisma.contact.updateMany({
        where: { id: { in: contactIds } },
        data: {
          ...(engagementLevel && { engagementLevel }),
          ...(typeof isSubscribed === 'boolean' && {
            isSubscribed,
            unsubscribedAt: isSubscribed === false ? new Date() : null,
          }),
        },
      });
    }

    return { success: true, updatedCount: contactIds.length };
  }

  /**
   * Update interaction timestamps
   */
  async updateInteraction(contactId: string, direction: 'inbound' | 'outbound') {
    const now = new Date();
    const data: Record<string, unknown> = {
      lastInteractionAt: now,
    };

    if (direction === 'inbound') {
      data.lastMessageFromContactAt = now;
    } else {
      data.lastMessageToContactAt = now;
    }

    // Also update engagement score
    await this.prisma.contact.update({
      where: { id: contactId },
      data: {
        ...data,
        engagementScore: { increment: direction === 'inbound' ? 5 : 1 },
      },
    });
  }

  /**
   * Calculate engagement level based on score
   */
  async recalculateEngagementLevel(contactId: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      select: { engagementScore: true, lastInteractionAt: true },
    });

    if (!contact) return;

    const daysSinceLastInteraction = contact.lastInteractionAt
      ? Math.floor((Date.now() - contact.lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    let engagementLevel: string;

    if (daysSinceLastInteraction > 30) {
      engagementLevel = 'INACTIVE';
    } else if (contact.engagementScore >= 50) {
      engagementLevel = 'HOT';
    } else if (contact.engagementScore >= 20) {
      engagementLevel = 'WARM';
    } else if (contact.engagementScore >= 5) {
      engagementLevel = 'COLD';
    } else {
      engagementLevel = 'NEW';
    }

    await this.prisma.contact.update({
      where: { id: contactId },
      data: { engagementLevel: engagementLevel as 'HOT' | 'WARM' | 'COLD' | 'INACTIVE' | 'NEW' },
    });
  }

  // ==========================================
  // TAG MANAGEMENT
  // ==========================================

  /**
   * Get all tags for workspace
   */
  async getTags(workspaceId: string) {
    return this.prisma.tag.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { contacts: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create a new tag
   */
  async createTag(workspaceId: string, dto: CreateTagDto) {
    // Check for duplicate
    const existing = await this.prisma.tag.findUnique({
      where: { workspaceId_name: { workspaceId, name: dto.name } },
    });

    if (existing) {
      throw new BadRequestException('Tag with this name already exists');
    }

    return this.prisma.tag.create({
      data: {
        workspaceId,
        name: dto.name,
        color: dto.color || '#6B7280',
      },
    });
  }

  /**
   * Update tag
   */
  async updateTag(workspaceId: string, tagId: string, dto: UpdateTagDto) {
    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, workspaceId },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Check for duplicate name
    if (dto.name && dto.name !== tag.name) {
      const existing = await this.prisma.tag.findUnique({
        where: { workspaceId_name: { workspaceId, name: dto.name } },
      });
      if (existing) {
        throw new BadRequestException('Tag with this name already exists');
      }
    }

    return this.prisma.tag.update({
      where: { id: tagId },
      data: dto,
    });
  }

  /**
   * Delete tag
   */
  async deleteTag(workspaceId: string, tagId: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, workspaceId },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    await this.prisma.tag.delete({ where: { id: tagId } });
    return { success: true };
  }

  /**
   * Get contact statistics for workspace
   */
  async getStats(workspaceId: string) {
    const [
      totalContacts,
      subscribedContacts,
      engagementStats,
      recentContacts,
    ] = await Promise.all([
      this.prisma.contact.count({ where: { workspaceId } }),
      this.prisma.contact.count({ where: { workspaceId, isSubscribed: true } }),
      this.prisma.contact.groupBy({
        by: ['engagementLevel'],
        where: { workspaceId },
        _count: true,
      }),
      this.prisma.contact.count({
        where: {
          workspaceId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const engagementByLevel: Record<string, number> = {};
    for (const item of engagementStats) {
      engagementByLevel[item.engagementLevel] = item._count;
    }

    return {
      totalContacts,
      subscribedContacts,
      unsubscribedContacts: totalContacts - subscribedContacts,
      newContactsThisWeek: recentContacts,
      engagementByLevel: {
        hot: engagementByLevel['HOT'] || 0,
        warm: engagementByLevel['WARM'] || 0,
        cold: engagementByLevel['COLD'] || 0,
        inactive: engagementByLevel['INACTIVE'] || 0,
        new: engagementByLevel['NEW'] || 0,
      },
    };
  }
}
