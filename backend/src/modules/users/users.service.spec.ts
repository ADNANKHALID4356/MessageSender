import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    workspace: {
      findUnique: jest.fn(),
    },
    workspaceUserAccess: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    session: {
      findMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockUser = {
    id: 'u-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    avatarUrl: null,
    status: 'ACTIVE',
    lastLoginAt: new Date(),
    createdAt: new Date(),
    workspaceAccess: [
      {
        permissionLevel: 'ADMIN',
        workspace: { id: 'ws-1', name: 'Test Workspace' },
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===========================================
  // findAll
  // ===========================================
  describe('findAll', () => {
    it('should return paginated users with workspace access', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUser]);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].email).toBe('test@example.com');
      expect(result.data[0].workspaceAccess).toHaveLength(1);
      expect(result.data[0].workspaceAccess[0].workspaceName).toBe('Test Workspace');
      expect(result.total).toBe(1);
    });

    it('should apply search filter to email, firstName, lastName', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.findAll({ search: 'john' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { email: { contains: 'john', mode: 'insensitive' } },
              { firstName: { contains: 'john', mode: 'insensitive' } },
              { lastName: { contains: 'john', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('should apply status filter', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.findAll({ status: 'ACTIVE' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });

    it('should use default page=1 and limit=50', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.findAll({});

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 50 }),
      );
    });
  });

  // ===========================================
  // findById
  // ===========================================
  describe('findById', () => {
    it('should return user with workspace access', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('u-1');

      expect(result.id).toBe('u-1');
      expect(result.workspaceAccess[0].permissionLevel).toBe('ADMIN');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ===========================================
  // updateWorkspaceAccess
  // ===========================================
  describe('updateWorkspaceAccess', () => {
    it('should upsert workspace access', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1' });
      mockPrisma.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });
      mockPrisma.workspaceUserAccess.upsert.mockResolvedValue({});

      await service.updateWorkspaceAccess('u-1', 'ws-1', 'ADMIN');

      expect(mockPrisma.workspaceUserAccess.upsert).toHaveBeenCalledWith({
        where: { workspaceId_userId: { workspaceId: 'ws-1', userId: 'u-1' } },
        create: { workspaceId: 'ws-1', userId: 'u-1', permissionLevel: 'ADMIN' },
        update: { permissionLevel: 'ADMIN' },
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateWorkspaceAccess('nonexistent', 'ws-1', 'ADMIN'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when workspace does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1' });
      mockPrisma.workspace.findUnique.mockResolvedValue(null);

      await expect(
        service.updateWorkspaceAccess('u-1', 'nonexistent', 'ADMIN'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ===========================================
  // removeWorkspaceAccess
  // ===========================================
  describe('removeWorkspaceAccess', () => {
    it('should delete workspace access', async () => {
      mockPrisma.workspaceUserAccess.deleteMany.mockResolvedValue({ count: 1 });

      await service.removeWorkspaceAccess('u-1', 'ws-1');

      expect(mockPrisma.workspaceUserAccess.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u-1', workspaceId: 'ws-1' },
      });
    });
  });

  // ===========================================
  // resetPassword
  // ===========================================
  describe('resetPassword', () => {
    it('should update password and invalidate all sessions', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1' });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 3 });

      await service.resetPassword('u-1', 'hashed_password');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { passwordHash: 'hashed_password' },
      });
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u-1' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword('nonexistent', 'hash'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ===========================================
  // getUserSessions
  // ===========================================
  describe('getUserSessions', () => {
    it('should return active sessions only', async () => {
      const sessions = [
        { id: 's-1', ipAddress: '1.2.3.4', userAgent: 'Chrome', createdAt: new Date(), expiresAt: new Date() },
      ];
      mockPrisma.session.findMany.mockResolvedValue(sessions);

      const result = await service.getUserSessions('u-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u-1', expiresAt: { gt: expect.any(Date) } },
        }),
      );
    });
  });

  // ===========================================
  // terminateSession
  // ===========================================
  describe('terminateSession', () => {
    it('should delete a specific session', async () => {
      mockPrisma.session.delete.mockResolvedValue({});

      await service.terminateSession('s-1');

      expect(mockPrisma.session.delete).toHaveBeenCalledWith({
        where: { id: 's-1' },
      });
    });

    it('should throw NotFoundException when session not found', async () => {
      mockPrisma.session.delete.mockRejectedValue(new Error('not found'));

      await expect(service.terminateSession('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ===========================================
  // terminateAllSessions
  // ===========================================
  describe('terminateAllSessions', () => {
    it('should delete all sessions for a user', async () => {
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 5 });

      await service.terminateAllSessions('u-1');

      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u-1' },
      });
    });
  });
});
