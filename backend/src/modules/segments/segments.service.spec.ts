import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SegmentsService } from './segments.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SegmentsService', () => {
  let service: SegmentsService;

  const mockPrisma = {
    segment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    segmentContact: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    contact: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    campaign: {
      count: jest.fn(),
    },
  };

  const mockSegment = {
    id: 'seg-1',
    workspaceId: 'ws-1',
    name: 'Hot Leads',
    description: 'Contacts with high engagement',
    segmentType: 'DYNAMIC',
    filters: { logic: 'AND', groups: [{ logic: 'AND', conditions: [{ field: 'engagementLevel', operator: 'EQUALS', value: 'HOT' }] }] },
    contactCount: 50,
    lastCalculatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SegmentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SegmentsService>(SegmentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===========================================
  // Create
  // ===========================================
  describe('create', () => {
    it('should create a dynamic segment and recalculate', async () => {
      mockPrisma.segment.create.mockResolvedValue({ id: 'seg-new' });
      mockPrisma.segment.findUnique.mockResolvedValue(mockSegment);
      mockPrisma.segment.findFirst.mockResolvedValue(mockSegment);
      mockPrisma.contact.count.mockResolvedValue(50);
      mockPrisma.segment.update.mockResolvedValue({});

      const result = await service.create('ws-1', {
        name: 'Hot Leads',
        segmentType: 'DYNAMIC' as any,
        filters: { logic: 'AND', groups: [] } as any,
      });

      expect(mockPrisma.segment.create).toHaveBeenCalled();
      expect(result.name).toBe('Hot Leads');
    });

    it('should throw for dynamic segment without filters', async () => {
      await expect(
        service.create('ws-1', {
          name: 'Bad Segment',
          segmentType: 'DYNAMIC' as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a static segment with contact IDs', async () => {
      mockPrisma.segment.create.mockResolvedValue({ id: 'seg-static', segmentType: 'STATIC' });
      mockPrisma.segment.findUnique.mockResolvedValue({
        ...mockSegment,
        id: 'seg-static',
        segmentType: 'STATIC',
      });
      mockPrisma.segmentContact.findMany.mockResolvedValue([]);
      mockPrisma.segmentContact.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.segmentContact.count.mockResolvedValue(2);
      mockPrisma.segment.update.mockResolvedValue({});

      const result = await service.create('ws-1', {
        name: 'Manual Segment',
        segmentType: 'STATIC' as any,
        contactIds: ['c-1', 'c-2'],
      });

      expect(result).toBeDefined();
    });
  });

  // ===========================================
  // findById
  // ===========================================
  describe('findById', () => {
    it('should return segment by id', async () => {
      mockPrisma.segment.findFirst.mockResolvedValue(mockSegment);

      const result = await service.findById('ws-1', 'seg-1');

      expect(result.id).toBe('seg-1');
      expect(result.name).toBe('Hot Leads');
    });

    it('should throw NotFoundException when segment not found', async () => {
      mockPrisma.segment.findFirst.mockResolvedValue(null);

      await expect(service.findById('ws-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ===========================================
  // findAll
  // ===========================================
  describe('findAll', () => {
    it('should return paginated segments', async () => {
      mockPrisma.segment.findMany.mockResolvedValue([mockSegment]);
      mockPrisma.segment.count.mockResolvedValue(1);

      const result = await service.findAll('ws-1', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should apply search filter', async () => {
      mockPrisma.segment.findMany.mockResolvedValue([]);
      mockPrisma.segment.count.mockResolvedValue(0);

      await service.findAll('ws-1', { search: 'hot' });

      expect(mockPrisma.segment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('should apply type filter', async () => {
      mockPrisma.segment.findMany.mockResolvedValue([]);
      mockPrisma.segment.count.mockResolvedValue(0);

      await service.findAll('ws-1', { type: 'DYNAMIC' as any });

      expect(mockPrisma.segment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ segmentType: 'DYNAMIC' }),
        }),
      );
    });
  });

  // ===========================================
  // Update
  // ===========================================
  describe('update', () => {
    it('should update segment name', async () => {
      mockPrisma.segment.findFirst.mockResolvedValue(mockSegment);
      mockPrisma.segment.update.mockResolvedValue({ ...mockSegment, name: 'Updated' });
      mockPrisma.segment.findUnique.mockResolvedValue({ ...mockSegment, name: 'Updated' });

      const result = await service.update('ws-1', 'seg-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('should recalculate when filters change on dynamic segment', async () => {
      const newFilters = { logic: 'OR', groups: [] } as any;
      mockPrisma.segment.findFirst.mockResolvedValue(mockSegment);
      mockPrisma.segment.update.mockResolvedValue({ ...mockSegment, filters: newFilters });
      mockPrisma.segment.findUnique.mockResolvedValue({ ...mockSegment, filters: newFilters });
      mockPrisma.contact.count.mockResolvedValue(30);

      await service.update('ws-1', 'seg-1', { filters: newFilters });

      // It should have recalculated (called contact.count for the filter query)
      expect(mockPrisma.contact.count).toHaveBeenCalled();
    });

    it('should throw NotFoundException for missing segment', async () => {
      mockPrisma.segment.findFirst.mockResolvedValue(null);

      await expect(
        service.update('ws-1', 'nonexistent', { name: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ===========================================
  // Delete
  // ===========================================
  describe('delete', () => {
    it('should delete a segment not used by campaigns', async () => {
      mockPrisma.segment.findFirst.mockResolvedValue(mockSegment);
      mockPrisma.campaign.count.mockResolvedValue(0);
      mockPrisma.segment.delete.mockResolvedValue({});

      await service.delete('ws-1', 'seg-1');

      expect(mockPrisma.segment.delete).toHaveBeenCalledWith({
        where: { id: 'seg-1' },
      });
    });

    it('should throw BadRequestException if segment is used by campaigns', async () => {
      mockPrisma.segment.findFirst.mockResolvedValue(mockSegment);
      mockPrisma.campaign.count.mockResolvedValue(3);

      await expect(service.delete('ws-1', 'seg-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for missing segment', async () => {
      mockPrisma.segment.findFirst.mockResolvedValue(null);

      await expect(service.delete('ws-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ===========================================
  // Contact Management
  // ===========================================
  describe('addContacts', () => {
    it('should add contacts to a static segment', async () => {
      mockPrisma.segment.findFirst.mockResolvedValue({
        ...mockSegment,
        segmentType: 'STATIC',
      });
      mockPrisma.segmentContact.findMany.mockResolvedValue([]);
      mockPrisma.segmentContact.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.segmentContact.count.mockResolvedValue(2);
      mockPrisma.segment.update.mockResolvedValue({});

      const result = await service.addContacts('ws-1', 'seg-1', ['c-1', 'c-2']);

      expect(result.added).toBe(2);
    });

    it('should throw BadRequestException for dynamic segment', async () => {
      mockPrisma.segment.findFirst.mockResolvedValue(mockSegment); // DYNAMIC

      await expect(
        service.addContacts('ws-1', 'seg-1', ['c-1']),
      ).rejects.toThrow(BadRequestException);
    });

    it('should skip already existing contacts', async () => {
      mockPrisma.segment.findFirst.mockResolvedValue({
        ...mockSegment,
        segmentType: 'STATIC',
      });
      mockPrisma.segmentContact.findMany.mockResolvedValue([{ contactId: 'c-1' }]);
      mockPrisma.segmentContact.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.segmentContact.count.mockResolvedValue(2);
      mockPrisma.segment.update.mockResolvedValue({});

      const result = await service.addContacts('ws-1', 'seg-1', ['c-1', 'c-2']);

      expect(result.added).toBe(1);
    });
  });

  describe('removeContacts', () => {
    it('should remove contacts from a static segment', async () => {
      mockPrisma.segment.findFirst.mockResolvedValue({
        ...mockSegment,
        segmentType: 'STATIC',
      });
      mockPrisma.segmentContact.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.segmentContact.count.mockResolvedValue(0);
      mockPrisma.segment.update.mockResolvedValue({});

      const result = await service.removeContacts('ws-1', 'seg-1', ['c-1', 'c-2']);

      expect(result.removed).toBe(2);
    });
  });

  // ===========================================
  // Preview & Recalculation
  // ===========================================
  describe('preview', () => {
    it('should return matching count and sample contacts', async () => {
      mockPrisma.contact.count.mockResolvedValue(25);
      mockPrisma.contact.findMany.mockResolvedValue([
        { id: 'c-1', fullName: 'Alice', pageId: 'p-1' },
        { id: 'c-2', fullName: 'Bob', pageId: 'p-1' },
      ]);

      const result = await service.preview('ws-1', {
        logic: 'AND' as any,
        groups: [],
      });

      expect(result.totalContacts).toBe(25);
      expect(result.sampleContacts).toHaveLength(2);
    });
  });

  describe('recalculateSegment', () => {
    it('should update count for dynamic segment', async () => {
      mockPrisma.segment.findFirst.mockResolvedValue(mockSegment);
      mockPrisma.contact.count.mockResolvedValue(42);
      mockPrisma.segment.update.mockResolvedValue({});

      await service.recalculateSegment('ws-1', 'seg-1');

      expect(mockPrisma.segment.update).toHaveBeenCalledWith({
        where: { id: 'seg-1' },
        data: { contactCount: 42, lastCalculatedAt: expect.any(Date) },
      });
    });

    it('should throw for static segment', async () => {
      mockPrisma.segment.findFirst.mockResolvedValue({
        ...mockSegment,
        segmentType: 'STATIC',
      });

      await expect(
        service.recalculateSegment('ws-1', 'seg-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
