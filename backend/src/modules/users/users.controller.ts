import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all team members' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll({ page, limit, status, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team member details' })
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id/workspace-access')
  @ApiOperation({ summary: 'Update user workspace access' })
  async updateWorkspaceAccess(
    @Param('id') userId: string,
    @Body() body: { workspaceId: string; permissionLevel: string },
  ) {
    await this.usersService.updateWorkspaceAccess(userId, body.workspaceId, body.permissionLevel);
    return { success: true };
  }

  @Delete(':id/workspace-access/:workspaceId')
  @ApiOperation({ summary: 'Remove user workspace access' })
  async removeWorkspaceAccess(
    @Param('id') userId: string,
    @Param('workspaceId') workspaceId: string,
  ) {
    await this.usersService.removeWorkspaceAccess(userId, workspaceId);
    return { success: true };
  }

  @Put(':id/reset-password')
  @ApiOperation({ summary: 'Reset user password (admin only)' })
  async resetPassword(
    @Param('id') userId: string,
    @Body() body: { newPassword: string },
  ) {
    // Hash password before sending — import bcrypt
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash(body.newPassword, 12);
    await this.usersService.resetPassword(userId, hash);
    return { success: true };
  }

  @Get(':id/sessions')
  @ApiOperation({ summary: 'Get user active sessions' })
  async getUserSessions(@Param('id') userId: string) {
    return this.usersService.getUserSessions(userId);
  }

  @Delete(':id/sessions/:sessionId')
  @ApiOperation({ summary: 'Terminate a user session' })
  async terminateSession(@Param('sessionId') sessionId: string) {
    await this.usersService.terminateSession(sessionId);
    return { success: true };
  }

  @Delete(':id/sessions')
  @ApiOperation({ summary: 'Terminate all user sessions' })
  async terminateAllSessions(@Param('id') userId: string) {
    await this.usersService.terminateAllSessions(userId);
    return { success: true };
  }
}
