import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';

// ===========================================
// Email Service (FR-12.3 / FR-11.1.1-2)
// ===========================================
// Real SMTP email sending using nodemailer.
// Config persisted in SystemSetting table.
// ===========================================

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporterCache: Map<string, nodemailer.Transporter> = new Map();

  constructor(private prisma: PrismaService) {}

  // ===========================================
  // SMTP Configuration — persisted in DB
  // ===========================================

  async configureSmtp(workspaceId: string, config: SmtpConfig): Promise<{ success: boolean }> {
    const key = `smtp_config_${workspaceId}`;
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: config as any },
      update: { value: config as any },
    });
    // Invalidate cached transporter
    this.transporterCache.delete(workspaceId);
    this.logger.log(`SMTP configured for workspace ${workspaceId}: ${config.host}:${config.port}`);
    return { success: true };
  }

  async getSmtpConfig(workspaceId: string): Promise<SmtpConfig | null> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: `smtp_config_${workspaceId}` },
    });
    return setting ? (setting.value as unknown as SmtpConfig) : null;
  }

  // ===========================================
  // Transporter Factory
  // ===========================================

  private async getTransporter(workspaceId: string): Promise<nodemailer.Transporter | null> {
    if (this.transporterCache.has(workspaceId)) {
      return this.transporterCache.get(workspaceId)!;
    }
    const config = await this.getSmtpConfig(workspaceId);
    if (!config) return null;

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });
    this.transporterCache.set(workspaceId, transporter);
    return transporter;
  }

  // ===========================================
  // Test Connection
  // ===========================================

  async testSmtpConnection(workspaceId: string): Promise<{ success: boolean; error?: string }> {
    const config = await this.getSmtpConfig(workspaceId);
    if (!config) {
      return { success: false, error: 'SMTP not configured for this workspace' };
    }
    if (!config.host || !config.port || !config.user || !config.pass) {
      return { success: false, error: 'Incomplete SMTP configuration' };
    }
    try {
      const transporter = await this.getTransporter(workspaceId);
      if (!transporter) return { success: false, error: 'Could not create transporter' };
      await transporter.verify();
      this.logger.log(`SMTP test successful for workspace ${workspaceId}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`SMTP test failed: ${error.message}`);
      // Still mark as "configured" — the user can fix creds later
      return { success: false, error: error.message };
    }
  }

  // ===========================================
  // Send Email
  // ===========================================

  async sendEmail(
    workspaceId: string,
    params: SendEmailParams,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const config = await this.getSmtpConfig(workspaceId);
    if (!config) {
      return { success: false, error: 'SMTP not configured' };
    }
    try {
      const transporter = await this.getTransporter(workspaceId);
      if (!transporter) return { success: false, error: 'Transporter unavailable' };

      const info = await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text || params.html.replace(/<[^>]*>/g, ''),
      });

      this.logger.log(`Email sent to ${params.to}: "${params.subject}" msgId=${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      this.logger.error(`Failed to send email: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ===========================================
  // Invitation, Password Reset, Notification
  // ===========================================

  async sendInvitation(
    workspaceId: string,
    inviteeEmail: string,
    inviterName: string,
    workspaceName: string,
    role: string,
  ): Promise<{ success: boolean; error?: string }> {
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signup?invite=${workspaceId}&email=${encodeURIComponent(inviteeEmail)}&role=${role}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You've been invited!</h2>
        <p><strong>${inviterName}</strong> has invited you to join <strong>${workspaceName}</strong> as a <strong>${role}</strong>.</p>
        <p style="margin: 30px 0;">
          <a href="${inviteLink}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
        </p>
        <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
      </div>`;
    return this.sendEmail(workspaceId, { to: inviteeEmail, subject: `You're invited to join ${workspaceName}`, html });
  }

  async sendPasswordReset(
    workspaceId: string,
    email: string,
    resetToken: string,
  ): Promise<{ success: boolean; error?: string }> {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>You requested a password reset. Click the button below to set a new password.</p>
        <p style="margin: 30px 0;">
          <a href="${resetLink}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
        </p>
        <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
      </div>`;
    return this.sendEmail(workspaceId, { to: email, subject: 'Password Reset Request', html });
  }

  async sendSystemNotification(
    workspaceId: string,
    email: string,
    title: string,
    message: string,
  ): Promise<{ success: boolean; error?: string }> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${title}</h2>
        <p>${message}</p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">This is an automated notification from MessageSender.</p>
      </div>`;
    return this.sendEmail(workspaceId, { to: email, subject: title, html });
  }
}
