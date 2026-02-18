import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AdminService', () => {
  let service: AdminService;

  const mockPrisma = {
    systemSetting: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    workspace: { count: jest.fn() },
    user: { count: jest.fn() },
    contact: { count: jest.fn(), findMany: jest.fn() },
    message: { count: jest.fn() },
    campaign: { count: jest.fn(), findMany: jest.fn() },
    page: { count: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===========================================
  // System Settings
  // ===========================================
  describe('getSettings', () => {
    it('should return all settings as a key-value map', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([
        { key: 'site_name', value: 'MessageSender' },
        { key: 'max_pages', value: 10 },
      ]);

      const result = await service.getSettings();

      expect(result).toEqual({ site_name: 'MessageSender', max_pages: 10 });
    });

    it('should return empty map when no settings exist', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([]);
      const result = await service.getSettings();
      expect(result).toEqual({});
    });
  });

  describe('getSetting', () => {
    it('should return value for existing key', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({ key: 'site_name', value: 'Test' });
      const result = await service.getSetting('site_name');
      expect(result).toBe('Test');
    });

    it('should return null for non-existing key', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
      const result = await service.getSetting('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('setSetting', () => {
    it('should upsert a setting', async () => {
      mockPrisma.systemSetting.upsert.mockResolvedValue({});
      await service.setSetting('key1', 'value1');
      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'key1' },
        create: { key: 'key1', value: 'value1' },
        update: { value: 'value1' },
      });
    });
  });

  describe('updateSettings', () => {
    it('should batch-upsert multiple settings in a transaction', async () => {
      mockPrisma.$transaction.mockResolvedValue([]);
      await service.updateSettings({ a: 1, b: 2, c: 3 });
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Array));
    });
  });

  describe('deleteSetting', () => {
    it('should delete a setting by key', async () => {
      mockPrisma.systemSetting.deleteMany.mockResolvedValue({ count: 1 });
      await service.deleteSetting('old_key');
      expect(mockPrisma.systemSetting.deleteMany).toHaveBeenCalledWith({
        where: { key: 'old_key' },
      });
    });
  });

  // ===========================================
  // Activity Logging
  // ===========================================
  describe('logActivity', () => {
    it('should create an activity log entry', async () => {
      mockPrisma.activityLog.create.mockResolvedValue({});
      await service.logActivity({
        action: 'user.login',
        userId: 'u-1',
        ipAddress: '127.0.0.1',
      });
      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'user.login',
          userId: 'u-1',
          ipAddress: '127.0.0.1',
        }),
      });
    });

    it('should not throw if logging fails', async () => {
      mockPrisma.activityLog.create.mockRejectedValue(new Error('DB error'));
      // Should NOT throw
      await expect(
        service.logActivity({ action: 'failure' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('getActivityLogs', () => {
    it('should return paginated activity logs with filters', async () => {
      const mockData = [
        { id: 'al-1', action: 'user.login', createdAt: new Date(), admin: null, user: null },
      ];
      mockPrisma.activityLog.findMany.mockResolvedValue(mockData);
      mockPrisma.activityLog.count.mockResolvedValue(1);

      const result = await service.getActivityLogs({
        page: 1,
        limit: 10,
        action: 'login',
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should apply date range filters', async () => {
      mockPrisma.activityLog.findMany.mockResolvedValue([]);
      mockPrisma.activityLog.count.mockResolvedValue(0);

      await service.getActivityLogs({
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      });

      expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2026-01-01'),
              lte: new Date('2026-12-31'),
            },
          }),
        }),
      );
    });

    it('should use defaults for page and limit', async () => {
      mockPrisma.activityLog.findMany.mockResolvedValue([]);
      mockPrisma.activityLog.count.mockResolvedValue(0);

      const result = await service.getActivityLogs({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });
  });

  // ===========================================
  // Dashboard Stats
  // ===========================================
  describe('getDashboardStats', () => {
    it('should return all system-wide stats', async () => {
      mockPrisma.workspace.count
        .mockResolvedValueOnce(5)  // total
        .mockResolvedValueOnce(4); // active
      mockPrisma.user.count
        .mockResolvedValueOnce(20)  // total members
        .mockResolvedValueOnce(18)  // active members
        .mockResolvedValueOnce(2);  // pending invitations
      mockPrisma.contact.count.mockResolvedValue(500);
      mockPrisma.message.count.mockResolvedValue(5000);
      mockPrisma.campaign.count.mockResolvedValue(15);
      mockPrisma.page.count
        .mockResolvedValueOnce(8)  // total
        .mockResolvedValueOnce(6); // active

      const result = await service.getDashboardStats();

      expect(result).toEqual({
        totalWorkspaces: 5,
        activeWorkspaces: 4,
        totalTeamMembers: 20,
        activeTeamMembers: 18,
        pendingInvitations: 2,
        totalContacts: 500,
        totalMessages: 5000,
        totalCampaigns: 15,
        totalPages: 8,
        activePages: 6,
      });
    });
  });

  // ===========================================
  // Data Export
  // ===========================================
  describe('exportContacts', () => {
    it('should return formatted contact data', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([
        {
          id: 'c-1',
          psid: '1234',
          firstName: 'John',
          lastName: 'Doe',
          fullName: 'John Doe',
          source: 'ORGANIC',
          engagementLevel: 'HOT',
          engagementScore: 85,
          isSubscribed: true,
          customFields: {},
          tags: [{ tag: { name: 'VIP' } }],
          page: { name: 'Test Page', fbPageId: 'fb-1' },
          firstInteractionAt: new Date(),
          lastInteractionAt: new Date(),
          createdAt: new Date(),
        },
      ]);

      const result = await service.exportContacts('ws-1');

      expect(result).toHaveLength(1);
      expect(result[0].fullName).toBe('John Doe');
      expect(result[0].tags).toEqual(['VIP']);
      expect(result[0].pageName).toBe('Test Page');
    });

    it('should return empty array for workspace with no contacts', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([]);
      const result = await service.exportContacts('ws-empty');
      expect(result).toEqual([]);
    });
  });

  describe('exportCampaigns', () => {
    it('should return campaign data as-is', async () => {
      const mockCampaigns = [
        { id: 'camp-1', name: 'Test Campaign', status: 'COMPLETED', sentCount: 100 },
      ];
      mockPrisma.campaign.findMany.mockResolvedValue(mockCampaigns);

      const result = await service.exportCampaigns('ws-1');

      expect(result).toEqual(mockCampaigns);
      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith({
        where: { workspaceId: 'ws-1' },
        select: expect.objectContaining({ id: true, name: true }),
      });
    });
  });
});
