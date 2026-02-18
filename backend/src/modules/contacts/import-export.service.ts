import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ===========================================
// Types
// ===========================================

export interface ImportContactRow {
  psid: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  locale?: string;
  timezone?: number;
  source?: string;
  notes?: string;
  tags?: string;
  [key: string]: unknown; // custom fields
}

export interface ImportResult {
  totalRows: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

export interface FieldMapping {
  csvColumn: string;
  appField: string;
}

// Known standard fields
const STANDARD_FIELDS = new Set([
  'psid', 'firstName', 'lastName', 'gender', 'locale',
  'timezone', 'source', 'notes', 'tags',
]);

@Injectable()
export class ImportExportService {
  private readonly logger = new Logger(ImportExportService.name);

  constructor(private prisma: PrismaService) {}

  // ===========================================
  // CSV IMPORT
  // ===========================================

  /**
   * Parse CSV text into rows
   */
  parseCsv(csvText: string): Record<string, string>[] {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      throw new BadRequestException('CSV must have a header row and at least one data row');
    }

    const headers = this.parseCsvLine(lines[0]);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h.trim()] = (values[idx] || '').trim();
      });
      rows.push(row);
    }

    return rows;
  }

  /**
   * Apply field mappings to raw CSV rows
   */
  applyFieldMappings(
    rows: Record<string, string>[],
    mappings: FieldMapping[],
  ): ImportContactRow[] {
    return rows.map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const m of mappings) {
        if (m.appField && row[m.csvColumn] !== undefined) {
          let value: unknown = row[m.csvColumn];
          if (m.appField === 'timezone' && value) {
            value = parseInt(value as string, 10);
            if (isNaN(value as number)) value = undefined;
          }
          mapped[m.appField] = value;
        }
      }
      return mapped as ImportContactRow;
    });
  }

  /**
   * Import contacts from parsed and mapped rows
   */
  async importContacts(
    workspaceId: string,
    pageId: string,
    rows: ImportContactRow[],
  ): Promise<ImportResult> {
    // Validate page belongs to workspace
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, workspaceId },
    });
    if (!page) {
      throw new BadRequestException('Page not found in this workspace');
    }

    // Get existing custom field definitions
    const customFields = await this.prisma.customFieldDefinition.findMany({
      where: { workspaceId },
    });
    const customFieldKeys = new Set(customFields.map((f) => f.fieldKey));

    // Get existing tags for the workspace
    const existingTags = await this.prisma.tag.findMany({
      where: { workspaceId },
    });
    const tagMap = new Map(existingTags.map((t) => [t.name.toLowerCase(), t]));

    const result: ImportResult = {
      totalRows: rows.length,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.psid || !row.psid.trim()) {
          result.errors.push({ row: i + 2, message: 'Missing PSID' });
          result.skipped++;
          continue;
        }

        // Separate standard and custom fields
        const cfData: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
          if (!STANDARD_FIELDS.has(key) && customFieldKeys.has(key) && value) {
            cfData[key] = value;
          }
        }

        const fullName = [row.firstName, row.lastName].filter(Boolean).join(' ') || null;

        // Upsert contact
        const existing = await this.prisma.contact.findUnique({
          where: { pageId_psid: { pageId, psid: row.psid } },
        });

        let contact;
        if (existing) {
          contact = await this.prisma.contact.update({
            where: { id: existing.id },
            data: {
              firstName: row.firstName || existing.firstName,
              lastName: row.lastName || existing.lastName,
              fullName: fullName || existing.fullName,
              gender: row.gender || existing.gender,
              locale: row.locale || existing.locale,
              timezone: row.timezone ?? existing.timezone,
              notes: row.notes || existing.notes,
              customFields: {
                ...(existing.customFields as Record<string, unknown>),
                ...cfData,
              } as any,
            },
          });
          result.updated++;
        } else {
          contact = await this.prisma.contact.create({
            data: {
              workspaceId,
              pageId,
              psid: row.psid,
              firstName: row.firstName,
              lastName: row.lastName,
              fullName,
              gender: row.gender,
              locale: row.locale,
              timezone: row.timezone,
              source: 'ORGANIC',
              notes: row.notes,
              customFields: cfData as any,
              firstInteractionAt: new Date(),
            },
          });
          result.imported++;
        }

        // Handle tags
        if (row.tags) {
          const tagNames = row.tags.split(',').map((t) => t.trim()).filter(Boolean);
          for (const tagName of tagNames) {
            let tag = tagMap.get(tagName.toLowerCase());
            if (!tag) {
              tag = await this.prisma.tag.create({
                data: { workspaceId, name: tagName },
              });
              tagMap.set(tagName.toLowerCase(), tag);
            }

            // Upsert contact-tag relation
            await this.prisma.contactTag.upsert({
              where: { contactId_tagId: { contactId: contact.id, tagId: tag.id } },
              create: { contactId: contact.id, tagId: tag.id },
              update: {},
            });
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        result.errors.push({ row: i + 2, message });
        result.skipped++;
      }
    }

    this.logger.log(
      `Import completed: ${result.imported} new, ${result.updated} updated, ${result.skipped} skipped`,
    );

    return result;
  }

  // ===========================================
  // CSV EXPORT
  // ===========================================

  /**
   * Export contacts as CSV string
   */
  async exportContacts(
    workspaceId: string,
    options: {
      pageId?: string;
      tagIds?: string[];
      engagementLevel?: string;
      includeCustomFields?: boolean;
    } = {},
  ): Promise<string> {
    const where: Record<string, unknown> = { workspaceId };
    if (options.pageId) where.pageId = options.pageId;
    if (options.engagementLevel) where.engagementLevel = options.engagementLevel;
    if (options.tagIds?.length) {
      where.tags = { some: { tagId: { in: options.tagIds } } };
    }

    const contacts = await this.prisma.contact.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
        page: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Build custom field columns
    let customFieldDefs: Array<{ fieldKey: string; fieldName: string }> = [];
    if (options.includeCustomFields !== false) {
      const defs = await this.prisma.customFieldDefinition.findMany({
        where: { workspaceId },
        orderBy: { sortOrder: 'asc' },
      });
      customFieldDefs = defs.map((d) => ({ fieldKey: d.fieldKey, fieldName: d.fieldName }));
    }

    // CSV headers
    const standardHeaders = [
      'PSID', 'First Name', 'Last Name', 'Full Name', 'Page',
      'Engagement Level', 'Engagement Score', 'Subscribed',
      'Source', 'Gender', 'Locale', 'Timezone', 'Tags', 'Notes',
      'First Interaction', 'Last Interaction', 'Created At',
    ];
    const customHeaders = customFieldDefs.map((d) => d.fieldName);
    const allHeaders = [...standardHeaders, ...customHeaders];

    const rows = [allHeaders.map((h) => this.escapeCsvField(h)).join(',')];

    for (const contact of contacts) {
      const cf = (contact.customFields as Record<string, unknown>) || {};
      const tags = contact.tags.map((ct) => ct.tag.name).join(', ');

      const standardValues = [
        contact.psid,
        contact.firstName || '',
        contact.lastName || '',
        contact.fullName || '',
        contact.page?.name || '',
        contact.engagementLevel,
        String(contact.engagementScore),
        contact.isSubscribed ? 'Yes' : 'No',
        contact.source,
        contact.gender || '',
        contact.locale || '',
        contact.timezone != null ? String(contact.timezone) : '',
        tags,
        contact.notes || '',
        contact.firstInteractionAt?.toISOString() || '',
        contact.lastInteractionAt?.toISOString() || '',
        contact.createdAt.toISOString(),
      ];
      const customValues = customFieldDefs.map((d) => {
        const val = cf[d.fieldKey];
        return val != null ? String(val) : '';
      });

      rows.push(
        [...standardValues, ...customValues].map((v) => this.escapeCsvField(v)).join(','),
      );
    }

    return rows.join('\n');
  }

  // ===========================================
  // Private Helpers
  // ===========================================

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }
    result.push(current);
    return result;
  }

  private escapeCsvField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
