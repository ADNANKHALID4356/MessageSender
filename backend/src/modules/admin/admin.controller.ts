import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { SystemHealthService } from './system-health.service';
import { ReportService, ReportType, ReportFormat } from './report.service';
import { BackupService } from './backup.service';
import { EmailService, SmtpConfig } from './email.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly systemHealthService: SystemHealthService,
    private readonly reportService: ReportService,
    private readonly backupService: BackupService,
    private readonly emailService: EmailService,
  ) {}

  // ===========================================
  // Dashboard
  // ===========================================

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard stats' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ===========================================
  // System Settings
  // ===========================================

  @Get('settings')
  @ApiOperation({ summary: 'Get all system settings' })
  async getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update system settings' })
  async updateSettings(
    @Body() body: Record<string, any>,
    @CurrentUser() user: any,
  ) {
    await this.adminService.updateSettings(body);
    await this.adminService.logActivity({
      adminId: user.isAdmin ? user.id : undefined,
      action: 'settings.updated',
      entityType: 'system_settings',
      details: { keys: Object.keys(body) },
    });
    return { success: true };
  }

  @Get('settings/:key')
  @ApiOperation({ summary: 'Get a specific system setting' })
  async getSetting(@Param('key') key: string) {
    const value = await this.adminService.getSetting(key);
    return { key, value };
  }

  @Put('settings/:key')
  @ApiOperation({ summary: 'Update a specific system setting' })
  async setSetting(
    @Param('key') key: string,
    @Body() body: { value: any },
    @CurrentUser() user: any,
  ) {
    await this.adminService.setSetting(key, body.value);
    await this.adminService.logActivity({
      adminId: user.isAdmin ? user.id : undefined,
      action: 'settings.updated',
      entityType: 'system_settings',
      entityId: key,
    });
    return { success: true };
  }

  @Delete('settings/:key')
  @ApiOperation({ summary: 'Delete a system setting' })
  async deleteSetting(@Param('key') key: string) {
    await this.adminService.deleteSetting(key);
    return { success: true };
  }

  // ===========================================
  // Activity Logs
  // ===========================================

  @Get('activity-logs')
  @ApiOperation({ summary: 'Get activity logs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'workspaceId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  async getActivityLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('workspaceId') workspaceId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.adminService.getActivityLogs({
      page,
      limit,
      workspaceId,
      action,
      entityType,
    });
  }

  // ===========================================
  // Data Export
  // ===========================================

  @Get('export/contacts/:workspaceId')
  @ApiOperation({ summary: 'Export contacts for a workspace' })
  async exportContacts(
    @Param('workspaceId') workspaceId: string,
    @Res() res: Response,
  ) {
    const data = await this.adminService.exportContacts(workspaceId);
    
    // Convert to CSV
    if (data.length === 0) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=contacts_${workspaceId}.csv`);
      return res.send('No data');
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(','),
      ),
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=contacts_${workspaceId}.csv`);
    res.send(csvRows.join('\n'));
  }

  @Get('export/campaigns/:workspaceId')
  @ApiOperation({ summary: 'Export campaigns for a workspace' })
  async exportCampaigns(
    @Param('workspaceId') workspaceId: string,
    @Res() res: Response,
  ) {
    const data = await this.adminService.exportCampaigns(workspaceId);
    
    if (data.length === 0) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=campaigns_${workspaceId}.csv`);
      return res.send('No data');
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((h) => {
          const val = (row as any)[h];
          if (val === null || val === undefined) return '';
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(','),
      ),
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=campaigns_${workspaceId}.csv`);
    res.send(csvRows.join('\n'));
  }

  // ===========================================
  // System Health (FR-12.5.4)
  // ===========================================

  @Get('health')
  @ApiOperation({ summary: 'Get system health status' })
  async getHealthStatus() {
    return this.systemHealthService.getHealthStatus();
  }

  @Get('health/pages')
  @ApiOperation({ summary: 'Get page health alerts' })
  async getPageHealthAlerts() {
    return this.systemHealthService.getPageHealthAlerts();
  }

  // ===========================================
  // Reports (FR-10.5)
  // ===========================================

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate a report' })
  async generateReport(
    @Body() body: {
      workspaceId: string;
      reportType: ReportType;
      startDate: string;
      endDate: string;
      format?: ReportFormat;
    },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.reportService.generateReport({
      workspaceId: body.workspaceId,
      reportType: body.reportType,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      format: body.format,
    });

    if (body.format === 'pdf' && result.pdfBuffer) {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${body.reportType}_report.pdf"`,
        'Content-Length': result.pdfBuffer.length.toString(),
      });
      res.end(result.pdfBuffer);
      return;
    }

    return result;
  }

  @Get('reports/:workspaceId/campaign-summary')
  @ApiOperation({ summary: 'Campaign summary report' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'format', required: false })
  async getCampaignSummaryReport(
    @Param('workspaceId') workspaceId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format?: ReportFormat,
  ) {
    return this.reportService.generateReport({
      workspaceId,
      reportType: 'campaign_summary',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      format,
    });
  }

  @Get('reports/:workspaceId/engagement')
  @ApiOperation({ summary: 'Engagement report' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'format', required: false })
  async getEngagementReport(
    @Param('workspaceId') workspaceId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format?: ReportFormat,
  ) {
    return this.reportService.generateReport({
      workspaceId,
      reportType: 'engagement',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      format,
    });
  }

  // ===========================================
  // Backups (FR-12.5)
  // ===========================================

  @Post('backups/:workspaceId')
  @ApiOperation({ summary: 'Create workspace backup' })
  async createBackup(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: any,
  ) {
    const backup = await this.backupService.createBackup(workspaceId);
    await this.adminService.logActivity({
      adminId: user.isAdmin ? user.id : undefined,
      action: 'backup.created',
      entityType: 'backup',
      entityId: backup.id,
      details: { workspaceId, tables: backup.tables },
    });
    return backup;
  }

  @Get('backups/:workspaceId')
  @ApiOperation({ summary: 'List workspace backups' })
  async listBackups(@Param('workspaceId') workspaceId: string) {
    return this.backupService.listBackups(workspaceId);
  }

  @Get('backups/:workspaceId/stats')
  @ApiOperation({ summary: 'Get backup statistics' })
  async getBackupStats(@Param('workspaceId') workspaceId: string) {
    return this.backupService.getBackupStats(workspaceId);
  }

  @Get('backups/detail/:backupId')
  @ApiOperation({ summary: 'Get backup details' })
  async getBackupDetail(@Param('backupId') backupId: string) {
    return this.backupService.getBackup(backupId);
  }

  @Delete('backups/:backupId')
  @ApiOperation({ summary: 'Delete a backup' })
  async deleteBackup(@Param('backupId') backupId: string) {
    return this.backupService.deleteBackup(backupId);
  }

  @Post('backups/restore/:backupId')
  @ApiOperation({ summary: 'Restore a backup' })
  async restoreBackup(@Param('backupId') backupId: string, @CurrentUser() user: any) {
    const result = await this.backupService.restoreBackup(backupId);
    if (result.success) {
      await this.adminService.logActivity({
        adminId: user.isAdmin ? user.id : undefined,
        action: 'backup.restored',
        entityType: 'backup',
        entityId: backupId,
      });
    }
    return result;
  }

  @Get('backups/:workspaceId/export')
  @ApiOperation({ summary: 'Full workspace data export' })
  async exportWorkspaceData(
    @Param('workspaceId') workspaceId: string,
    @Res() res: Response,
  ) {
    const data = await this.backupService.exportWorkspaceData(workspaceId);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=workspace_${workspaceId}_export.json`);
    res.send(JSON.stringify(data, null, 2));
  }

  // ===========================================
  // Email / SMTP (FR-12.3 / FR-11.1)
  // ===========================================

  @Put('email/smtp/:workspaceId')
  @ApiOperation({ summary: 'Configure SMTP settings' })
  async configureSmtp(
    @Param('workspaceId') workspaceId: string,
    @Body() config: SmtpConfig,
  ) {
    return this.emailService.configureSmtp(workspaceId, config);
  }

  @Get('email/smtp/:workspaceId')
  @ApiOperation({ summary: 'Get SMTP configuration' })
  async getSmtpConfig(@Param('workspaceId') workspaceId: string) {
    const config = this.emailService.getSmtpConfig(workspaceId);
    if (!config) return { configured: false };
    // Mask password
    return { configured: true, ...config, pass: '********' };
  }

  @Post('email/smtp/:workspaceId/test')
  @ApiOperation({ summary: 'Test SMTP connection' })
  async testSmtp(@Param('workspaceId') workspaceId: string) {
    return this.emailService.testSmtpConnection(workspaceId);
  }

  @Post('email/invite')
  @ApiOperation({ summary: 'Send team invitation email' })
  async sendInvitation(
    @Body() body: {
      workspaceId: string;
      inviteeEmail: string;
      inviterName: string;
      workspaceName: string;
      role: string;
    },
  ) {
    return this.emailService.sendInvitation(
      body.workspaceId,
      body.inviteeEmail,
      body.inviterName,
      body.workspaceName,
      body.role,
    );
  }

  @Post('email/notification')
  @ApiOperation({ summary: 'Send system notification email' })
  async sendNotification(
    @Body() body: {
      workspaceId: string;
      email: string;
      title: string;
      message: string;
    },
  ) {
    return this.emailService.sendSystemNotification(
      body.workspaceId,
      body.email,
      body.title,
      body.message,
    );
  }
}
