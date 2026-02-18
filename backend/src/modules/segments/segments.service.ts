import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSegmentDto,
  UpdateSegmentDto,
  SegmentListQueryDto,
  SegmentContactsQueryDto,
  SegmentResponse,
  SegmentListResponse,
  SegmentPreviewResponse,
  FilterField,
  FilterOperator,
  FilterLogic,
  FilterConditionDto,
  FilterGroupDto,
  SegmentFiltersDto,
} from './dto';
import { SegmentType, Prisma } from '@prisma/client';

// ===========================================
// Segments Service
// ===========================================

@Injectable()
export class SegmentsService {
  private readonly logger = new Logger(SegmentsService.name);

  constructor(private prisma: PrismaService) {}

  // ===========================================
  // CRUD Operations
  // ===========================================

  /**
   * Create a new segment
   */
  async create(
    workspaceId: string,
    dto: CreateSegmentDto,
  ): Promise<SegmentResponse> {
    // Validate filters for dynamic segments
    if (dto.segmentType === SegmentType.DYNAMIC && !dto.filters) {
      throw new BadRequestException('Filters are required for dynamic segments');
    }

    // Validate contact IDs for static segments
    if (dto.segmentType === SegmentType.STATIC && (!dto.contactIds || dto.contactIds.length === 0)) {
      // Allow empty static segments that will be populated later
    }

    // Create segment
    const segment = await this.prisma.segment.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description,
        segmentType: dto.segmentType,
        filters: dto.filters as any || {},
        contactCount: 0,
      },
    });

    // For static segments with contact IDs, add them
    if (dto.segmentType === SegmentType.STATIC && dto.contactIds?.length) {
      await this.addContactsToSegment(segment.id, dto.contactIds);
    }

    // For dynamic segments, calculate initial count
    if (dto.segmentType === SegmentType.DYNAMIC && dto.filters) {
      await this.recalculateSegment(workspaceId, segment.id);
    }

    const result = await this.prisma.segment.findUnique({
      where: { id: segment.id },
    });

    this.logger.log(`Segment created: ${segment.id} - ${segment.name}`);

    return this.formatSegmentResponse(result!);
  }

  /**
   * Get segment by ID
   */
  async findById(workspaceId: string, segmentId: string): Promise<SegmentResponse> {
    const segment = await this.prisma.segment.findFirst({
      where: { id: segmentId, workspaceId },
    });

    if (!segment) {
      throw new NotFoundException('Segment not found');
    }

    return this.formatSegmentResponse(segment);
  }

  /**
   * List segments with filtering and pagination
   */
  async findAll(
    workspaceId: string,
    query: SegmentListQueryDto,
  ): Promise<SegmentListResponse> {
    const { page = 1, limit = 20, type, search, sortBy, sortOrder } = query;

    const where: Prisma.SegmentWhereInput = { workspaceId };

    if (type) where.segmentType = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.SegmentOrderByWithRelationInput = {};
    orderBy[sortBy || 'createdAt'] = sortOrder || 'desc';

    const [segments, total] = await Promise.all([
      this.prisma.segment.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.segment.count({ where }),
    ]);

    return {
      data: segments.map(s => this.formatSegmentResponse(s)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a segment
   */
  async update(
    workspaceId: string,
    segmentId: string,
    dto: UpdateSegmentDto,
  ): Promise<SegmentResponse> {
    const segment = await this.prisma.segment.findFirst({
      where: { id: segmentId, workspaceId },
    });

    if (!segment) {
      throw new NotFoundException('Segment not found');
    }

    const updated = await this.prisma.segment.update({
      where: { id: segmentId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.filters && { filters: dto.filters as any }),
      },
    });

    // Recalculate if filters changed and it's a dynamic segment
    if (dto.filters && segment.segmentType === SegmentType.DYNAMIC) {
      await this.recalculateSegment(workspaceId, segmentId);
    }

    this.logger.log(`Segment updated: ${segmentId}`);

    const result = await this.prisma.segment.findUnique({
      where: { id: segmentId },
    });

    return this.formatSegmentResponse(result!);
  }

  /**
   * Delete a segment
   */
  async delete(workspaceId: string, segmentId: string): Promise<void> {
    const segment = await this.prisma.segment.findFirst({
      where: { id: segmentId, workspaceId },
    });

    if (!segment) {
      throw new NotFoundException('Segment not found');
    }

    // Check if segment is used by any campaigns
    const campaignCount = await this.prisma.campaign.count({
      where: { audienceSegmentId: segmentId },
    });

    if (campaignCount > 0) {
      throw new BadRequestException(
        `Cannot delete segment: it is used by ${campaignCount} campaign(s)`,
      );
    }

    await this.prisma.segment.delete({ where: { id: segmentId } });

    this.logger.log(`Segment deleted: ${segmentId}`);
  }

  // ===========================================
  // Contact Management
  // ===========================================

  /**
   * Get contacts in a segment
   */
  async getContacts(
    workspaceId: string,
    segmentId: string,
    query: SegmentContactsQueryDto,
  ) {
    const segment = await this.prisma.segment.findFirst({
      where: { id: segmentId, workspaceId },
    });

    if (!segment) {
      throw new NotFoundException('Segment not found');
    }

    const { page = 1, limit = 50, search } = query;

    // For dynamic segments, build the query from filters
    if (segment.segmentType === SegmentType.DYNAMIC) {
      const filterWhere = this.buildFilterQuery(
        workspaceId,
        segment.filters as unknown as SegmentFiltersDto,
      );

      if (search) {
        filterWhere.OR = [
          { fullName: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [contacts, total] = await Promise.all([
        this.prisma.contact.findMany({
          where: filterWhere,
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            fullName: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            pageId: true,
            lastInteractionAt: true,
          },
        }),
        this.prisma.contact.count({ where: filterWhere }),
      ]);

      return {
        data: contacts,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    }

    // For static segments, query through SegmentContact
    const segmentContactWhere: Prisma.SegmentContactWhereInput = { segmentId };

    if (search) {
      segmentContactWhere.contact = {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [segmentContacts, total] = await Promise.all([
      this.prisma.segmentContact.findMany({
        where: segmentContactWhere,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          contact: {
            select: {
              id: true,
              fullName: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
              pageId: true,
              lastInteractionAt: true,
            },
          },
        },
      }),
      this.prisma.segmentContact.count({ where: segmentContactWhere }),
    ]);

    return {
      data: segmentContacts.map(sc => sc.contact),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Add contacts to a static segment
   */
  async addContacts(
    workspaceId: string,
    segmentId: string,
    contactIds: string[],
  ): Promise<{ added: number }> {
    const segment = await this.prisma.segment.findFirst({
      where: { id: segmentId, workspaceId },
    });

    if (!segment) {
      throw new NotFoundException('Segment not found');
    }

    if (segment.segmentType !== SegmentType.STATIC) {
      throw new BadRequestException('Can only manually add contacts to static segments');
    }

    const added = await this.addContactsToSegment(segmentId, contactIds);

    return { added };
  }

  /**
   * Remove contacts from a static segment
   */
  async removeContacts(
    workspaceId: string,
    segmentId: string,
    contactIds: string[],
  ): Promise<{ removed: number }> {
    const segment = await this.prisma.segment.findFirst({
      where: { id: segmentId, workspaceId },
    });

    if (!segment) {
      throw new NotFoundException('Segment not found');
    }

    if (segment.segmentType !== SegmentType.STATIC) {
      throw new BadRequestException('Can only manually remove contacts from static segments');
    }

    const result = await this.prisma.segmentContact.deleteMany({
      where: {
        segmentId,
        contactId: { in: contactIds },
      },
    });

    // Update contact count
    await this.updateContactCount(segmentId);

    return { removed: result.count };
  }

  // ===========================================
  // Preview & Recalculation
  // ===========================================

  /**
   * Preview segment results without saving
   */
  async preview(
    workspaceId: string,
    filters: SegmentFiltersDto,
  ): Promise<SegmentPreviewResponse> {
    const filterWhere = this.buildFilterQuery(workspaceId, filters);

    const [totalContacts, sampleContacts] = await Promise.all([
      this.prisma.contact.count({ where: filterWhere }),
      this.prisma.contact.findMany({
        where: filterWhere,
        take: 10,
        select: {
          id: true,
          fullName: true,
          pageId: true,
        },
      }),
    ]);

    return {
      totalContacts,
      sampleContacts: sampleContacts.map(c => ({
        id: c.id,
        fullName: c.fullName,
        email: null,
        pageId: c.pageId,
      })),
    };
  }

  /**
   * Recalculate a dynamic segment
   */
  async recalculateSegment(workspaceId: string, segmentId: string): Promise<void> {
    const segment = await this.prisma.segment.findFirst({
      where: { id: segmentId, workspaceId },
    });

    if (!segment) {
      throw new NotFoundException('Segment not found');
    }

    if (segment.segmentType !== SegmentType.DYNAMIC) {
      throw new BadRequestException('Can only recalculate dynamic segments');
    }

    const filters = segment.filters as unknown as SegmentFiltersDto;
    const filterWhere = this.buildFilterQuery(workspaceId, filters);

    const count = await this.prisma.contact.count({ where: filterWhere });

    await this.prisma.segment.update({
      where: { id: segmentId },
      data: {
        contactCount: count,
        lastCalculatedAt: new Date(),
      },
    });

    this.logger.log(`Segment recalculated: ${segmentId}, count: ${count}`);
  }

  /**
   * Recalculate all dynamic segments in a workspace
   */
  async recalculateAllSegments(workspaceId: string): Promise<void> {
    const segments = await this.prisma.segment.findMany({
      where: { workspaceId, segmentType: SegmentType.DYNAMIC },
    });

    for (const segment of segments) {
      await this.recalculateSegment(workspaceId, segment.id);
    }

    this.logger.log(`Recalculated ${segments.length} segments for workspace ${workspaceId}`);
  }

  // ===========================================
  // Filter Query Builder
  // ===========================================

  /**
   * Build Prisma where clause from segment filters
   */
  private buildFilterQuery(
    workspaceId: string,
    filters: SegmentFiltersDto,
  ): Prisma.ContactWhereInput {
    const baseWhere: Prisma.ContactWhereInput = { workspaceId };

    if (!filters || !filters.groups || filters.groups.length === 0) {
      return baseWhere;
    }

    const groupConditions = filters.groups.map(group => this.buildGroupQuery(group));

    if (filters.logic === FilterLogic.OR) {
      return { ...baseWhere, OR: groupConditions };
    }

    return { ...baseWhere, AND: groupConditions };
  }

  private buildGroupQuery(group: FilterGroupDto): Prisma.ContactWhereInput {
    const conditions = group.conditions.map(c => this.buildConditionQuery(c));

    // Add nested sub-group conditions
    if (group.nestedGroups?.length) {
      const nestedConditions = group.nestedGroups.map(ng => this.buildGroupQuery(ng));
      conditions.push(...nestedConditions);
    }

    let result: Prisma.ContactWhereInput;
    if (group.logic === FilterLogic.OR) {
      result = { OR: conditions };
    } else {
      result = { AND: conditions };
    }

    // Apply NOT wrapper if negate flag is set
    if (group.negate) {
      return { NOT: result };
    }
    return result;
  }

  private buildConditionQuery(condition: FilterConditionDto): Prisma.ContactWhereInput {
    const { field, operator, value, customFieldKey, negate } = condition;

    // Handle special fields
    let result: Prisma.ContactWhereInput;
    switch (field) {
      case FilterField.IS_WITHIN_24H_WINDOW:
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        result = operator === FilterOperator.IS_TRUE
          ? { lastMessageFromContactAt: { gte: twentyFourHoursAgo } }
          : { lastMessageFromContactAt: { lt: twentyFourHoursAgo } };
        break;

      case FilterField.HAS_TAG:
        result = { tags: { some: { tagId: value } } };
        break;

      case FilterField.DOES_NOT_HAVE_TAG:
        result = { tags: { none: { tagId: value } } };
        break;

      case FilterField.CUSTOM_FIELD:
        // Custom fields are stored in JSON, use path filter
        result = {
          customFields: {
            path: [customFieldKey || ''],
            ...this.buildOperatorQuery(operator, value),
          },
        } as any;
        break;

      default:
        // Standard field filters
        result = {
          [field]: this.buildOperatorQuery(operator, value),
        };
    }

    // Apply NOT wrapper if negate flag is set
    if (negate) {
      return { NOT: result };
    }
    return result;
  }

  private buildOperatorQuery(operator: FilterOperator, value: any): any {
    switch (operator) {
      case FilterOperator.EQUALS:
        return { equals: value };
      case FilterOperator.NOT_EQUALS:
        return { not: value };
      case FilterOperator.CONTAINS:
        return { contains: value, mode: 'insensitive' };
      case FilterOperator.NOT_CONTAINS:
        return { not: { contains: value, mode: 'insensitive' } };
      case FilterOperator.STARTS_WITH:
        return { startsWith: value, mode: 'insensitive' };
      case FilterOperator.ENDS_WITH:
        return { endsWith: value, mode: 'insensitive' };
      case FilterOperator.GREATER_THAN:
        return { gt: value };
      case FilterOperator.LESS_THAN:
        return { lt: value };
      case FilterOperator.GREATER_THAN_OR_EQUAL:
        return { gte: value };
      case FilterOperator.LESS_THAN_OR_EQUAL:
        return { lte: value };
      case FilterOperator.BETWEEN:
        return { gte: value[0], lte: value[1] };
      case FilterOperator.IN:
        return { in: value };
      case FilterOperator.NOT_IN:
        return { notIn: value };
      case FilterOperator.IS_NULL:
        return { equals: null };
      case FilterOperator.IS_NOT_NULL:
        return { not: null };
      case FilterOperator.IS_TRUE:
        return { equals: true };
      case FilterOperator.IS_FALSE:
        return { equals: false };
      case FilterOperator.BEFORE:
        return { lt: new Date(value) };
      case FilterOperator.AFTER:
        return { gt: new Date(value) };
      case FilterOperator.WITHIN_LAST:
        // value is in days
        const daysAgo = new Date(Date.now() - value * 24 * 60 * 60 * 1000);
        return { gte: daysAgo };
      case FilterOperator.NOT_WITHIN_LAST:
        const daysAgoNot = new Date(Date.now() - value * 24 * 60 * 60 * 1000);
        return { lt: daysAgoNot };
      default:
        return { equals: value };
    }
  }

  // ===========================================
  // Helpers
  // ===========================================

  private async addContactsToSegment(
    segmentId: string,
    contactIds: string[],
  ): Promise<number> {
    // Get existing contacts in segment
    const existing = await this.prisma.segmentContact.findMany({
      where: { segmentId, contactId: { in: contactIds } },
      select: { contactId: true },
    });
    const existingIds = new Set(existing.map(e => e.contactId));

    // Filter out already existing
    const newIds = contactIds.filter(id => !existingIds.has(id));

    if (newIds.length === 0) return 0;

    // Add new contacts
    await this.prisma.segmentContact.createMany({
      data: newIds.map(contactId => ({ segmentId, contactId })),
      skipDuplicates: true,
    });

    // Update contact count
    await this.updateContactCount(segmentId);

    return newIds.length;
  }

  private async updateContactCount(segmentId: string): Promise<void> {
    const count = await this.prisma.segmentContact.count({
      where: { segmentId },
    });

    await this.prisma.segment.update({
      where: { id: segmentId },
      data: { contactCount: count },
    });
  }

  private formatSegmentResponse(segment: any): SegmentResponse {
    return {
      id: segment.id,
      name: segment.name,
      description: segment.description,
      segmentType: segment.segmentType,
      filters: segment.filters as SegmentFiltersDto,
      contactCount: segment.contactCount,
      lastCalculatedAt: segment.lastCalculatedAt,
      createdAt: segment.createdAt,
      updatedAt: segment.updatedAt,
    };
  }
}
