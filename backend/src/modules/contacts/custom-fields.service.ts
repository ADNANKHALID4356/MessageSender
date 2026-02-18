import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CustomFieldType } from '@prisma/client';

// ===========================================
// DTOs
// ===========================================

export class CreateCustomFieldDto {
  fieldName: string;
  fieldKey: string;
  fieldType: CustomFieldType;
  options?: string[];
  isRequired?: boolean;
  sortOrder?: number;
}

export class UpdateCustomFieldDto {
  fieldName?: string;
  fieldType?: CustomFieldType;
  options?: string[];
  isRequired?: boolean;
  sortOrder?: number;
}

export class SetContactCustomFieldsDto {
  fields: Record<string, unknown>;
}

// ===========================================
// Service
// ===========================================

@Injectable()
export class CustomFieldsService {
  private readonly logger = new Logger(CustomFieldsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new custom field definition for a workspace
   */
  async createField(workspaceId: string, dto: CreateCustomFieldDto) {
    // Validate fieldKey format (lowercase, underscores only)
    if (!/^[a-z][a-z0-9_]*$/.test(dto.fieldKey)) {
      throw new BadRequestException(
        'Field key must start with a letter, and contain only lowercase letters, numbers, and underscores',
      );
    }

    // Check for duplicate key
    const existing = await this.prisma.customFieldDefinition.findUnique({
      where: { workspaceId_fieldKey: { workspaceId, fieldKey: dto.fieldKey } },
    });

    if (existing) {
      throw new ConflictException(`Custom field with key "${dto.fieldKey}" already exists`);
    }

    // Validate dropdown options
    if (dto.fieldType === 'DROPDOWN' && (!dto.options || dto.options.length === 0)) {
      throw new BadRequestException('Dropdown fields must have at least one option');
    }

    // Get next sort order if not specified
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const maxOrder = await this.prisma.customFieldDefinition.findFirst({
        where: { workspaceId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      sortOrder = (maxOrder?.sortOrder ?? -1) + 1;
    }

    return this.prisma.customFieldDefinition.create({
      data: {
        workspaceId,
        fieldName: dto.fieldName,
        fieldKey: dto.fieldKey,
        fieldType: dto.fieldType,
        options: dto.options || [],
        isRequired: dto.isRequired ?? false,
        sortOrder,
      },
    });
  }

  /**
   * Get all custom field definitions for a workspace
   */
  async getFields(workspaceId: string) {
    return this.prisma.customFieldDefinition.findMany({
      where: { workspaceId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Get a single custom field definition
   */
  async getField(workspaceId: string, fieldId: string) {
    const field = await this.prisma.customFieldDefinition.findFirst({
      where: { id: fieldId, workspaceId },
    });

    if (!field) {
      throw new NotFoundException('Custom field not found');
    }

    return field;
  }

  /**
   * Update a custom field definition
   */
  async updateField(workspaceId: string, fieldId: string, dto: UpdateCustomFieldDto) {
    const field = await this.prisma.customFieldDefinition.findFirst({
      where: { id: fieldId, workspaceId },
    });

    if (!field) {
      throw new NotFoundException('Custom field not found');
    }

    // Validate dropdown options if changing to dropdown
    const effectiveType = dto.fieldType ?? field.fieldType;
    if (effectiveType === 'DROPDOWN') {
      const effectiveOptions = dto.options ?? field.options;
      if (!effectiveOptions || effectiveOptions.length === 0) {
        throw new BadRequestException('Dropdown fields must have at least one option');
      }
    }

    return this.prisma.customFieldDefinition.update({
      where: { id: fieldId },
      data: {
        fieldName: dto.fieldName,
        fieldType: dto.fieldType,
        options: dto.options,
        isRequired: dto.isRequired,
        sortOrder: dto.sortOrder,
      },
    });
  }

  /**
   * Delete a custom field definition and clean up contact data
   */
  async deleteField(workspaceId: string, fieldId: string) {
    const field = await this.prisma.customFieldDefinition.findFirst({
      where: { id: fieldId, workspaceId },
    });

    if (!field) {
      throw new NotFoundException('Custom field not found');
    }

    // Delete the field definition
    await this.prisma.customFieldDefinition.delete({
      where: { id: fieldId },
    });

    // Clean up the field from all contacts in this workspace
    // We do this in a background-safe way
    const contacts = await this.prisma.contact.findMany({
      where: { workspaceId },
      select: { id: true, customFields: true },
    });

    const updates = contacts
      .filter((c) => {
        const cf = c.customFields as Record<string, unknown>;
        return cf && field.fieldKey in cf;
      })
      .map((c) => {
        const cf = { ...(c.customFields as Record<string, unknown>) };
        delete cf[field.fieldKey];
        return this.prisma.contact.update({
          where: { id: c.id },
          data: { customFields: cf as any },
        });
      });

    if (updates.length > 0) {
      await this.prisma.$transaction(updates);
    }

    this.logger.log(
      `Deleted custom field "${field.fieldName}" (${field.fieldKey}) and cleaned ${updates.length} contacts`,
    );

    return { deleted: true, contactsCleaned: updates.length };
  }

  /**
   * Set custom field values for a contact (validates against definitions)
   */
  async setContactCustomFields(
    workspaceId: string,
    contactId: string,
    fields: Record<string, unknown>,
  ) {
    // Verify contact exists in workspace
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, workspaceId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // Get all field definitions for validation
    const definitions = await this.prisma.customFieldDefinition.findMany({
      where: { workspaceId },
    });

    const defMap = new Map(definitions.map((d) => [d.fieldKey, d]));

    // Validate each field
    for (const [key, value] of Object.entries(fields)) {
      const def = defMap.get(key);
      if (!def) {
        throw new BadRequestException(`Unknown custom field: "${key}"`);
      }

      // Type validation
      this.validateFieldValue(def.fieldType, def.options, key, value);
    }

    // Check required fields (only enforce if explicitly setting fields)
    for (const def of definitions) {
      if (def.isRequired && fields[def.fieldKey] === undefined) {
        // Only check if the field was in the request and set to null
        if (def.fieldKey in fields && fields[def.fieldKey] === null) {
          throw new BadRequestException(`Field "${def.fieldName}" is required`);
        }
      }
    }

    // Merge with existing custom fields
    const existingFields = (contact.customFields as Record<string, unknown>) || {};
    const mergedFields = { ...existingFields };

    for (const [key, value] of Object.entries(fields)) {
      if (value === null) {
        delete mergedFields[key];
      } else {
        mergedFields[key] = value;
      }
    }

    return this.prisma.contact.update({
      where: { id: contactId },
      data: { customFields: mergedFields as any },
      include: {
        tags: { include: { tag: true } },
        page: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Get custom field values for a contact
   */
  async getContactCustomFields(workspaceId: string, contactId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, workspaceId },
      select: { customFields: true },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const definitions = await this.prisma.customFieldDefinition.findMany({
      where: { workspaceId },
      orderBy: { sortOrder: 'asc' },
    });

    const values = (contact.customFields as Record<string, unknown>) || {};

    return definitions.map((def) => ({
      definition: def,
      value: values[def.fieldKey] ?? null,
    }));
  }

  /**
   * Reorder custom fields
   */
  async reorderFields(workspaceId: string, fieldIds: string[]) {
    const updates = fieldIds.map((id, index) =>
      this.prisma.customFieldDefinition.updateMany({
        where: { id, workspaceId },
        data: { sortOrder: index },
      }),
    );

    await this.prisma.$transaction(updates);
    return this.getFields(workspaceId);
  }

  // ===========================================
  // Private Helpers
  // ===========================================

  private validateFieldValue(
    fieldType: CustomFieldType,
    options: string[],
    key: string,
    value: unknown,
  ) {
    if (value === null || value === undefined) return;

    switch (fieldType) {
      case 'TEXT':
        if (typeof value !== 'string') {
          throw new BadRequestException(`Field "${key}" must be a string`);
        }
        if ((value as string).length > 500) {
          throw new BadRequestException(`Field "${key}" exceeds maximum length of 500 characters`);
        }
        break;

      case 'NUMBER':
        if (typeof value !== 'number' || isNaN(value as number)) {
          throw new BadRequestException(`Field "${key}" must be a number`);
        }
        break;

      case 'DATE':
        if (typeof value !== 'string' || isNaN(Date.parse(value as string))) {
          throw new BadRequestException(`Field "${key}" must be a valid date string`);
        }
        break;

      case 'DROPDOWN':
        if (typeof value !== 'string') {
          throw new BadRequestException(`Field "${key}" must be a string`);
        }
        if (!options.includes(value as string)) {
          throw new BadRequestException(
            `Field "${key}" must be one of: ${options.join(', ')}`,
          );
        }
        break;

      case 'CHECKBOX':
        if (typeof value !== 'boolean') {
          throw new BadRequestException(`Field "${key}" must be a boolean`);
        }
        break;
    }
  }
}
