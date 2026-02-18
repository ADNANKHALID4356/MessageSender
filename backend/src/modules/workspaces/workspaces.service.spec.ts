import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('WorkspacesService', () => {
  let service: WorkspacesService;
  let prisma: PrismaService;

  const mockWorkspace = {
    id: 'workspace-1',
    name: 'Test Workspace',
    description: 'Test Description',
    logoUrl: null,
    colorTheme: '#3B82F6',
    isActive: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'ADMIN',
    status: 'ACTIVE',
  };

  const mockPrismaService = {
    workspace: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    workspaceUserAccess: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    contact: {
      count: jest.fn(),
    },
    conversation: {
      count: jest.fn(),
    },
    campaign: {
      count: jest.fn(),
    },
    page: {
      count: jest.fn(),
    },
    message: {
      groupBy: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a workspace successfully', async () => {
      mockPrismaService.workspace.count.mockResolvedValue(2);
      mockPrismaService.workspace.aggregate.mockResolvedValue({
        _max: { sortOrder: 1 },
      });
      mockPrismaService.workspace.create.mockResolvedValue(mockWorkspace);

      const result = await service.create({
        name: 'Test Workspace',
        description: 'Test Description',
      });

      expect(result).toEqual(mockWorkspace);
      expect(mockPrismaService.workspace.count).toHaveBeenCalled();
      expect(mockPrismaService.workspace.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Workspace',
          description: 'Test Description',
          logoUrl: undefined,
          colorTheme: '#3B82F6',
          sortOrder: 2,
        },
      });
    });

    it('should throw error if max workspaces reached', async () => {
      mockPrismaService.workspace.count.mockResolvedValue(5);

      await expect(
        service.create({ name: 'New Workspace' })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all workspaces', async () => {
      mockPrismaService.workspace.findMany.mockResolvedValue([mockWorkspace]);

      const result = await service.findAll();

      expect(result).toEqual([mockWorkspace]);
      expect(mockPrismaService.workspace.findMany).toHaveBeenCalledWith({
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  describe('findById', () => {
    it('should return workspace by id', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(mockWorkspace);

      const result = await service.findById('workspace-1');

      expect(result).toEqual(mockWorkspace);
    });

    it('should throw NotFoundException if workspace not found', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('findByUser', () => {
    it('should return workspaces accessible by user', async () => {
      const mockAccess = [
        {
          workspaceId: 'workspace-1',
          userId: 'user-1',
          permissionLevel: 'MANAGER',
          workspace: mockWorkspace,
        },
      ];
      mockPrismaService.workspaceUserAccess.findMany.mockResolvedValue(
        mockAccess
      );

      const result = await service.findByUser('user-1');

      expect(result).toEqual(mockAccess);
      expect(mockPrismaService.workspaceUserAccess.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { workspace: true },
        orderBy: { workspace: { sortOrder: 'asc' } },
      });
    });
  });

  describe('update', () => {
    it('should update workspace', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(mockWorkspace);
      mockPrismaService.workspace.update.mockResolvedValue({
        ...mockWorkspace,
        name: 'Updated Name',
      });

      const result = await service.update('workspace-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(mockPrismaService.workspace.update).toHaveBeenCalledWith({
        where: { id: 'workspace-1' },
        data: { name: 'Updated Name' },
      });
    });
  });

  describe('deactivate', () => {
    it('should deactivate workspace', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(mockWorkspace);
      mockPrismaService.workspace.update.mockResolvedValue({
        ...mockWorkspace,
        isActive: false,
      });

      const result = await service.deactivate('workspace-1');

      expect(result.isActive).toBe(false);
      expect(mockPrismaService.workspace.update).toHaveBeenCalledWith({
        where: { id: 'workspace-1' },
        data: { isActive: false },
      });
    });
  });

  describe('assignUser', () => {
    it('should assign user to workspace', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(mockWorkspace);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.workspaceUserAccess.upsert.mockResolvedValue({
        workspaceId: 'workspace-1',
        userId: 'user-1',
        permissionLevel: 'MANAGER',
      });

      const result = await service.assignUser('workspace-1', {
        userId: 'user-1',
        permissionLevel: 'MANAGER',
      });

      expect(result.userId).toBe('user-1');
      expect(result.permissionLevel).toBe('MANAGER');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(mockWorkspace);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.assignUser('workspace-1', {
          userId: 'invalid-user',
          permissionLevel: 'MANAGER',
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeUser', () => {
    it('should remove user from workspace', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(mockWorkspace);
      mockPrismaService.workspaceUserAccess.findUnique.mockResolvedValue({
        workspaceId: 'workspace-1',
        userId: 'user-1',
        permissionLevel: 'MANAGER',
      });
      mockPrismaService.workspaceUserAccess.delete.mockResolvedValue({});

      await expect(
        service.removeUser('workspace-1', 'user-1')
      ).resolves.not.toThrow();
    });

    it('should throw if user access not found', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(mockWorkspace);
      mockPrismaService.workspaceUserAccess.findUnique.mockResolvedValue(null);

      await expect(
        service.removeUser('workspace-1', 'user-1')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkUserAccess', () => {
    it('should return true if user has access', async () => {
      mockPrismaService.workspaceUserAccess.findUnique.mockResolvedValue({
        workspaceId: 'workspace-1',
        userId: 'user-1',
        permissionLevel: 'MANAGER',
      });

      const result = await service.checkUserAccess('workspace-1', 'user-1');

      expect(result).toBe(true);
    });

    it('should return false if user has no access', async () => {
      mockPrismaService.workspaceUserAccess.findUnique.mockResolvedValue(null);

      const result = await service.checkUserAccess('workspace-1', 'user-1');

      expect(result).toBe(false);
    });

    it('should check required permission level', async () => {
      mockPrismaService.workspaceUserAccess.findUnique.mockResolvedValue({
        workspaceId: 'workspace-1',
        userId: 'user-1',
        permissionLevel: 'VIEW_ONLY',
      });

      const result = await service.checkUserAccess(
        'workspace-1',
        'user-1',
        'MANAGER'
      );

      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return workspace statistics', async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(mockWorkspace);
      mockPrismaService.contact.count.mockResolvedValue(100);
      mockPrismaService.conversation.count.mockResolvedValue(50);
      mockPrismaService.campaign.count.mockResolvedValueOnce(10).mockResolvedValueOnce(3);
      mockPrismaService.page.count.mockResolvedValue(2);
      mockPrismaService.message.groupBy.mockResolvedValue([
        { direction: 'INBOUND', _count: 500 },
        { direction: 'OUTBOUND', _count: 300 },
      ]);

      const result = await service.getStats('workspace-1');

      expect(result).toEqual({
        totalContacts: 100,
        totalConversations: 50,
        totalCampaigns: 10,
        activeCampaigns: 3,
        totalPages: 2,
        messagesInbound: 500,
        messagesOutbound: 300,
        messagesTotal: 800,
      });
    });
  });

  describe('reorder', () => {
    it('should reorder workspaces', async () => {
      mockPrismaService.$transaction.mockResolvedValue([]);

      await expect(
        service.reorder(['workspace-2', 'workspace-1', 'workspace-3'])
      ).resolves.not.toThrow();

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });
});
