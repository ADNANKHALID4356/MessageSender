import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Patch,
  Param,
  Ip,
  Headers,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminSignupDto } from './dto/admin-signup.dto';
import { UserSignupDto } from './dto/user-signup.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginRateLimitGuard } from './guards/rate-limit.guard';
import { Throttle } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // =====================
  // ADMIN AUTH ENDPOINTS
  // =====================

  @Get('admin/exists')
  @ApiOperation({ summary: 'Check if admin account exists' })
  @ApiResponse({ status: 200, description: 'Returns whether admin exists' })
  async checkAdminExists() {
    return this.authService.checkAdminExists();
  }

  @Post('admin/signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin signup (only works if no admin exists)' })
  @ApiResponse({ status: 201, description: 'Admin created and logged in' })
  @ApiResponse({ status: 403, description: 'Admin already exists' })
  @ApiResponse({ status: 409, description: 'Username or email already taken' })
  async adminSignup(
    @Body() signupDto: AdminSignupDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.adminSignup(signupDto, ipAddress, userAgent);
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseGuards(LoginRateLimitGuard)
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  async adminLogin(
    @Body() loginDto: LoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.adminLogin(loginDto, ipAddress, userAgent);
  }

  // =====================
  // USER AUTH ENDPOINTS
  // =====================

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'User signup (requires admin approval)' })
  @ApiResponse({ status: 201, description: 'Registration successful, pending approval' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async userSignup(@Body() signupDto: UserSignupDto) {
    return this.authService.userSignup(signupDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseGuards(LoginRateLimitGuard)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  async userLogin(
    @Body() loginDto: LoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.userLogin(loginDto, ipAddress, userAgent);
  }

  // =====================
  // TOKEN ENDPOINTS
  // =====================

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto);
  }

  // =====================
  // AUTHENTICATED ENDPOINTS
  // =====================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(
    @CurrentUser() user: { userId: string; isAdmin: boolean },
  ) {
    return this.authService.getAuthUser(user.userId, user.isAdmin);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @CurrentUser() user: { userId: string; isAdmin: boolean },
    @Body() dto: UpdateProfileDto,
  ) {
    const updated = await this.authService.updateProfile(user.userId, user.isAdmin, dto);
    return updated;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@CurrentUser() user: { sessionId: string }) {
    await this.authService.logout(user.sessionId);
    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout all sessions' })
  @ApiResponse({ status: 200, description: 'All sessions logged out' })
  async logoutAll(
    @CurrentUser() user: { userId: string; isAdmin: boolean },
  ) {
    await this.authService.logoutAllSessions(user.userId, user.isAdmin);
    return { message: 'All sessions logged out successfully' };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Current password incorrect' })
  async changePassword(
    @CurrentUser() user: { userId: string; isAdmin: boolean },
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      user.userId,
      user.isAdmin,
      changePasswordDto,
    );
    return { message: 'Password changed successfully' };
  }

  // =====================
  // NOTIFICATION PREFERENCES
  // =====================

  @Get('notification-preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({ status: 200, description: 'Notification preferences retrieved' })
  async getNotificationPreferences(
    @CurrentUser() user: { userId: string; isAdmin: boolean },
  ) {
    return this.authService.getNotificationPreferences(user.userId, user.isAdmin);
  }

  @Patch('notification-preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Notification preferences updated' })
  async updateNotificationPreferences(
    @CurrentUser() user: { userId: string; isAdmin: boolean },
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.authService.updateNotificationPreferences(user.userId, user.isAdmin, dto);
  }

  // =====================
  // SESSION MANAGEMENT
  // =====================

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all active sessions for current user' })
  @ApiResponse({ status: 200, description: 'List of active sessions' })
  async getSessions(
    @CurrentUser() user: { userId: string; isAdmin: boolean; sessionId: string },
  ) {
    return this.authService.getUserSessions(user.userId, user.isAdmin, user.sessionId);
  }

  @Post('sessions/:sessionId/terminate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Terminate a specific session' })
  @ApiResponse({ status: 200, description: 'Session terminated' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async terminateSession(
    @CurrentUser() user: { userId: string; isAdmin: boolean; sessionId: string },
    @Param('sessionId') targetSessionId: string,
  ) {
    await this.authService.terminateSession(user.sessionId, targetSessionId, user.userId, user.isAdmin);
    return { message: 'Session terminated successfully' };
  }

  // =====================
  // ADMIN: USER MANAGEMENT
  // =====================

  @Get('admin/users')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (admin only)' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  async getAllUsers() {
    return this.authService.getAllUsers();
  }

  @Get('admin/users/pending')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending users awaiting approval (admin only)' })
  @ApiResponse({ status: 200, description: 'List of pending users' })
  async getPendingUsers() {
    return this.authService.getPendingUsers();
  }

  @Post('admin/users/:userId/approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a pending user (admin only)' })
  @ApiQuery({ name: 'workspaceId', required: false, description: 'Workspace to grant access' })
  @ApiQuery({ name: 'permissionLevel', required: false, description: 'Permission level: VIEW_ONLY, OPERATOR, MANAGER' })
  @ApiResponse({ status: 200, description: 'User approved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async approveUser(
    @Param('userId') userId: string,
    @Query('workspaceId') workspaceId?: string,
    @Query('permissionLevel') permissionLevel?: string,
  ) {
    return this.authService.approveUser(userId, workspaceId, permissionLevel);
  }

  @Post('admin/users/:userId/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a pending user (admin only)' })
  @ApiResponse({ status: 200, description: 'User rejected and removed' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async rejectUser(@Param('userId') userId: string) {
    return this.authService.rejectUser(userId);
  }

  @Post('admin/users/:userId/deactivate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate a user (admin only)' })
  @ApiResponse({ status: 200, description: 'User deactivated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deactivateUser(@Param('userId') userId: string) {
    return this.authService.deactivateUser(userId);
  }

  @Post('admin/users/:userId/reactivate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivate a user (admin only)' })
  @ApiResponse({ status: 200, description: 'User reactivated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async reactivateUser(@Param('userId') userId: string) {
    return this.authService.reactivateUser(userId);
  }

  @Post('admin/users/:userId/workspace-access')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Grant workspace access to a user (admin only)' })
  @ApiQuery({ name: 'workspaceId', required: true, description: 'Workspace ID' })
  @ApiQuery({ name: 'permissionLevel', required: true, description: 'Permission level: VIEW_ONLY, OPERATOR, MANAGER' })
  @ApiResponse({ status: 200, description: 'Workspace access granted' })
  async grantWorkspaceAccess(
    @Param('userId') userId: string,
    @Query('workspaceId') workspaceId: string,
    @Query('permissionLevel') permissionLevel: string,
  ) {
    return this.authService.grantWorkspaceAccess(userId, workspaceId, permissionLevel);
  }

  @Post('admin/users/:userId/workspace-access/revoke')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke workspace access from a user (admin only)' })
  @ApiQuery({ name: 'workspaceId', required: true, description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Workspace access revoked' })
  async revokeWorkspaceAccess(
    @Param('userId') userId: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.authService.revokeWorkspaceAccess(userId, workspaceId);
  }
}
