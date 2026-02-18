import {
  Controller,
  Get,
  Put,
  Delete,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PagesService } from './pages.service';
import { PageSyncService } from './page-sync.service';
import { UpdatePageDto } from './dto';
import { WorkspacesService } from '../workspaces/workspaces.service';

@ApiTags('pages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workspaces/:workspaceId/pages')
export class PagesController {
  constructor(
    private readonly pagesService: PagesService,
    private readonly pageSyncService: PageSyncService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  @Get()
  @Roles('VIEW_ONLY')
  @ApiOperation({ summary: 'Get all pages for a workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace UUID' })
  @ApiResponse({ status: 200, description: 'List of pages' })
  async findAll(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @CurrentUser() user: { id: string; role: string }
  ) {
    // Verify access for non-admins
    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      const hasAccess = await this.workspacesService.checkUserAccess(workspaceId, user.id);
      if (!hasAccess) {
        return { error: 'Access denied to this workspace' };
      }
    }

    return this.pagesService.findByWorkspace(workspaceId);
  }

  @Get(':id')
  @Roles('VIEW_ONLY')
  @ApiOperation({ summary: 'Get page details' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace UUID' })
  @ApiParam({ name: 'id', description: 'Page UUID' })
  @ApiResponse({ status: 200, description: 'Page details' })
  async findById(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string }
  ) {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      const hasAccess = await this.workspacesService.checkUserAccess(workspaceId, user.id);
      if (!hasAccess) {
        return { error: 'Access denied to this workspace' };
      }
    }

    return this.pagesService.getPageWithDetails(id);
  }

  @Get(':id/stats')
  @Roles('VIEW_ONLY')
  @ApiOperation({ summary: 'Get page statistics' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace UUID' })
  @ApiParam({ name: 'id', description: 'Page UUID' })
  @ApiResponse({ status: 200, description: 'Page statistics' })
  async getStats(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string }
  ) {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      const hasAccess = await this.workspacesService.checkUserAccess(workspaceId, user.id);
      if (!hasAccess) {
        return { error: 'Access denied to this workspace' };
      }
    }

    return this.pagesService.getStats(id, workspaceId);
  }

  @Put(':id')
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Update page settings' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace UUID' })
  @ApiParam({ name: 'id', description: 'Page UUID' })
  @ApiResponse({ status: 200, description: 'Page updated' })
  async update(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePageDto,
    @CurrentUser() user: { id: string; role: string }
  ) {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      const hasAccess = await this.workspacesService.checkUserAccess(
        workspaceId,
        user.id,
        'MANAGER'
      );
      if (!hasAccess) {
        return { error: 'Manager access required' };
      }
    }

    return this.pagesService.update(id, workspaceId, dto);
  }

  @Delete(':id')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a page' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace UUID' })
  @ApiParam({ name: 'id', description: 'Page UUID' })
  @ApiResponse({ status: 204, description: 'Page deactivated' })
  async deactivate(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string }
  ) {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      const hasAccess = await this.workspacesService.checkUserAccess(
        workspaceId,
        user.id,
        'MANAGER'
      );
      if (!hasAccess) {
        return { error: 'Manager access required' };
      }
    }

    await this.pagesService.deactivate(id, workspaceId);
  }

  @Post(':id/reactivate')
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Reactivate a page' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace UUID' })
  @ApiParam({ name: 'id', description: 'Page UUID' })
  @ApiResponse({ status: 200, description: 'Page reactivated' })
  async reactivate(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string }
  ) {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      const hasAccess = await this.workspacesService.checkUserAccess(
        workspaceId,
        user.id,
        'MANAGER'
      );
      if (!hasAccess) {
        return { error: 'Manager access required' };
      }
    }

    return this.pagesService.reactivate(id, workspaceId);
  }

  @Post(':id/sync')
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Sync page info from Facebook' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace UUID' })
  @ApiParam({ name: 'id', description: 'Page UUID' })
  @ApiResponse({ status: 200, description: 'Page synced' })
  async sync(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string }
  ) {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      const hasAccess = await this.workspacesService.checkUserAccess(
        workspaceId,
        user.id,
        'MANAGER'
      );
      if (!hasAccess) {
        return { error: 'Manager access required' };
      }
    }

    return this.pagesService.syncPageInfo(id);
  }

  @Get(':id/token/validate')
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Validate page access token' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace UUID' })
  @ApiParam({ name: 'id', description: 'Page UUID' })
  @ApiResponse({ status: 200, description: 'Token validation result' })
  async validateToken(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string }
  ) {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      const hasAccess = await this.workspacesService.checkUserAccess(
        workspaceId,
        user.id,
        'MANAGER'
      );
      if (!hasAccess) {
        return { error: 'Manager access required' };
      }
    }

    return this.pagesService.validateToken(id);
  }

  @Post(':id/webhook/fix')
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Check and fix webhook subscription' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace UUID' })
  @ApiParam({ name: 'id', description: 'Page UUID' })
  @ApiResponse({ status: 200, description: 'Webhook status' })
  async fixWebhook(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string }
  ) {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      const hasAccess = await this.workspacesService.checkUserAccess(
        workspaceId,
        user.id,
        'MANAGER'
      );
      if (!hasAccess) {
        return { error: 'Manager access required' };
      }
    }

    return this.pagesService.checkAndFixWebhook(id);
  }

  // ===========================================
  // Page Sync (FR-3.2.5)
  // ===========================================

  @Post('sync-all')
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Sync all pages for workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace UUID' })
  @ApiResponse({ status: 200, description: 'All pages synced' })
  async syncAllPages(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      const hasAccess = await this.workspacesService.checkUserAccess(
        workspaceId,
        user.id,
        'MANAGER',
      );
      if (!hasAccess) {
        return { error: 'Manager access required' };
      }
    }

    return this.pageSyncService.syncAllPages();
  }

  @Get('health')
  @Roles('VIEW_ONLY')
  @ApiOperation({ summary: 'Get page health status' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace UUID' })
  @ApiResponse({ status: 200, description: 'Page health status' })
  async getPageHealth(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      const hasAccess = await this.workspacesService.checkUserAccess(workspaceId, user.id);
      if (!hasAccess) {
        return { error: 'Access denied' };
      }
    }

    return this.pageSyncService.getPageHealthStatus(workspaceId);
  }
}
