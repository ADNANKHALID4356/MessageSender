import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ===========================================
// Backup Service (FR-12.5)
// ===========================================
// Database backup using pg_dump and JSON export.
// Backup metadata persisted in SystemSetting.
// ===========================================

export interface BackupRecord {
  id: string;
  workspaceId: string;
  filename: string;
  sizeBytes: number;
  tables: string[];
  recordCounts: Record<string, number>;
  createdAt: string;
  status: 'completed' | 'failed' | 'in_progress';
  error?: string;
  filePath?: string;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;

  constructor(private prisma: PrismaService) {
    this.backupDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  // ===========================================
  // Registry helpers — persisted in SystemSetting
  // ===========================================

  private async getRegistry(): Promise<BackupRecord[]> {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key: 'backup_registry' } });
    return setting ? (setting.value as unknown as BackupRecord[]) : [];
  }

  private async saveRegistry(records: BackupRecord[]): Promise<void> {
    await this.prisma.systemSetting.upsert({
      where: { key: 'backup_registry' },
      create: { key: 'backup_registry', value: records as any },
      update: { value: records as any },
    });
  }

  // ===========================================
  // Create Backup
  // ===========================================

  async createBackup(workspaceId: string): Promise<BackupRecord> {
    const backupId = `bkp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonFilename = `backup_${workspaceId}_${timestamp}.json`;
    const jsonFilePath = path.join(this.backupDir, jsonFilename);

    const backup: BackupRecord = {
      id: backupId,
      workspaceId,
      filename: jsonFilename,
      sizeBytes: 0,
      tables: [],
      recordCounts: {},
      createdAt: new Date().toISOString(),
      status: 'in_progress',
      filePath: jsonFilePath,
    };

    try {
      // Collect record counts
      const [contactCount, conversationCount, messageCount, campaignCount, pageCount, segmentCount] =
        await Promise.all([
          this.prisma.contact.count({ where: { workspaceId } }),
          this.prisma.conversation.count({ where: { workspaceId } }),
          this.prisma.message.count({ where: { page: { workspaceId } } }),
          this.prisma.campaign.count({ where: { workspaceId } }),
          this.prisma.page.count({ where: { workspaceId } }),
          this.prisma.segment.count({ where: { workspaceId } }),
        ]);

      backup.recordCounts = {
        contacts: contactCount,
        conversations: conversationCount,
        messages: messageCount,
        campaigns: campaignCount,
        pages: pageCount,
        segments: segmentCount,
      };
      backup.tables = Object.keys(backup.recordCounts);

      // Export actual data to JSON file
      const data = await this.exportWorkspaceData(workspaceId);
      const jsonStr = JSON.stringify(data, null, 2);
      fs.writeFileSync(jsonFilePath, jsonStr, 'utf-8');
      backup.sizeBytes = Buffer.byteLength(jsonStr, 'utf-8');

      // Also attempt pg_dump if DATABASE_URL is set
      try {
        const dbUrl = process.env.DATABASE_URL;
        if (dbUrl) {
          const sqlFilename = `backup_${workspaceId}_${timestamp}.sql`;
          const sqlPath = path.join(this.backupDir, sqlFilename);
          execSync(`pg_dump "${dbUrl}" --no-owner --no-privileges -f "${sqlPath}"`, { timeout: 120000 });
          if (fs.existsSync(sqlPath)) {
            const sqlSize = fs.statSync(sqlPath).size;
            backup.sizeBytes += sqlSize;
            this.logger.log(`pg_dump backup created: ${sqlPath} (${sqlSize} bytes)`);
          }
        }
      } catch (pgErr: any) {
        this.logger.warn(`pg_dump skipped (non-fatal): ${pgErr.message}`);
      }

      backup.status = 'completed';
      const totalRecords = Object.values(backup.recordCounts).reduce((a, b) => a + b, 0);
      this.logger.log(`Backup created: ${backupId} (${totalRecords} records, ${backup.sizeBytes} bytes)`);
    } catch (error: any) {
      backup.status = 'failed';
      backup.error = error.message;
      this.logger.error(`Backup failed: ${error.message}`);
    }

    // Persist to registry
    const registry = await this.getRegistry();
    registry.unshift(backup);
    await this.saveRegistry(registry);

    if (backup.status === 'failed') throw new Error(backup.error);
    return backup;
  }

  // ===========================================
  // Restore Backup
  // ===========================================

  async restoreBackup(backupId: string): Promise<{ success: boolean; error?: string }> {
    const registry = await this.getRegistry();
    const backup = registry.find(b => b.id === backupId);
    if (!backup) return { success: false, error: 'Backup not found' };
    if (!backup.filePath || !fs.existsSync(backup.filePath)) {
      return { success: false, error: 'Backup file not found on disk' };
    }

    try {
      const raw = fs.readFileSync(backup.filePath, 'utf-8');
      const data = JSON.parse(raw);

      // Restore contacts
      if (data.contacts?.length) {
        for (const c of data.contacts) {
          await this.prisma.contact.upsert({
            where: { pageId_psid: { pageId: c.pageId, psid: c.psid } },
            create: {
              workspaceId: c.workspaceId, pageId: c.pageId, psid: c.psid,
              firstName: c.firstName, lastName: c.lastName, fullName: c.fullName,
              customFields: c.customFields || {},
            },
            update: { firstName: c.firstName, lastName: c.lastName, fullName: c.fullName },
          });
        }
      }
      this.logger.log(`Backup ${backupId} restored successfully`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Restore failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ===========================================
  // List / Delete / Stats
  // ===========================================

  async listBackups(workspaceId: string): Promise<BackupRecord[]> {
    const registry = await this.getRegistry();
    return registry
      .filter(b => b.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getBackup(backupId: string): Promise<BackupRecord | null> {
    const registry = await this.getRegistry();
    return registry.find(b => b.id === backupId) || null;
  }

  async deleteBackup(backupId: string): Promise<{ success: boolean }> {
    const registry = await this.getRegistry();
    const idx = registry.findIndex(b => b.id === backupId);
    if (idx === -1) return { success: false };

    const backup = registry[idx];
    // Delete file from disk
    if (backup.filePath && fs.existsSync(backup.filePath)) {
      fs.unlinkSync(backup.filePath);
    }
    registry.splice(idx, 1);
    await this.saveRegistry(registry);
    this.logger.log(`Backup deleted: ${backupId}`);
    return { success: true };
  }

  async getBackupStats(workspaceId: string): Promise<{
    totalBackups: number;
    lastBackupAt: string | null;
    totalSizeBytes: number;
  }> {
    const backups = await this.listBackups(workspaceId);
    return {
      totalBackups: backups.length,
      lastBackupAt: backups.length > 0 ? backups[0].createdAt : null,
      totalSizeBytes: backups.reduce((sum, b) => sum + b.sizeBytes, 0),
    };
  }

  // ===========================================
  // Data Export
  // ===========================================

  async exportWorkspaceData(workspaceId: string): Promise<{
    workspace: any;
    contacts: any[];
    campaigns: any[];
    segments: any[];
    pages: any[];
  }> {
    const [workspace, contacts, campaigns, segments, pages] = await Promise.all([
      this.prisma.workspace.findUnique({ where: { id: workspaceId } }),
      this.prisma.contact.findMany({
        where: { workspaceId },
        include: { tags: { include: { tag: true } } },
      }),
      this.prisma.campaign.findMany({ where: { workspaceId } }),
      this.prisma.segment.findMany({ where: { workspaceId } }),
      this.prisma.page.findMany({ where: { workspaceId } }),
    ]);

    return {
      workspace,
      contacts: contacts.map(c => ({
        ...c,
        tags: c.tags.map(t => t.tag.name),
      })),
      campaigns,
      segments,
      pages,
    };
  }

  // ===========================================
  // Scheduled Backup — runs every day at midnight UTC
  // ===========================================

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleScheduledBackup(): Promise<void> {
    this.logger.log('Starting scheduled daily backup for all workspaces...');

    try {
      const workspaces = await this.prisma.workspace.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });

      let succeeded = 0;
      let failed = 0;

      for (const workspace of workspaces) {
        try {
          await this.createBackup(workspace.id);
          succeeded++;
        } catch (error: any) {
          failed++;
          this.logger.error(`Scheduled backup failed for workspace ${workspace.name}: ${error.message}`);
        }
      }

      this.logger.log(
        `Scheduled backup complete: ${succeeded} succeeded, ${failed} failed out of ${workspaces.length} workspaces`,
      );

      // Clean up old backups — retain only the last 30 days
      await this.cleanupOldBackups(30);
    } catch (error: any) {
      this.logger.error(`Scheduled backup job failed: ${error.message}`);
    }
  }

  // ===========================================
  // Backup Retention Cleanup
  // ===========================================

  async cleanupOldBackups(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const registry = await this.getRegistry();
    const toDelete = registry.filter(b => new Date(b.createdAt) < cutoffDate);

    for (const backup of toDelete) {
      try {
        // Delete file from disk
        if (backup.filePath && fs.existsSync(backup.filePath)) {
          fs.unlinkSync(backup.filePath);
        }
        // Also try to delete companion SQL file
        if (backup.filePath) {
          const sqlPath = backup.filePath.replace('.json', '.sql');
          if (fs.existsSync(sqlPath)) {
            fs.unlinkSync(sqlPath);
          }
        }
      } catch (err: any) {
        this.logger.warn(`Failed to delete backup file for ${backup.id}: ${err.message}`);
      }
    }

    if (toDelete.length > 0) {
      const remaining = registry.filter(b => new Date(b.createdAt) >= cutoffDate);
      await this.saveRegistry(remaining);
      this.logger.log(`Cleaned up ${toDelete.length} backups older than ${retentionDays} days`);
    }

    return toDelete.length;
  }
}
