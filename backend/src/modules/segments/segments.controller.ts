import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { SegmentsService } from './segments.service';
import {
  CreateSegmentDto,
  UpdateSegmentDto,
  SegmentListQueryDto,
  SegmentContactsQueryDto,
  AddContactsToSegmentDto,
  RemoveContactsFromSegmentDto,
  SegmentFiltersDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentWorkspace } from '../auth/decorators';

@Controller('segments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SegmentsController {
  constructor(private readonly segmentsService: SegmentsService) {}

  // ===========================================
  // CRUD Endpoints
  // ===========================================

  /**
   * Create a new segment
   */
  @Post()
  @Roles('MANAGER')
  async create(
    @CurrentWorkspace() workspaceId: string,
    @Body() dto: CreateSegmentDto,
  ) {
    return this.segmentsService.create(workspaceId, dto);
  }

  /**
   * Get all segments
   */
  @Get()
  @Roles('VIEW_ONLY')
  async findAll(
    @CurrentWorkspace() workspaceId: string,
    @Query() query: SegmentListQueryDto,
  ) {
    return this.segmentsService.findAll(workspaceId, query);
  }

  /**
   * Get segment by ID
   */
  @Get(':id')
  @Roles('VIEW_ONLY')
  async findById(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.segmentsService.findById(workspaceId, id);
  }

  /**
   * Update a segment
   */
  @Put(':id')
  @Roles('MANAGER')
  async update(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSegmentDto,
  ) {
    return this.segmentsService.update(workspaceId, id, dto);
  }

  /**
   * Delete a segment
   */
  @Delete(':id')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    await this.segmentsService.delete(workspaceId, id);
  }

  // ===========================================
  // Contact Management
  // ===========================================

  /**
   * Get contacts in a segment
   */
  @Get(':id/contacts')
  @Roles('VIEW_ONLY')
  async getContacts(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
    @Query() query: SegmentContactsQueryDto,
  ) {
    return this.segmentsService.getContacts(workspaceId, id, query);
  }

  /**
   * Add contacts to a static segment
   */
  @Post(':id/contacts')
  @Roles('MANAGER')
  async addContacts(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: AddContactsToSegmentDto,
  ) {
    return this.segmentsService.addContacts(workspaceId, id, dto.contactIds);
  }

  /**
   * Remove contacts from a static segment
   */
  @Delete(':id/contacts')
  @Roles('MANAGER')
  async removeContacts(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: RemoveContactsFromSegmentDto,
  ) {
    return this.segmentsService.removeContacts(workspaceId, id, dto.contactIds);
  }

  // ===========================================
  // Preview & Recalculation
  // ===========================================

  /**
   * Preview segment filters (returns contact count and samples)
   */
  @Post('preview')
  @Roles('VIEW_ONLY')
  async preview(
    @CurrentWorkspace() workspaceId: string,
    @Body() filters: SegmentFiltersDto,
  ) {
    return this.segmentsService.preview(workspaceId, filters);
  }

  /**
   * Recalculate a dynamic segment
   */
  @Post(':id/recalculate')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async recalculate(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    await this.segmentsService.recalculateSegment(workspaceId, id);
  }

  /**
   * Recalculate all dynamic segments in workspace
   */
  @Post('recalculate-all')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async recalculateAll(@CurrentWorkspace() workspaceId: string) {
    await this.segmentsService.recalculateAllSegments(workspaceId);
  }
}
