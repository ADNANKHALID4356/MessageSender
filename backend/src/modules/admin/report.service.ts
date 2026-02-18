import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

// ===========================================
// Report Types
// ===========================================

export type ReportType = 'campaign_summary' | 'contact_growth' | 'engagement' | 'compliance';
export type ReportFormat = 'json' | 'csv' | 'pdf';

export interface ReportParams {
  workspaceId: string;
  reportType: ReportType;
  startDate: Date;
  endDate: Date;
  format?: ReportFormat;
  filters?: Record<string, any>;
}

export interface ReportResult {
  reportType: ReportType;
  generatedAt: string;
  period: { startDate: string; endDate: string };
  data: any;
  csvContent?: string;
  pdfBuffer?: Buffer;
}

// ===========================================
// Report Service (FR-10.5)
// ===========================================

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate a report
   */
  async generateReport(params: ReportParams): Promise<ReportResult> {
    const { reportType, startDate, endDate, workspaceId, format } = params;

    let data: any;

    switch (reportType) {
      case 'campaign_summary':
        data = await this.generateCampaignSummary(workspaceId, startDate, endDate);
        break;
      case 'contact_growth':
        data = await this.generateContactGrowth(workspaceId, startDate, endDate);
        break;
      case 'engagement':
        data = await this.generateEngagementReport(workspaceId, startDate, endDate);
        break;
      case 'compliance':
        data = await this.generateComplianceReport(workspaceId, startDate, endDate);
        break;
    }

    const result: ReportResult = {
      reportType,
      generatedAt: new Date().toISOString(),
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      data,
    };

    if (format === 'csv') {
      result.csvContent = this.convertToCsv(data);
    } else if (format === 'pdf') {
      result.pdfBuffer = await this.convertToPdf(result);
    }

    return result;
  }

  // ===========================================
  // Campaign Summary Report
  // ===========================================

  private async generateCampaignSummary(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        workspaceId,
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'desc' },
    });

    const summary = {
      totalCampaigns: campaigns.length,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      totalRecipients: 0,
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      avgDeliveryRate: 0,
      avgOpenRate: 0,
      campaigns: campaigns.map(c => ({
        id: c.id,
        name: c.name,
        type: c.campaignType,
        status: c.status,
        totalRecipients: c.totalRecipients,
        sentCount: c.sentCount,
        deliveredCount: c.deliveredCount,
        failedCount: c.failedCount,
        openedCount: c.openedCount,
        clickedCount: c.clickedCount,
        deliveryRate: c.totalRecipients > 0
          ? Math.round((c.deliveredCount / c.totalRecipients) * 100)
          : 0,
        createdAt: c.createdAt.toISOString(),
        completedAt: c.completedAt?.toISOString() || null,
      })),
    };

    for (const c of campaigns) {
      summary.byStatus[c.status] = (summary.byStatus[c.status] || 0) + 1;
      summary.byType[c.campaignType] = (summary.byType[c.campaignType] || 0) + 1;
      summary.totalRecipients += c.totalRecipients;
      summary.totalSent += c.sentCount;
      summary.totalDelivered += c.deliveredCount;
      summary.totalFailed += c.failedCount;
    }

    summary.avgDeliveryRate = summary.totalRecipients > 0
      ? Math.round((summary.totalDelivered / summary.totalRecipients) * 100)
      : 0;

    return summary;
  }

  // ===========================================
  // Contact Growth Report
  // ===========================================

  private async generateContactGrowth(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const contacts = await this.prisma.contact.findMany({
      where: {
        workspaceId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        source: true,
        engagementLevel: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalBefore = await this.prisma.contact.count({
      where: {
        workspaceId,
        createdAt: { lt: startDate },
      },
    });

    // Daily growth
    const dailyGrowth: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byEngagement: Record<string, number> = {};

    for (const c of contacts) {
      const dateKey = c.createdAt.toISOString().split('T')[0];
      dailyGrowth[dateKey] = (dailyGrowth[dateKey] || 0) + 1;
      bySource[c.source] = (bySource[c.source] || 0) + 1;
      byEngagement[c.engagementLevel] = (byEngagement[c.engagementLevel] || 0) + 1;
    }

    // Calculate cumulative
    let cumulative = totalBefore;
    const cumulativeGrowth = Object.entries(dailyGrowth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => {
        cumulative += count;
        return { date, newContacts: count, totalContacts: cumulative };
      });

    return {
      totalNewContacts: contacts.length,
      totalContactsBefore: totalBefore,
      totalContactsAfter: totalBefore + contacts.length,
      growthRate: totalBefore > 0
        ? Math.round((contacts.length / totalBefore) * 100)
        : 100,
      bySource,
      byEngagement,
      dailyGrowth: cumulativeGrowth,
    };
  }

  // ===========================================
  // Engagement Report
  // ===========================================

  private async generateEngagementReport(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const [
      totalMessages,
      inboundMessages,
      outboundMessages,
      conversations,
    ] = await Promise.all([
      this.prisma.message.count({
        where: {
          page: { workspaceId },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.message.count({
        where: {
          page: { workspaceId },
          direction: 'INBOUND',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.message.count({
        where: {
          page: { workspaceId },
          direction: 'OUTBOUND',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.conversation.findMany({
        where: {
          workspaceId,
          lastMessageAt: { gte: startDate, lte: endDate },
        },
        select: { status: true, unreadCount: true },
      }),
    ]);

    const activeContacts = await this.prisma.contact.count({
      where: {
        workspaceId,
        lastInteractionAt: { gte: startDate, lte: endDate },
      },
    });

    const deliveredMessages = await this.prisma.message.count({
      where: {
        page: { workspaceId },
        direction: 'OUTBOUND',
        status: { in: ['DELIVERED', 'READ'] },
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const bypassUsage = await this.prisma.message.groupBy({
      by: ['bypassMethod'],
      where: {
        page: { workspaceId },
        direction: 'OUTBOUND',
        bypassMethod: { not: null },
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: true,
    });

    return {
      totalMessages,
      inboundMessages,
      outboundMessages,
      activeContacts,
      deliveryRate: outboundMessages > 0
        ? Math.round((deliveredMessages / outboundMessages) * 100)
        : 0,
      responseRate: outboundMessages > 0
        ? Math.round((inboundMessages / outboundMessages) * 100)
        : 0,
      conversations: {
        total: conversations.length,
        byStatus: conversations.reduce((acc, c) => {
          acc[c.status] = (acc[c.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      bypassMethodUsage: bypassUsage.reduce((acc, b) => {
        if (b.bypassMethod) acc[b.bypassMethod] = b._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // ===========================================
  // Compliance Report
  // ===========================================

  private async generateComplianceReport(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const tagUsage = await this.prisma.message.groupBy({
      by: ['messageTag'],
      where: {
        page: { workspaceId },
        direction: 'OUTBOUND',
        messageTag: { not: null },
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: true,
    });

    const bypassMessages = await this.prisma.message.count({
      where: {
        page: { workspaceId },
        direction: 'OUTBOUND',
        bypassMethod: { not: null, notIn: ['WITHIN_WINDOW'] },
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const totalOutbound = await this.prisma.message.count({
      where: {
        page: { workspaceId },
        direction: 'OUTBOUND',
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const failedMessages = await this.prisma.message.count({
      where: {
        page: { workspaceId },
        direction: 'OUTBOUND',
        status: 'FAILED',
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    return {
      totalOutboundMessages: totalOutbound,
      messagesWithBypassMethod: bypassMessages,
      failedMessages,
      failureRate: totalOutbound > 0 ? Math.round((failedMessages / totalOutbound) * 100) : 0,
      tagUsage: tagUsage.reduce((acc, t) => {
        if (t.messageTag) acc[t.messageTag] = t._count;
        return acc;
      }, {} as Record<string, number>),
      bypassPercentage: totalOutbound > 0
        ? Math.round((bypassMessages / totalOutbound) * 100)
        : 0,
    };
  }

  // ===========================================
  // PDF Conversion (FR-10.5.3)
  // ===========================================

  private convertToPdf(report: ReportResult): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .text('MessageSender Report', { align: 'center' });
        doc.moveDown(0.5);
        doc
          .fontSize(14)
          .font('Helvetica')
          .text(this.formatReportTitle(report.reportType), { align: 'center' });
        doc.moveDown(0.3);
        doc
          .fontSize(10)
          .fillColor('#666666')
          .text(
            `Period: ${report.period.startDate.split('T')[0]} to ${report.period.endDate.split('T')[0]}`,
            { align: 'center' },
          );
        doc
          .text(`Generated: ${report.generatedAt.split('T')[0]}`, { align: 'center' });
        doc.moveDown(1);

        // Divider
        doc
          .strokeColor('#cccccc')
          .lineWidth(1)
          .moveTo(50, doc.y)
          .lineTo(545, doc.y)
          .stroke();
        doc.moveDown(1);

        // Summary section
        doc.fillColor('#000000');
        this.renderPdfSummary(doc, report.data);

        // Table section for array data
        const tableData =
          report.data.campaigns ||
          report.data.dailyGrowth ||
          null;
        if (Array.isArray(tableData) && tableData.length > 0) {
          doc.moveDown(1);
          this.renderPdfTable(doc, tableData);
        }

        // Footer
        doc.moveDown(2);
        doc
          .fontSize(8)
          .fillColor('#999999')
          .text(
            'This report was automatically generated by MessageSender.',
            { align: 'center' },
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private formatReportTitle(type: ReportType): string {
    const titles: Record<ReportType, string> = {
      campaign_summary: 'Campaign Summary Report',
      contact_growth: 'Contact Growth Report',
      engagement: 'Engagement Report',
      compliance: 'Compliance Report',
    };
    return titles[type] || type;
  }

  private renderPdfSummary(doc: any, data: any): void {
    doc.fontSize(12).font('Helvetica-Bold').text('Summary');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');

    const entries = Object.entries(data).filter(
      ([, v]) => typeof v !== 'object' || v === null,
    );
    for (const [key, value] of entries) {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      doc.text(`${label}: ${value ?? 'N/A'}`);
    }

    // Nested objects (e.g., byStatus, bySource)
    const objects = Object.entries(data).filter(
      ([k, v]) => typeof v === 'object' && v !== null && !Array.isArray(v),
    );
    for (const [key, value] of objects) {
      doc.moveDown(0.5);
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      doc.font('Helvetica-Bold').text(label);
      doc.font('Helvetica');
      for (const [k, v] of Object.entries(value as Record<string, any>)) {
        doc.text(`  ${k}: ${v}`);
      }
    }
  }

  private renderPdfTable(doc: any, rows: any[]): void {
    const headers = Object.keys(rows[0]).slice(0, 6); // max 6 columns for A4
    const colWidth = Math.floor(495 / headers.length);

    doc.fontSize(12).font('Helvetica-Bold').text('Details');
    doc.moveDown(0.5);

    // Table header
    let x = 50;
    doc.fontSize(8).font('Helvetica-Bold');
    for (const h of headers) {
      const label = h.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      doc.text(label, x, doc.y, { width: colWidth, continued: false });
      x += colWidth;
    }
    doc.moveDown(0.3);

    // Table rows (max 50 to avoid overflow)
    doc.font('Helvetica').fontSize(7);
    const maxRows = Math.min(rows.length, 50);
    for (let i = 0; i < maxRows; i++) {
      const row = rows[i];
      x = 50;
      const y = doc.y;
      for (const h of headers) {
        const val = row[h];
        const text = val === null || val === undefined ? '' : String(val).substring(0, 30);
        doc.text(text, x, y, { width: colWidth, lineBreak: false });
        x += colWidth;
      }
      doc.moveDown(0.3);

      // Page break if near bottom
      if (doc.y > 750) {
        doc.addPage();
      }
    }

    if (rows.length > 50) {
      doc.moveDown(0.5);
      doc.text(`... and ${rows.length - 50} more rows`);
    }
  }

  // ===========================================
  // CSV Conversion
  // ===========================================

  private convertToCsv(data: any): string {
    if (!data) return '';

    // If data has a campaigns array, use that for CSV
    const rows = data.campaigns || data.dailyGrowth || [data];
    if (!Array.isArray(rows) || rows.length === 0) {
      // Convert summary object to single-row CSV
      const entries = Object.entries(data).filter(([, v]) => typeof v !== 'object');
      const headers = entries.map(([k]) => k);
      const values = entries.map(([, v]) => `"${String(v)}"`);
      return `${headers.join(',')}\n${values.join(',')}`;
    }

    const headers = Object.keys(rows[0]);
    const csvRows = [
      headers.join(','),
      ...rows.map((row: any) =>
        headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(','),
      ),
    ];

    return csvRows.join('\n');
  }
}
