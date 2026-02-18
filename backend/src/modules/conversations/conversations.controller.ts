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
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationExtrasService, CreateNoteDto, UpdateLabelsDto, AddLabelDto } from './conversation-extras.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';
import {
  ConversationListQueryDto,
  UpdateConversationDto,
  AssignConversationDto,
  BulkUpdateConversationsDto,
  CreateConversationDto,
} from './dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConversationsController {
  constructor(
    private conversationsService: ConversationsService,
    private extrasService: ConversationExtrasService,
  ) {}

  @Get()
  @Roles('VIEW_ONLY')
  async findAll(
    @WorkspaceId() workspaceId: string,
    @Query() query: ConversationListQueryDto,
  ) {
    return this.conversationsService.findAll(workspaceId, query);
  }

  @Get('stats')
  @Roles('VIEW_ONLY')
  async getStats(@WorkspaceId() workspaceId: string) {
    return this.conversationsService.getStats(workspaceId);
  }

  @Get('my')
  @Roles('VIEW_ONLY')
  async getMyConversations(
    @WorkspaceId() workspaceId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.conversationsService.getMyConversations(workspaceId, req.user.id);
  }

  @Get(':id')
  @Roles('VIEW_ONLY')
  async findById(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.conversationsService.findById(workspaceId, id);
  }

  @Post()
  @Roles('OPERATOR')
  async create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversationsService.create(workspaceId, dto);
  }

  @Put(':id')
  @Roles('OPERATOR')
  async update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.conversationsService.update(workspaceId, id, dto);
  }

  @Post(':id/assign')
  @Roles('MANAGER')
  async assign(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: AssignConversationDto,
  ) {
    return this.conversationsService.assign(workspaceId, id, dto.userId);
  }

  @Post(':id/unassign')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.OK)
  async unassign(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.conversationsService.unassign(workspaceId, id);
  }

  @Post(':id/read')
  @Roles('VIEW_ONLY')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.conversationsService.markAsRead(workspaceId, id);
  }

  @Post('bulk')
  @Roles('MANAGER')
  async bulkUpdate(
    @WorkspaceId() workspaceId: string,
    @Body() dto: BulkUpdateConversationsDto,
  ) {
    return this.conversationsService.bulkUpdate(workspaceId, dto);
  }

  // ==========================================
  // NOTES ENDPOINTS
  // ==========================================

  @Get(':id/notes')
  @Roles('VIEW_ONLY')
  async getNotes(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.extrasService.getNotes(workspaceId, id);
  }

  @Post(':id/notes')
  @Roles('OPERATOR')
  async createNote(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: CreateNoteDto,
    @Request() req: { user: { id: string; role?: string } },
  ) {
    const createdBy = req.user.role === 'ADMIN'
      ? { adminId: req.user.id }
      : { userId: req.user.id };
    return this.extrasService.createNote(workspaceId, id, dto.content, createdBy);
  }

  @Delete(':id/notes/:noteId')
  @Roles('OPERATOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNote(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Param('noteId') noteId: string,
  ) {
    return this.extrasService.deleteNote(workspaceId, id, noteId);
  }

  // ==========================================
  // LABELS ENDPOINTS
  // ==========================================

  @Get('labels/all')
  @Roles('VIEW_ONLY')
  async getAllLabels(@WorkspaceId() workspaceId: string) {
    return this.extrasService.getAllLabels(workspaceId);
  }

  @Get(':id/labels')
  @Roles('VIEW_ONLY')
  async getLabels(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.extrasService.getLabels(workspaceId, id);
  }

  @Put(':id/labels')
  @Roles('OPERATOR')
  async setLabels(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLabelsDto,
  ) {
    return this.extrasService.setLabels(workspaceId, id, dto.labels);
  }

  @Post(':id/labels')
  @Roles('OPERATOR')
  async addLabel(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: AddLabelDto,
  ) {
    return this.extrasService.addLabel(workspaceId, id, dto.label);
  }

  @Delete(':id/labels/:label')
  @Roles('OPERATOR')
  async removeLabel(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Param('label') label: string,
  ) {
    return this.extrasService.removeLabel(workspaceId, id, label);
  }
}
