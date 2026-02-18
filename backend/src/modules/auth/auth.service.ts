import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AdminSignupDto } from './dto/admin-signup.dto';
import { UserSignupDto } from './dto/user-signup.dto';
import {
  AuthTokens,
  AuthUser,
  PermissionLevel,
  WorkspaceAccess,
} from '@messagesender/shared';
import { TIME, CACHE_KEYS, ERROR_CODES } from '@messagesender/shared';
import { LoginRateLimitGuard } from './guards/rate-limit.guard';

interface JwtPayload {
  sub: string;
  email: string;
  isAdmin: boolean;
  sessionId: string;
}

@Injectable()
export class AuthService {
  private readonly BCRYPT_ROUNDS = 12;
  private readonly ACCESS_TOKEN_EXPIRY: string;
  private readonly REFRESH_TOKEN_EXPIRY: number;
  private readonly REFRESH_TOKEN_REMEMBER_EXPIRY: number;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private loginRateLimitGuard: LoginRateLimitGuard,
  ) {
    this.ACCESS_TOKEN_EXPIRY = this.configService.get('JWT_EXPIRES_IN', '1h');
    this.REFRESH_TOKEN_EXPIRY = TIME.REFRESH_TOKEN_EXPIRY_SECONDS;
    this.REFRESH_TOKEN_REMEMBER_EXPIRY =
      TIME.REFRESH_TOKEN_REMEMBER_ME_SECONDS;
  }

  // =====================
  // ADMIN AUTHENTICATION
  // =====================

  async validateAdmin(
    username: string,
    password: string,
  ): Promise<AuthUser | null> {
    const admin = await this.prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName || '',
      lastName: admin.lastName || undefined,
      isAdmin: true,
    };
  }

  async adminLogin(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokens & { user: AuthUser }> {
    const admin = await this.validateAdmin(loginDto.username, loginDto.password);

    if (!admin) {
      // Record failed attempt for brute-force protection
      await this.recordLoginAttempt(ipAddress, loginDto.username, userAgent, false, 'Invalid credentials');
      throw new UnauthorizedException({
        code: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid credentials',
      });
    }

    // Clear failed attempts on success
    await this.clearLoginAttempts(ipAddress, loginDto.username);
    await this.recordLoginAttempt(ipAddress, loginDto.username, userAgent, true);

    // Update last login
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    // Create session and tokens
    const tokens = await this.createSession(
      admin.id,
      true,
      loginDto.rememberMe || false,
      ipAddress,
      userAgent,
    );

    return {
      ...tokens,
      user: admin,
    };
  }

  // =====================
  // USER AUTHENTICATION
  // =====================

  async validateUser(
    email: string,
    password: string,
  ): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        workspaceAccess: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    const workspaces: WorkspaceAccess[] = user.workspaceAccess.map(
      (access: { workspaceId: string; permissionLevel: string; workspace: { name: string } }) => ({
        workspaceId: access.workspaceId,
        workspaceName: access.workspace.name,
        permissionLevel: access.permissionLevel as unknown as PermissionLevel,
      })
    );

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName || undefined,
      isAdmin: false,
      workspaces,
    };
  }

  async userLogin(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokens & { user: AuthUser }> {
    const user = await this.validateUser(loginDto.username, loginDto.password);

    if (!user) {
      // Record failed attempt for brute-force protection
      await this.recordLoginAttempt(ipAddress, loginDto.username, userAgent, false, 'Invalid credentials');
      throw new UnauthorizedException({
        code: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid credentials',
      });
    }

    // Clear failed attempts on success
    await this.clearLoginAttempts(ipAddress, loginDto.username);
    await this.recordLoginAttempt(ipAddress, loginDto.username, userAgent, true);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create session and tokens
    const tokens = await this.createSession(
      user.id,
      false,
      loginDto.rememberMe || false,
      ipAddress,
      userAgent,
    );

    return {
      ...tokens,
      user,
    };
  }

  // =====================
  // ADMIN SIGNUP
  // =====================

  async adminSignup(
    signupDto: AdminSignupDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokens & { user: AuthUser }> {
    // Validate passwords match
    if (signupDto.password !== signupDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Check if admin already exists (only one admin allowed in single-owner system)
    const existingAdminCount = await this.prisma.admin.count();
    if (existingAdminCount > 0) {
      throw new ForbiddenException('Admin account already exists. Contact system administrator.');
    }

    // Check if username is taken
    const existingUsername = await this.prisma.admin.findUnique({
      where: { username: signupDto.username },
    });
    if (existingUsername) {
      throw new ConflictException('Username is already taken');
    }

    // Check if email is taken
    const existingEmail = await this.prisma.admin.findUnique({
      where: { email: signupDto.email },
    });
    if (existingEmail) {
      throw new ConflictException('Email is already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(signupDto.password, this.BCRYPT_ROUNDS);

    // Create admin
    const admin = await this.prisma.admin.create({
      data: {
        username: signupDto.username,
        email: signupDto.email,
        passwordHash,
        firstName: signupDto.firstName,
        lastName: signupDto.lastName,
        lastLoginAt: new Date(),
      },
    });

    // Create default workspace for the admin
    await this.prisma.workspace.create({
      data: {
        name: 'Default Workspace',
        description: 'Your first workspace',
        colorTheme: '#3B82F6',
        isActive: true,
        sortOrder: 0,
      },
    });

    const authUser: AuthUser = {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName || '',
      lastName: admin.lastName || undefined,
      isAdmin: true,
    };

    // Create session and tokens
    const tokens = await this.createSession(
      admin.id,
      true,
      false,
      ipAddress,
      userAgent,
    );

    return {
      ...tokens,
      user: authUser,
    };
  }

  async checkAdminExists(): Promise<{ exists: boolean }> {
    const count = await this.prisma.admin.count();
    return { exists: count > 0 };
  }

  // =====================
  // USER SIGNUP (WITH ADMIN APPROVAL)
  // =====================

  async userSignup(signupDto: UserSignupDto): Promise<{ message: string; userId: string }> {
    // Validate passwords match
    if (signupDto.password !== signupDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Check if email is already registered
    const existingUser = await this.prisma.user.findUnique({
      where: { email: signupDto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(signupDto.password, this.BCRYPT_ROUNDS);

    // Create user with PENDING status (requires admin approval)
    const user = await this.prisma.user.create({
      data: {
        email: signupDto.email,
        passwordHash,
        firstName: signupDto.firstName,
        lastName: signupDto.lastName,
        status: 'PENDING',
      },
    });

    return {
      message: 'Registration successful. Please wait for admin approval.',
      userId: user.id,
    };
  }

  // =====================
  // ADMIN: USER MANAGEMENT
  // =====================

  async getPendingUsers(): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
    createdAt: Date;
  }[]> {
    const users = await this.prisma.user.findMany({
      where: { status: 'PENDING' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  }

  async getAllUsers(): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
    status: string;
    createdAt: Date;
    lastLoginAt: Date | null;
    workspaces: { workspaceId: string; workspaceName: string; permissionLevel: string }[];
  }[]> {
    const users = await this.prisma.user.findMany({
      include: {
        workspaceAccess: {
          include: {
            workspace: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string | null;
      status: string;
      createdAt: Date;
      lastLoginAt: Date | null;
      workspaceAccess: {
        workspaceId: string;
        permissionLevel: string;
        workspace: { name: string };
      }[];
    }) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      workspaces: user.workspaceAccess.map((access: {
        workspaceId: string;
        permissionLevel: string;
        workspace: { name: string };
      }) => ({
        workspaceId: access.workspaceId,
        workspaceName: access.workspace.name,
        permissionLevel: access.permissionLevel,
      })),
    }));
  }

  async approveUser(userId: string, workspaceId?: string, permissionLevel?: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === 'ACTIVE') {
      throw new BadRequestException('User is already approved');
    }

    // Update user status to ACTIVE
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'ACTIVE',
        inviteAcceptedAt: new Date(),
      },
    });

    // If workspace and permission provided, grant access
    if (workspaceId) {
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
      });

      if (!workspace) {
        throw new NotFoundException('Workspace not found');
      }

      await this.prisma.workspaceUserAccess.create({
        data: {
          userId,
          workspaceId,
          permissionLevel: (permissionLevel as 'VIEW_ONLY' | 'OPERATOR' | 'MANAGER') || 'OPERATOR',
        },
      });
    }

    return { message: 'User approved successfully' };
  }

  async rejectUser(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== 'PENDING') {
      throw new BadRequestException('Only pending users can be rejected');
    }

    // Delete the user
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'User rejected and removed' };
  }

  async deactivateUser(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user status to INACTIVE
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'INACTIVE' },
    });

    // Logout all sessions for this user
    await this.logoutAllSessions(userId, false);

    return { message: 'User deactivated successfully' };
  }

  async reactivateUser(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== 'INACTIVE') {
      throw new BadRequestException('User is not inactive');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
    });

    return { message: 'User reactivated successfully' };
  }

  async grantWorkspaceAccess(
    userId: string,
    workspaceId: string,
    permissionLevel: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Upsert workspace access
    await this.prisma.workspaceUserAccess.upsert({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
      update: {
        permissionLevel: permissionLevel as 'VIEW_ONLY' | 'OPERATOR' | 'MANAGER',
      },
      create: {
        userId,
        workspaceId,
        permissionLevel: permissionLevel as 'VIEW_ONLY' | 'OPERATOR' | 'MANAGER',
      },
    });

    return { message: 'Workspace access granted successfully' };
  }

  async revokeWorkspaceAccess(userId: string, workspaceId: string): Promise<{ message: string }> {
    await this.prisma.workspaceUserAccess.delete({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });

    return { message: 'Workspace access revoked successfully' };
  }

  // =====================
  // SESSION MANAGEMENT
  // =====================

  private async createSession(
    userId: string,
    isAdmin: boolean,
    rememberMe: boolean,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokens> {
    const sessionId = uuidv4();
    const refreshToken = uuidv4();
    const expirySeconds = rememberMe
      ? this.REFRESH_TOKEN_REMEMBER_EXPIRY
      : this.REFRESH_TOKEN_EXPIRY;
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);

    // Create session in database
    await this.prisma.session.create({
      data: {
        id: sessionId,
        [isAdmin ? 'adminId' : 'userId']: userId,
        refreshToken: await bcrypt.hash(refreshToken, this.BCRYPT_ROUNDS),
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    // Generate JWT access token
    const payload: JwtPayload = {
      sub: userId,
      email: '',
      isAdmin,
      sessionId,
    };

    const accessToken = this.jwtService.sign(payload);

    // Cache session info
    await this.redisService.setJson(
      CACHE_KEYS.SESSION(sessionId),
      {
        userId,
        isAdmin,
        expiresAt: expiresAt.toISOString(),
      },
      TIME.SESSION_CACHE_TTL_SECONDS,
    );

    return {
      accessToken,
      refreshToken: `${sessionId}:${refreshToken}`,
      expiresIn: TIME.ACCESS_TOKEN_EXPIRY_SECONDS,
    };
  }

  async refreshTokens(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthTokens> {
    const [sessionId, token] = refreshTokenDto.refreshToken.split(':');

    if (!sessionId || !token) {
      throw new UnauthorizedException({
        code: ERROR_CODES.TOKEN_INVALID,
        message: 'Invalid refresh token format',
      });
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        admin: true,
        user: true,
      },
    });

    if (!session) {
      throw new UnauthorizedException({
        code: ERROR_CODES.SESSION_EXPIRED,
        message: 'Session not found',
      });
    }

    if (session.expiresAt < new Date()) {
      await this.prisma.session.delete({ where: { id: sessionId } });
      throw new UnauthorizedException({
        code: ERROR_CODES.SESSION_EXPIRED,
        message: 'Session expired',
      });
    }

    const isTokenValid = await bcrypt.compare(token, session.refreshToken);
    if (!isTokenValid) {
      throw new UnauthorizedException({
        code: ERROR_CODES.TOKEN_INVALID,
        message: 'Invalid refresh token',
      });
    }

    // Generate new tokens
    const isAdmin = !!session.adminId;
    const userId = session.adminId || session.userId;

    if (!userId) {
      throw new UnauthorizedException({
        code: ERROR_CODES.SESSION_EXPIRED,
        message: 'Invalid session',
      });
    }

    const newRefreshToken = uuidv4();
    const expiresAt = new Date(
      Date.now() + this.REFRESH_TOKEN_EXPIRY * 1000,
    );

    // Update session with new refresh token
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshToken: await bcrypt.hash(newRefreshToken, this.BCRYPT_ROUNDS),
        expiresAt,
      },
    });

    // Generate new access token
    const payload: JwtPayload = {
      sub: userId,
      email: '',
      isAdmin,
      sessionId,
    };

    const accessToken = this.jwtService.sign(payload);

    // Update cache
    await this.redisService.setJson(
      CACHE_KEYS.SESSION(sessionId),
      {
        userId,
        isAdmin,
        expiresAt: expiresAt.toISOString(),
      },
      TIME.SESSION_CACHE_TTL_SECONDS,
    );

    return {
      accessToken,
      refreshToken: `${sessionId}:${newRefreshToken}`,
      expiresIn: TIME.ACCESS_TOKEN_EXPIRY_SECONDS,
    };
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.session.delete({
      where: { id: sessionId },
    });

    await this.redisService.del(CACHE_KEYS.SESSION(sessionId));
  }

  async logoutAllSessions(userId: string, isAdmin: boolean): Promise<void> {
    const sessions = await this.prisma.session.findMany({
      where: isAdmin ? { adminId: userId } : { userId },
    });

    // Delete all sessions from database
    await this.prisma.session.deleteMany({
      where: isAdmin ? { adminId: userId } : { userId },
    });

    // Clear session cache
    for (const session of sessions) {
      await this.redisService.del(CACHE_KEYS.SESSION(session.id));
    }
  }

  /**
   * Get all active sessions for a user, marking the current one
   */
  async getUserSessions(
    userId: string,
    isAdmin: boolean,
    currentSessionId: string,
  ): Promise<{
    id: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    expiresAt: Date;
    isCurrent: boolean;
  }[]> {
    const sessions = await this.prisma.session.findMany({
      where: {
        ...(isAdmin ? { adminId: userId } : { userId }),
        expiresAt: { gt: new Date() }, // Only non-expired sessions
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map(session => ({
      ...session,
      isCurrent: session.id === currentSessionId,
    }));
  }

  /**
   * Terminate a specific session (not the current one)
   */
  async terminateSession(
    currentSessionId: string,
    targetSessionId: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<void> {
    if (currentSessionId === targetSessionId) {
      throw new BadRequestException('Cannot terminate the current session. Use logout instead.');
    }

    // Verify the target session belongs to this user
    const session = await this.prisma.session.findUnique({
      where: { id: targetSessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const sessionOwnerId = isAdmin ? session.adminId : session.userId;
    if (sessionOwnerId !== userId) {
      throw new ForbiddenException('You can only terminate your own sessions');
    }

    // Delete the session
    await this.prisma.session.delete({
      where: { id: targetSessionId },
    });

    // Clear session cache
    await this.redisService.del(CACHE_KEYS.SESSION(targetSessionId));
  }

  // =====================
  // PASSWORD MANAGEMENT
  // =====================

  async changePassword(
    userId: string,
    isAdmin: boolean,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const entity = isAdmin
      ? await this.prisma.admin.findUnique({ where: { id: userId } })
      : await this.prisma.user.findUnique({ where: { id: userId } });

    if (!entity) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      entity.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(
      changePasswordDto.newPassword,
      this.BCRYPT_ROUNDS,
    );

    if (isAdmin) {
      await this.prisma.admin.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });
    } else {
      await this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });
    }

    // Logout all other sessions
    await this.logoutAllSessions(userId, isAdmin);
  }

  // =====================
  // PROFILE UPDATE
  // =====================

  async updateProfile(
    userId: string,
    isAdmin: boolean,
    data: { name?: string; email?: string; username?: string },
  ) {
    if (isAdmin) {
      const updateData: Record<string, string> = {};
      if (data.name) {
        const [firstName, ...rest] = data.name.split(' ');
        updateData.firstName = firstName;
        if (rest.length > 0) updateData.lastName = rest.join(' ');
      }
      if (data.email) updateData.email = data.email;
      if (data.username) updateData.username = data.username;

      const admin = await this.prisma.admin.update({
        where: { id: userId },
        data: updateData,
        select: { id: true, email: true, firstName: true, lastName: true, username: true },
      });
      return admin;
    } else {
      const updateData: Record<string, string> = {};
      if (data.name) {
        const [firstName, ...rest] = data.name.split(' ');
        updateData.firstName = firstName;
        if (rest.length > 0) updateData.lastName = rest.join(' ');
      }
      if (data.email) updateData.email = data.email;

      const user = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: { id: true, email: true, firstName: true, lastName: true },
      });
      return user;
    }
  }

  // =====================
  // NOTIFICATION PREFERENCES
  // =====================

  async getNotificationPreferences(userId: string, isAdmin: boolean): Promise<Record<string, any>> {
    const defaultPrefs = {
      email: {
        newMessage: true,
        campaignComplete: true,
        weeklyReport: true,
        securityAlerts: true,
      },
      push: {
        messages: true,
        mentions: true,
        updates: true,
      },
    };

    if (isAdmin) {
      const admin = await this.prisma.admin.findUnique({
        where: { id: userId },
        select: { notificationPreferences: true },
      });
      if (!admin) throw new NotFoundException('Admin not found');
      return (admin.notificationPreferences as Record<string, any>) || defaultPrefs;
    } else {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { notificationPreferences: true },
      });
      if (!user) throw new NotFoundException('User not found');
      return (user.notificationPreferences as Record<string, any>) || defaultPrefs;
    }
  }

  async updateNotificationPreferences(
    userId: string,
    isAdmin: boolean,
    preferences: Record<string, any>,
  ): Promise<Record<string, any>> {
    // Merge with existing preferences
    const current = await this.getNotificationPreferences(userId, isAdmin);
    const merged = {
      email: { ...current.email, ...preferences.email },
      push: { ...current.push, ...preferences.push },
    };

    if (isAdmin) {
      await this.prisma.admin.update({
        where: { id: userId },
        data: { notificationPreferences: merged },
      });
    } else {
      await this.prisma.user.update({
        where: { id: userId },
        data: { notificationPreferences: merged },
      });
    }

    return merged;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.BCRYPT_ROUNDS);
  }

  // =====================
  // VALIDATION
  // =====================

  async validateSession(sessionId: string): Promise<{
    userId: string;
    isAdmin: boolean;
  } | null> {
    // Check cache first
    const cached = await this.redisService.getJson<{
      userId: string;
      isAdmin: boolean;
      expiresAt: string;
    }>(CACHE_KEYS.SESSION(sessionId));

    if (cached) {
      if (new Date(cached.expiresAt) > new Date()) {
        return { userId: cached.userId, isAdmin: cached.isAdmin };
      }
    }

    // Fallback to database
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await this.prisma.session.delete({ where: { id: sessionId } });
      }
      return null;
    }

    const userId = session.adminId || session.userId;
    const isAdmin = !!session.adminId;

    if (!userId) {
      return null;
    }

    // Update cache
    await this.redisService.setJson(
      CACHE_KEYS.SESSION(sessionId),
      {
        userId,
        isAdmin,
        expiresAt: session.expiresAt.toISOString(),
      },
      TIME.SESSION_CACHE_TTL_SECONDS,
    );

    return { userId, isAdmin };
  }

  async getAuthUser(userId: string, isAdmin: boolean): Promise<AuthUser | null> {
    if (isAdmin) {
      const admin = await this.prisma.admin.findUnique({
        where: { id: userId },
      });

      if (!admin) return null;

      // Admin has access to ALL workspaces (single-owner system)
      const allWorkspaces = await this.prisma.workspace.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      const workspaces: WorkspaceAccess[] = allWorkspaces.map(w => ({
        workspaceId: w.id,
        workspaceName: w.name,
        permissionLevel: 'MANAGER' as unknown as PermissionLevel,
      }));

      return {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName || '',
        lastName: admin.lastName || undefined,
        isAdmin: true,
        workspaces,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        workspaceAccess: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!user) return null;

    const workspaces: WorkspaceAccess[] = user.workspaceAccess.map(
      (access: { workspaceId: string; permissionLevel: string; workspace: { name: string } }) => ({
        workspaceId: access.workspaceId,
        workspaceName: access.workspace.name,
        permissionLevel: access.permissionLevel as unknown as PermissionLevel,
      })
    );

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName || undefined,
      isAdmin: false,
      workspaces,
    };
  }

  // =====================
  // BRUTE-FORCE HELPERS
  // =====================

  /**
   * Record a login attempt (success or failure) to LoginAttempt table and Redis
   */
  private async recordLoginAttempt(
    ip?: string,
    identifier?: string,
    userAgent?: string,
    success: boolean = false,
    failReason?: string,
  ): Promise<void> {
    try {
      if (!success && ip && identifier) {
        await this.loginRateLimitGuard.recordFailedAttempt(ip, identifier);
      }
      await this.prisma.loginAttempt.create({
        data: {
          identifier: identifier || 'unknown',
          ipAddress: ip || 'unknown',
          userAgent: userAgent || null,
          success,
          failReason: failReason || null,
        },
      });
    } catch (err) {
      // Non-critical — don't block login flow
    }
  }

  /**
   * Clear Redis rate-limit counter on successful login
   */
  private async clearLoginAttempts(ip?: string, identifier?: string): Promise<void> {
    try {
      if (ip && identifier) {
        await this.loginRateLimitGuard.clearAttempts(ip, identifier);
      }
    } catch (err) {
      // Non-critical
    }
  }
}
