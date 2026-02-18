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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CustomFieldsService, CreateCustomFieldDto, UpdateCustomFieldDto, SetContactCustomFieldsDto } from './custom-fields.service';
import { ImportExportService, FieldMapping } from './import-export.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';
import {
  CreateContactDto,
  UpdateContactDto,
  ContactListQueryDto,
  AddTagsDto,
  RemoveTagsDto,
  CreateTagDto,
  UpdateTagDto,
  BulkUpdateContactsDto,
} from './dto';

@Controller('contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContactsController {
  constructor(
    private contactsService: ContactsService,
    private customFieldsService: CustomFieldsService,
    private importExportService: ImportExportService,
  ) {}

  // ==========================================
  // CONTACT ENDPOINTS
  // ==========================================

  @Post()
  @Roles('MANAGER')
  async create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateContactDto,
  ) {
    return this.contactsService.create(workspaceId, dto);
  }

  @Get()
  @Roles('VIEW_ONLY')
  async findAll(
    @WorkspaceId() workspaceId: string,
    @Query() query: ContactListQueryDto,
  ) {
    return this.contactsService.findAll(workspaceId, query);
  }

  @Get('stats')
  @Roles('VIEW_ONLY')
  async getStats(@WorkspaceId() workspaceId: string) {
    return this.contactsService.getStats(workspaceId);
  }

  @Get(':id')
  @Roles('VIEW_ONLY')
  async findById(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.contactsService.findById(workspaceId, id);
  }

  @Put(':id')
  @Roles('OPERATOR')
  async update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    await this.contactsService.delete(workspaceId, id);
  }

  @Post(':id/tags')
  @Roles('OPERATOR')
  async addTags(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: AddTagsDto,
  ) {
    return this.contactsService.addTags(workspaceId, id, dto.tagIds);
  }

  @Delete(':id/tags')
  @Roles('OPERATOR')
  async removeTags(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: RemoveTagsDto,
  ) {
    return this.contactsService.removeTags(workspaceId, id, dto.tagIds);
  }

  @Post('bulk')
  @Roles('MANAGER')
  async bulkUpdate(
    @WorkspaceId() workspaceId: string,
    @Body() dto: BulkUpdateContactsDto,
  ) {
    return this.contactsService.bulkUpdate(workspaceId, dto);
  }

  // ==========================================
  // TAG ENDPOINTS
  // ==========================================

  @Get('tags/all')
  @Roles('VIEW_ONLY')
  async getTags(@WorkspaceId() workspaceId: string) {
    return this.contactsService.getTags(workspaceId);
  }

  @Post('tags')
  @Roles('MANAGER')
  async createTag(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateTagDto,
  ) {
    return this.contactsService.createTag(workspaceId, dto);
  }

  @Put('tags/:tagId')
  @Roles('MANAGER')
  async updateTag(
    @WorkspaceId() workspaceId: string,
    @Param('tagId') tagId: string,
    @Body() dto: UpdateTagDto,
  ) {
    return this.contactsService.updateTag(workspaceId, tagId, dto);
  }

  @Delete('tags/:tagId')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTag(
    @WorkspaceId() workspaceId: string,
    @Param('tagId') tagId: string,
  ) {
    await this.contactsService.deleteTag(workspaceId, tagId);
  }

  // ==========================================
  // CUSTOM FIELD ENDPOINTS
  // ==========================================

  @Get('custom-fields/definitions')
  @Roles('VIEW_ONLY')
  async getCustomFields(@WorkspaceId() workspaceId: string) {
    return this.customFieldsService.getFields(workspaceId);
  }

  @Post('custom-fields/definitions')
  @Roles('MANAGER')
  async createCustomField(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateCustomFieldDto,
  ) {
    return this.customFieldsService.createField(workspaceId, dto);
  }

  @Put('custom-fields/definitions/:fieldId')
  @Roles('MANAGER')
  async updateCustomField(
    @WorkspaceId() workspaceId: string,
    @Param('fieldId') fieldId: string,
    @Body() dto: UpdateCustomFieldDto,
  ) {
    return this.customFieldsService.updateField(workspaceId, fieldId, dto);
  }

  @Delete('custom-fields/definitions/:fieldId')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCustomField(
    @WorkspaceId() workspaceId: string,
    @Param('fieldId') fieldId: string,
  ) {
    return this.customFieldsService.deleteField(workspaceId, fieldId);
  }

  @Post('custom-fields/definitions/reorder')
  @Roles('MANAGER')
  async reorderCustomFields(
    @WorkspaceId() workspaceId: string,
    @Body() body: { fieldIds: string[] },
  ) {
    return this.customFieldsService.reorderFields(workspaceId, body.fieldIds);
  }

  @Get(':id/custom-fields')
  @Roles('VIEW_ONLY')
  async getContactCustomFields(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.customFieldsService.getContactCustomFields(workspaceId, id);
  }

  @Put(':id/custom-fields')
  @Roles('OPERATOR')
  async setContactCustomFields(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: SetContactCustomFieldsDto,
  ) {
    return this.customFieldsService.setContactCustomFields(workspaceId, id, dto.fields);
  }

  // ==========================================
  // IMPORT / EXPORT ENDPOINTS
  // ==========================================

  @Post('import/parse')
  @Roles('MANAGER')
  async parseCsv(@Body() body: { csvText: string }) {
    const rows = this.importExportService.parseCsv(body.csvText);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { headers, rowCount: rows.length, preview: rows.slice(0, 5) };
  }

  @Post('import')
  @Roles('MANAGER')
  async importContacts(
    @WorkspaceId() workspaceId: string,
    @Body() body: { pageId: string; csvText: string; mappings: FieldMapping[] },
  ) {
    const rawRows = this.importExportService.parseCsv(body.csvText);
    const mappedRows = this.importExportService.applyFieldMappings(rawRows, body.mappings);
    return this.importExportService.importContacts(workspaceId, body.pageId, mappedRows);
  }

  @Post('export')
  @Roles('VIEW_ONLY')
  async exportContacts(
    @WorkspaceId() workspaceId: string,
    @Body() body: { pageId?: string; tagIds?: string[]; engagementLevel?: string; includeCustomFields?: boolean },
  ) {
    const csv = await this.importExportService.exportContacts(workspaceId, body);
    return { csv, filename: `contacts_export_${new Date().toISOString().slice(0, 10)}.csv` };
  }
}
