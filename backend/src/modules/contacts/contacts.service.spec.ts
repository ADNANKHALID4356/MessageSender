import { Test, TestingModule } from '@nestjs/testing';
import { ContactsService } from './contacts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ContactSource, EngagementLevel } from './dto';

describe('ContactsService', () => {
  let service: ContactsService;
  let prisma: PrismaService;

  const mockWorkspaceId = 'workspace-123';
  const mockPageId = 'page-123';
  const mockContactId = 'contact-123';
  const mockTagId = 'tag-123';

  const mockContact = {
    id: mockContactId,
    workspaceId: mockWorkspaceId,
    pageId: mockPageId,
    psid: 'psid-123',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    profilePictureUrl: null,
    locale: 'en_US',
    timezone: -5,
    gender: 'male',
    source: ContactSource.ORGANIC,
    engagementScore: 10,
    engagementLevel: EngagementLevel.WARM,
    isSubscribed: true,
    unsubscribedAt: null,
    customFields: {},
    notes: null,
    firstInteractionAt: new Date(),
    lastInteractionAt: new Date(),
    lastMessageFromContactAt: null,
    lastMessageToContactAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTag = {
    id: mockTagId,
    workspaceId: mockWorkspaceId,
    name: 'VIP',
    color: '#FF0000',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPage = {
    id: mockPageId,
    workspaceId: mockWorkspaceId,
    name: 'Test Page',
  };

  const mockPrismaService = {
    page: {
      findFirst: jest.fn(),
    },
    contact: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    tag: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    contactTag: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    userWorkspace: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      pageId: mockPageId,
      psid: 'psid-456',
      firstName: 'Jane',
      lastName: 'Smith',
      source: ContactSource.ORGANIC,
    };

    it('should create a contact successfully', async () => {
      mockPrismaService.page.findFirst.mockResolvedValue(mockPage);
      mockPrismaService.contact.create.mockResolvedValue({
        ...mockContact,
        ...createDto,
        fullName: 'Jane Smith',
        tags: [],
        page: mockPage,
      });

      const result = await service.create(mockWorkspaceId, createDto);

      expect(mockPrismaService.page.findFirst).toHaveBeenCalledWith({
        where: { id: mockPageId, workspaceId: mockWorkspaceId },
      });
      expect(mockPrismaService.contact.create).toHaveBeenCalled();
      expect(result.firstName).toBe('Jane');
    });

    it('should throw NotFoundException if page not found', async () => {
      mockPrismaService.page.findFirst.mockResolvedValue(null);

      await expect(service.create(mockWorkspaceId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated contacts', async () => {
      const contacts = [mockContact];
      mockPrismaService.contact.findMany.mockResolvedValue(contacts);
      mockPrismaService.contact.count.mockResolvedValue(1);

      const result = await service.findAll(mockWorkspaceId, { page: 1, limit: 20 });

      expect(result.data).toEqual(contacts);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should filter by search term', async () => {
      mockPrismaService.contact.findMany.mockResolvedValue([]);
      mockPrismaService.contact.count.mockResolvedValue(0);

      await service.findAll(mockWorkspaceId, { search: 'John' });

      expect(mockPrismaService.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ fullName: expect.any(Object) }),
            ]),
          }),
        }),
      );
    });

    it('should filter by engagement level', async () => {
      mockPrismaService.contact.findMany.mockResolvedValue([]);
      mockPrismaService.contact.count.mockResolvedValue(0);

      await service.findAll(mockWorkspaceId, { engagementLevel: EngagementLevel.HOT });

      expect(mockPrismaService.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            engagementLevel: EngagementLevel.HOT,
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return contact by ID', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValue(mockContact);

      const result = await service.findById(mockWorkspaceId, mockContactId);

      expect(result).toEqual(mockContact);
    });

    it('should throw NotFoundException if contact not found', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValue(null);

      await expect(service.findById(mockWorkspaceId, 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      firstName: 'Updated',
      notes: 'Test notes',
    };

    it('should update contact successfully', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValue(mockContact);
      mockPrismaService.contact.update.mockResolvedValue({
        ...mockContact,
        ...updateDto,
        fullName: 'Updated Doe',
      });

      const result = await service.update(mockWorkspaceId, mockContactId, updateDto);

      expect(result.firstName).toBe('Updated');
      expect(result.notes).toBe('Test notes');
    });

    it('should throw NotFoundException if contact not found', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockWorkspaceId, 'invalid-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete contact successfully', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValue(mockContact);
      mockPrismaService.contact.delete.mockResolvedValue(mockContact);

      const result = await service.delete(mockWorkspaceId, mockContactId);

      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException if contact not found', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValue(null);

      await expect(service.delete(mockWorkspaceId, 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addTags', () => {
    it('should add tags to contact', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValue(mockContact);
      mockPrismaService.tag.findMany.mockResolvedValue([mockTag]);
      mockPrismaService.contactTag.createMany.mockResolvedValue({ count: 1 });
      mockPrismaService.contact.findFirst.mockResolvedValue({
        ...mockContact,
        tags: [{ tag: mockTag }],
      });

      const result = await service.addTags(mockWorkspaceId, mockContactId, [mockTagId]);

      expect(mockPrismaService.contactTag.createMany).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if some tags not found', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValue(mockContact);
      mockPrismaService.tag.findMany.mockResolvedValue([]); // No tags found

      await expect(
        service.addTags(mockWorkspaceId, mockContactId, [mockTagId]),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeTags', () => {
    it('should remove tags from contact', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValue(mockContact);
      mockPrismaService.contactTag.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.contact.findFirst.mockResolvedValue({
        ...mockContact,
        tags: [],
      });

      const result = await service.removeTags(mockWorkspaceId, mockContactId, [mockTagId]);

      expect(mockPrismaService.contactTag.deleteMany).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('Tag Management', () => {
    describe('getTags', () => {
      it('should return all tags for workspace', async () => {
        mockPrismaService.tag.findMany.mockResolvedValue([mockTag]);

        const result = await service.getTags(mockWorkspaceId);

        expect(result).toEqual([mockTag]);
      });
    });

    describe('createTag', () => {
      it('should create a new tag', async () => {
        mockPrismaService.tag.findUnique.mockResolvedValue(null);
        mockPrismaService.tag.create.mockResolvedValue(mockTag);

        const result = await service.createTag(mockWorkspaceId, {
          name: 'VIP',
          color: '#FF0000',
        });

        expect(result).toEqual(mockTag);
      });

      it('should throw BadRequestException if tag name exists', async () => {
        mockPrismaService.tag.findUnique.mockResolvedValue(mockTag);

        await expect(
          service.createTag(mockWorkspaceId, { name: 'VIP' }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('updateTag', () => {
      it('should update tag successfully', async () => {
        mockPrismaService.tag.findFirst.mockResolvedValue(mockTag);
        mockPrismaService.tag.findUnique.mockResolvedValue(null);
        mockPrismaService.tag.update.mockResolvedValue({
          ...mockTag,
          name: 'Updated',
        });

        const result = await service.updateTag(mockWorkspaceId, mockTagId, {
          name: 'Updated',
        });

        expect(result.name).toBe('Updated');
      });

      it('should throw NotFoundException if tag not found', async () => {
        mockPrismaService.tag.findFirst.mockResolvedValue(null);

        await expect(
          service.updateTag(mockWorkspaceId, 'invalid-id', { name: 'Updated' }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteTag', () => {
      it('should delete tag successfully', async () => {
        mockPrismaService.tag.findFirst.mockResolvedValue(mockTag);
        mockPrismaService.tag.delete.mockResolvedValue(mockTag);

        const result = await service.deleteTag(mockWorkspaceId, mockTagId);

        expect(result).toEqual({ success: true });
      });
    });
  });

  describe('getStats', () => {
    it('should return contact statistics', async () => {
      mockPrismaService.contact.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(90) // subscribed
        .mockResolvedValueOnce(10); // recent
      mockPrismaService.contact.groupBy.mockResolvedValue([
        { engagementLevel: 'HOT', _count: 20 },
        { engagementLevel: 'WARM', _count: 30 },
        { engagementLevel: 'COLD', _count: 25 },
        { engagementLevel: 'INACTIVE', _count: 15 },
        { engagementLevel: 'NEW', _count: 10 },
      ]);

      const result = await service.getStats(mockWorkspaceId);

      expect(result.totalContacts).toBe(100);
      expect(result.subscribedContacts).toBe(90);
      expect(result.engagementByLevel.hot).toBe(20);
    });
  });
});
