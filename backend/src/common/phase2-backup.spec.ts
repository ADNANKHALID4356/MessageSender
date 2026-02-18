/**
 * =============================================
 * Phase 2 — Scheduled Backup Tests
 * =============================================
 * Tests the @Cron scheduled backup and retention cleanup.
 */
import { BackupService, BackupRecord } from '../modules/admin/backup.service';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  statSync: jest.fn().mockReturnValue({ size: 100 }),
}));

describe('BackupService — Scheduled Backup & Retention', () => {
  let service: BackupService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      workspace: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      contact: {
        count: jest.fn().mockResolvedValue(10),
        findMany: jest.fn().mockResolvedValue([]),
      },
      conversation: { count: jest.fn().mockResolvedValue(5) },
      message: { count: jest.fn().mockResolvedValue(100) },
      campaign: {
        count: jest.fn().mockResolvedValue(3),
        findMany: jest.fn().mockResolvedValue([]),
      },
      page: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([]),
      },
      segment: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([]),
      },
      systemSetting: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    service = new BackupService(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================
  // @Cron Decorator
  // ===========================================

  describe('@Cron decorator', () => {
    it('should have handleScheduledBackup method', () => {
      expect(service.handleScheduledBackup).toBeDefined();
      expect(typeof service.handleScheduledBackup).toBe('function');
    });

    it('should have Cron metadata on handleScheduledBackup', () => {
      const metadata = Reflect.getMetadataKeys(
        BackupService.prototype.handleScheduledBackup,
      );
      expect(metadata.length).toBeGreaterThan(0);
    });
  });

  // ===========================================
  // Scheduled Backup
  // ===========================================

  describe('handleScheduledBackup', () => {
    it('should backup all active workspaces', async () => {
      mockPrisma.workspace.findMany.mockResolvedValue([
        { id: 'ws-1', name: 'Workspace 1' },
        { id: 'ws-2', name: 'Workspace 2' },
      ]);
      mockPrisma.workspace.findUnique.mockResolvedValue({ id: 'ws-1', name: 'Test' });

      const createSpy = jest.spyOn(service, 'createBackup').mockResolvedValue({
        id: 'bkp_test',
        workspaceId: 'ws-1',
        filename: 'test.json',
        sizeBytes: 100,
        tables: [],
        recordCounts: {},
        createdAt: new Date().toISOString(),
        status: 'completed',
      });
      const cleanupSpy = jest.spyOn(service, 'cleanupOldBackups').mockResolvedValue(0);

      await service.handleScheduledBackup();

      expect(createSpy).toHaveBeenCalledTimes(2);
      expect(createSpy).toHaveBeenCalledWith('ws-1');
      expect(createSpy).toHaveBeenCalledWith('ws-2');
      expect(cleanupSpy).toHaveBeenCalledWith(30);
    });

    it('should continue backing up other workspaces if one fails', async () => {
      mockPrisma.workspace.findMany.mockResolvedValue([
        { id: 'ws-1', name: 'Failing' },
        { id: 'ws-2', name: 'Working' },
      ]);

      const createSpy = jest.spyOn(service, 'createBackup')
        .mockRejectedValueOnce(new Error('Disk full'))
        .mockResolvedValueOnce({
          id: 'bkp_2',
          workspaceId: 'ws-2',
          filename: 'f.json',
          sizeBytes: 100,
          tables: [],
          recordCounts: {},
          createdAt: new Date().toISOString(),
          status: 'completed',
        });
      jest.spyOn(service, 'cleanupOldBackups').mockResolvedValue(0);

      await service.handleScheduledBackup();

      expect(createSpy).toHaveBeenCalledTimes(2);
    });

    it('should skip backup when no active workspaces exist', async () => {
      mockPrisma.workspace.findMany.mockResolvedValue([]);

      const createSpy = jest.spyOn(service, 'createBackup');
      jest.spyOn(service, 'cleanupOldBackups').mockResolvedValue(0);

      await service.handleScheduledBackup();

      expect(createSpy).not.toHaveBeenCalled();
    });

    it('should handle complete job failure gracefully', async () => {
      mockPrisma.workspace.findMany.mockRejectedValue(new Error('DB down'));
      await expect(service.handleScheduledBackup()).resolves.not.toThrow();
    });
  });

  // ===========================================
  // Backup Retention Cleanup
  // ===========================================

  describe('cleanupOldBackups', () => {
    const oldBackup: BackupRecord = {
      id: 'bkp_old',
      workspaceId: 'ws-1',
      filename: 'old.json',
      sizeBytes: 500,
      tables: ['contacts'],
      recordCounts: { contacts: 10 },
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
      status: 'completed',
      filePath: '/backups/old.json',
    };

    const recentBackup: BackupRecord = {
      id: 'bkp_recent',
      workspaceId: 'ws-1',
      filename: 'recent.json',
      sizeBytes: 800,
      tables: ['contacts'],
      recordCounts: { contacts: 20 },
      createdAt: new Date().toISOString(), // now
      status: 'completed',
      filePath: '/backups/recent.json',
    };

    it('should delete backups older than retention period', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({
        key: 'backup_registry',
        value: [oldBackup, recentBackup],
      });

      const deleted = await service.cleanupOldBackups(30);

      expect(deleted).toBe(1);
      expect(fs.unlinkSync).toHaveBeenCalled();
      // Should save registry with only the recent backup
      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {
            value: expect.arrayContaining([
              expect.objectContaining({ id: 'bkp_recent' }),
            ]),
          },
        }),
      );
    });

    it('should not delete recent backups', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({
        key: 'backup_registry',
        value: [recentBackup],
      });

      const deleted = await service.cleanupOldBackups(30);

      expect(deleted).toBe(0);
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should handle empty registry', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);

      const deleted = await service.cleanupOldBackups(30);
      expect(deleted).toBe(0);
    });

    it('should handle file deletion errors gracefully', async () => {
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      mockPrisma.systemSetting.findUnique.mockResolvedValue({
        key: 'backup_registry',
        value: [oldBackup],
      });

      // Should not throw even if file deletion fails
      const deleted = await service.cleanupOldBackups(30);
      expect(deleted).toBe(1);
    });

    it('should attempt to delete companion SQL file', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({
        key: 'backup_registry',
        value: [oldBackup],
      });
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      await service.cleanupOldBackups(30);

      // Should try to delete both .json and .sql files
      expect(fs.existsSync).toHaveBeenCalledWith('/backups/old.json');
      expect(fs.existsSync).toHaveBeenCalledWith('/backups/old.sql');
    });
  });
});
