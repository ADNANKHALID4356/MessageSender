import { Test, TestingModule } from '@nestjs/testing';
import { BackupService } from './backup.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
    unlinkSync: jest.fn(),
    statSync: jest.fn().mockReturnValue({ size: 1024 }),
    readFileSync: jest.fn().mockReturnValue('{}'),
  };
});

jest.mock('child_process', () => {
  const actual = jest.requireActual('child_process');
  return {
    ...actual,
    execSync: jest.fn(),
  };
});

// =============================================
// Backup Service - Unit Tests
// =============================================

describe('BackupService', () => {
  let service: BackupService;
  let registryStore: any[] | null = null;

  const mockPrisma = {
    contact: { count: jest.fn(), findMany: jest.fn() },
    conversation: { count: jest.fn() },
    message: { count: jest.fn() },
    campaign: { count: jest.fn(), findMany: jest.fn() },
    page: { count: jest.fn(), findMany: jest.fn() },
    segment: { count: jest.fn(), findMany: jest.fn() },
    workspace: { findUnique: jest.fn() },
    systemSetting: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    registryStore = null;
    jest.clearAllMocks();

    // Re-set fs mocks (clearAllMocks clears mockReturnValue)
    const fs = require('fs');
    fs.existsSync.mockReturnValue(true);
    fs.mkdirSync.mockImplementation(() => {});
    fs.writeFileSync.mockImplementation(() => {});
    fs.unlinkSync.mockImplementation(() => {});
    fs.statSync.mockReturnValue({ size: 1024 });

    // DB-backed registry via SystemSetting
    mockPrisma.systemSetting.findUnique.mockImplementation(() => {
      return Promise.resolve(
        registryStore ? { key: 'backup_registry', value: registryStore } : null,
      );
    });
    mockPrisma.systemSetting.upsert.mockImplementation(({ create, update }: any) => {
      registryStore = (update?.value ?? create?.value) as any[];
      return Promise.resolve({ key: 'backup_registry', value: registryStore });
    });

    // Default empty findMany mocks for data export
    mockPrisma.contact.findMany.mockResolvedValue([]);
    mockPrisma.campaign.findMany.mockResolvedValue([]);
    mockPrisma.segment.findMany.mockResolvedValue([]);
    mockPrisma.page.findMany.mockResolvedValue([]);
    mockPrisma.workspace.findUnique.mockResolvedValue({ id: 'ws1', name: 'Test' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BackupService>(BackupService);
  });

  describe('createBackup', () => {
    it('should create a backup with record counts', async () => {
      mockPrisma.contact.count.mockResolvedValue(100);
      mockPrisma.conversation.count.mockResolvedValue(50);
      mockPrisma.message.count.mockResolvedValue(500);
      mockPrisma.campaign.count.mockResolvedValue(10);
      mockPrisma.page.count.mockResolvedValue(3);
      mockPrisma.segment.count.mockResolvedValue(5);

      const backup = await service.createBackup('ws1');

      expect(backup.id).toBeDefined();
      expect(backup.workspaceId).toBe('ws1');
      expect(backup.status).toBe('completed');
      expect(backup.recordCounts.contacts).toBe(100);
      expect(backup.recordCounts.conversations).toBe(50);
      expect(backup.recordCounts.messages).toBe(500);
      expect(backup.tables).toContain('contacts');
      expect(backup.sizeBytes).toBeGreaterThan(0);
    });

    it('should set status to failed on error', async () => {
      mockPrisma.contact.count.mockRejectedValue(new Error('DB error'));

      await expect(service.createBackup('ws1')).rejects.toThrow('DB error');
    });
  });

  describe('listBackups', () => {
    it('should return backups sorted by creation date', async () => {
      mockPrisma.contact.count.mockResolvedValue(1);
      mockPrisma.conversation.count.mockResolvedValue(1);
      mockPrisma.message.count.mockResolvedValue(1);
      mockPrisma.campaign.count.mockResolvedValue(1);
      mockPrisma.page.count.mockResolvedValue(1);
      mockPrisma.segment.count.mockResolvedValue(1);

      await service.createBackup('ws1');
      await service.createBackup('ws1');

      const backups = await service.listBackups('ws1');
      expect(backups.length).toBe(2);
      expect(backups[0].createdAt >= backups[1].createdAt).toBe(true);
    });

    it('should filter by workspaceId', async () => {
      mockPrisma.contact.count.mockResolvedValue(1);
      mockPrisma.conversation.count.mockResolvedValue(1);
      mockPrisma.message.count.mockResolvedValue(1);
      mockPrisma.campaign.count.mockResolvedValue(1);
      mockPrisma.page.count.mockResolvedValue(1);
      mockPrisma.segment.count.mockResolvedValue(1);

      await service.createBackup('ws1');
      await service.createBackup('ws2');

      const ws1Backups = await service.listBackups('ws1');
      expect(ws1Backups.length).toBe(1);
      expect(ws1Backups[0].workspaceId).toBe('ws1');
    });
  });

  describe('deleteBackup', () => {
    it('should delete existing backup', async () => {
      mockPrisma.contact.count.mockResolvedValue(1);
      mockPrisma.conversation.count.mockResolvedValue(1);
      mockPrisma.message.count.mockResolvedValue(1);
      mockPrisma.campaign.count.mockResolvedValue(1);
      mockPrisma.page.count.mockResolvedValue(1);
      mockPrisma.segment.count.mockResolvedValue(1);

      const backup = await service.createBackup('ws1');
      const result = await service.deleteBackup(backup.id);
      expect(result.success).toBe(true);

      const found = await service.getBackup(backup.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent backup', async () => {
      const result = await service.deleteBackup('nonexistent');
      expect(result.success).toBe(false);
    });
  });

  describe('getBackupStats', () => {
    it('should return correct statistics', async () => {
      mockPrisma.contact.count.mockResolvedValue(10);
      mockPrisma.conversation.count.mockResolvedValue(10);
      mockPrisma.message.count.mockResolvedValue(10);
      mockPrisma.campaign.count.mockResolvedValue(10);
      mockPrisma.page.count.mockResolvedValue(10);
      mockPrisma.segment.count.mockResolvedValue(10);

      await service.createBackup('ws1');
      await service.createBackup('ws1');

      const stats = await service.getBackupStats('ws1');
      expect(stats.totalBackups).toBe(2);
      expect(stats.lastBackupAt).toBeDefined();
      expect(stats.totalSizeBytes).toBeGreaterThan(0);
    });
  });
});
