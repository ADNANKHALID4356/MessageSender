import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface UserListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface UserWithAccess {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  avatarUrl: string | null;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  workspaceAccess: {
    workspaceId: string;
    workspaceName: string;
    permissionLevel: string;
  }[];
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all users with their workspace access
   */
  async findAll(params: UserListParams): Promise<{ data: UserWithAccess[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          workspaceAccess: {
            include: {
              workspace: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const data: UserWithAccess[] = users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      avatarUrl: u.avatarUrl,
      status: u.status,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      workspaceAccess: u.workspaceAccess.map((wa) => ({
        workspaceId: wa.workspace.id,
        workspaceName: wa.workspace.name,
        permissionLevel: wa.permissionLevel,
      })),
    }));

    return { data, total };
  }

  /**
   * Get a single user with full details
   */
  async findById(id: string): Promise<UserWithAccess> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        workspaceAccess: {
          include: {
            workspace: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      workspaceAccess: user.workspaceAccess.map((wa) => ({
        workspaceId: wa.workspace.id,
        workspaceName: wa.workspace.name,
        permissionLevel: wa.permissionLevel,
      })),
    };
  }

  /**
   * Update user workspace access (assign/change permission)
   */
  async updateWorkspaceAccess(
    userId: string,
    workspaceId: string,
    permissionLevel: string,
  ): Promise<void> {
    // Verify user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    // Verify workspace exists
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundException(`Workspace ${workspaceId} not found`);

    await this.prisma.workspaceUserAccess.upsert({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
      create: {
        workspaceId,
        userId,
        permissionLevel: permissionLevel as any,
      },
      update: {
        permissionLevel: permissionLevel as any,
      },
    });

    this.logger.log(`Updated workspace access for user ${userId} in workspace ${workspaceId}`);
  }

  /**
   * Remove user workspace access
   */
  async removeWorkspaceAccess(userId: string, workspaceId: string): Promise<void> {
    await this.prisma.workspaceUserAccess.deleteMany({
      where: { userId, workspaceId },
    });
    this.logger.log(`Removed workspace access for user ${userId} from workspace ${workspaceId}`);
  }

  /**
   * Reset a user's password (admin action)
   */
  async resetPassword(userId: string, newPasswordHash: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate all sessions for this user
    await this.prisma.session.deleteMany({ where: { userId } });
    this.logger.log(`Password reset for user ${userId}, all sessions invalidated`);
  }

  /**
   * Get active sessions for a user
   */
  async getUserSessions(userId: string) {
    return this.prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
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
  }

  /**
   * Terminate a specific session
   */
  async terminateSession(sessionId: string): Promise<void> {
    await this.prisma.session.delete({ where: { id: sessionId } }).catch(() => {
      throw new NotFoundException(`Session ${sessionId} not found`);
    });
  }

  /**
   * Terminate all sessions for a user
   */
  async terminateAllSessions(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }
}
