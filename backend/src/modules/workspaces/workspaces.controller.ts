import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto, AssignUserDto } from './dto';

@ApiTags('workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiResponse({ status: 201, description: 'Workspace created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - max workspaces reached' })
  async create(@Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(dto);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Get all workspaces (admin only)' })
  @ApiResponse({ status: 200, description: 'List of all workspaces' })
  async findAll(@CurrentUser() user: { userId: string; isAdmin: boolean }) {
    // Admin gets all workspaces in paginated format
    return this.workspacesService.findAllPaginated();
  }

  @Get('my')
  @ApiOperation({ summary: 'Get workspaces accessible by current user' })
  @ApiResponse({ status: 200, description: 'List of user accessible workspaces' })
  async findMyWorkspaces(@CurrentUser() user: { userId: string; isAdmin: boolean }) {
    // If admin, return all workspaces; if user, return only accessible ones
    if (user.isAdmin) {
      return this.workspacesService.findAllPaginated();
    }
    return this.workspacesService.findByUserPaginated(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workspace by ID' })
  @ApiParam({ name: 'id', description: 'Workspace UUID' })
  @ApiResponse({ status: 200, description: 'Workspace details' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; isAdmin: boolean }
  ) {
    // Admin has access to all workspaces; non-admins need explicit access
    if (!user.isAdmin) {
      const hasAccess = await this.workspacesService.checkUserAccess(id, user.userId);
      if (!hasAccess) {
        return { error: 'Access denied to this workspace' };
      }
    }
    return this.workspacesService.findByIdWithDetails(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get workspace statistics' })
  @ApiParam({ name: 'id', description: 'Workspace UUID' })
  @ApiResponse({ status: 200, description: 'Workspace statistics' })
  async getStats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; isAdmin: boolean }
  ) {
    if (!user.isAdmin) {
      const hasAccess = await this.workspacesService.checkUserAccess(id, user.userId);
      if (!hasAccess) {
        return { error: 'Access denied to this workspace' };
      }
    }
    return this.workspacesService.getStats(id);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update workspace' })
  @ApiParam({ name: 'id', description: 'Workspace UUID' })
  @ApiResponse({ status: 200, description: 'Workspace updated successfully' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkspaceDto,
    @CurrentUser() user: { userId: string; isAdmin: boolean }
  ) {
    if (!user.isAdmin) {
      const hasAccess = await this.workspacesService.checkUserAccess(id, user.userId, 'MANAGER');
      if (!hasAccess) {
        return { error: 'Access denied - Manager level required' };
      }
    }
    return this.workspacesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate workspace' })
  @ApiParam({ name: 'id', description: 'Workspace UUID' })
  @ApiResponse({ status: 204, description: 'Workspace deactivated' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    await this.workspacesService.deactivate(id);
  }

  @Delete(':id/permanent')
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete workspace (SUPER_ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Workspace UUID' })
  @ApiResponse({ status: 204, description: 'Workspace permanently deleted' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async permanentDelete(@Param('id', ParseUUIDPipe) id: string) {
    await this.workspacesService.delete(id);
  }

  @Post(':id/users')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Assign user to workspace' })
  @ApiParam({ name: 'id', description: 'Workspace UUID' })
  @ApiResponse({ status: 201, description: 'User assigned successfully' })
  @ApiResponse({ status: 404, description: 'Workspace or user not found' })
  async assignUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignUserDto,
    @CurrentUser() user: { userId: string; isAdmin: boolean }
  ) {
    if (!user.isAdmin) {
      const hasAccess = await this.workspacesService.checkUserAccess(id, user.userId, 'MANAGER');
      if (!hasAccess) {
        return { error: 'Access denied - Manager level required' };
      }
    }
    return this.workspacesService.assignUser(id, dto);
  }

  @Delete(':id/users/:userId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove user from workspace' })
  @ApiParam({ name: 'id', description: 'Workspace UUID' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 204, description: 'User removed from workspace' })
  @ApiResponse({ status: 404, description: 'Workspace or user access not found' })
  async removeUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: { userId: string; isAdmin: boolean }
  ) {
    if (!user.isAdmin) {
      const hasAccess = await this.workspacesService.checkUserAccess(id, user.userId, 'MANAGER');
      if (!hasAccess) {
        return { error: 'Access denied - Manager level required' };
      }
    }
    await this.workspacesService.removeUser(id, userId);
  }

  @Put('reorder')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Reorder workspaces' })
  @ApiResponse({ status: 200, description: 'Workspaces reordered' })
  async reorder(@Body() body: { workspaceIds: string[] }) {
    await this.workspacesService.reorder(body.workspaceIds);
    return { success: true };
  }

  // ===========================================
  // Team Invitations
  // ===========================================

  @Post(':id/invite')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Invite a user to workspace via email' })
  @ApiParam({ name: 'id', description: 'Workspace UUID' })
  @ApiResponse({ status: 201, description: 'Invitation sent successfully' })
  async inviteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { email: string; role: string; inviterName?: string; workspaceName?: string },
    @CurrentUser() user: { userId: string; isAdmin: boolean },
  ) {
    if (!user.isAdmin) {
      const hasAccess = await this.workspacesService.checkUserAccess(id, user.userId, 'MANAGER');
      if (!hasAccess) {
        return { error: 'Access denied - Manager level required' };
      }
    }
    const invite = await this.workspacesService.createInviteToken(
      id,
      body.email,
      body.role as any,
      user.userId,
    );
    return { ...invite, email: body.email, message: 'Invitation created (send email via admin/email/invite endpoint)' };
  }

  @Post('invite/accept')
  @ApiOperation({ summary: 'Accept a workspace invitation' })
  @ApiResponse({ status: 200, description: 'Invitation accepted' })
  async acceptInvite(
    @Body() body: { token: string },
    @CurrentUser() user: { userId: string },
  ) {
    return this.workspacesService.acceptInvite(body.token, user.userId);
  }

  @Get(':id/invites')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List pending invitations for workspace' })
  @ApiParam({ name: 'id', description: 'Workspace UUID' })
  @ApiResponse({ status: 200, description: 'List of pending invitations' })
  async listInvites(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; isAdmin: boolean },
  ) {
    if (!user.isAdmin) {
      const hasAccess = await this.workspacesService.checkUserAccess(id, user.userId, 'MANAGER');
      if (!hasAccess) {
        return { error: 'Access denied - Manager level required' };
      }
    }
    return this.workspacesService.listInvites(id);
  }

  @Delete(':id/invite')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a pending invitation' })
  @ApiParam({ name: 'id', description: 'Workspace UUID' })
  async revokeInvite(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { email: string },
    @CurrentUser() user: { userId: string; isAdmin: boolean },
  ) {
    if (!user.isAdmin) {
      const hasAccess = await this.workspacesService.checkUserAccess(id, user.userId, 'MANAGER');
      if (!hasAccess) {
        return { error: 'Access denied - Manager level required' };
      }
    }
    return this.workspacesService.revokeInvite(id, body.email);
  }
}
