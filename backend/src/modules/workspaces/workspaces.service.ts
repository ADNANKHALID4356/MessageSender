import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto, AssignUserDto } from './dto';

const MAX_WORKSPACES = 5;

// Permission levels from Prisma schema
type PermissionLevel = 'VIEW_ONLY' | 'OPERATOR' | 'MANAGER';

@Injectable()
export class WorkspacesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new workspace
   */
  async create(dto: CreateWorkspaceDto) {
    // Check workspace limit
    const count = await this.prisma.workspace.count();
    if (count >= MAX_WORKSPACES) {
      throw new BadRequestException(
        `Maximum of ${MAX_WORKSPACES} workspaces allowed. Please contact the developer to expand.`
      );
    }

    // Get next sort order
    const maxOrder = await this.prisma.workspace.aggregate({
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    return this.prisma.workspace.create({
      data: {
        name: dto.name,
        description: dto.description,
        logoUrl: dto.logoUrl,
        colorTheme: dto.colorTheme || '#3B82F6',
        sortOrder: nextOrder,
      },
    });
  }

  /**
   * Get all workspaces (for admin) - returns paginated format matching frontend expectations
   */
  async findAll() {
    return this.prisma.workspace.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Get all workspaces in paginated response format
   * Frontend expects: { data: Workspace[], meta: { total, page, limit, totalPages } }
   */
  async findAllPaginated(page = 1, limit = 10) {
    const workspaces = await this.prisma.workspace.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            pages: true,
            contacts: true,
          },
        },
      },
    });

    // Map to the format frontend expects (with `status` field derived from `isActive`)
    const mappedWorkspaces = workspaces.map(w => ({
      ...w,
      status: w.isActive ? 'active' : 'inactive',
    }));

    return {
      data: mappedWorkspaces,
      meta: {
        total: mappedWorkspaces.length,
        page,
        limit,
        totalPages: Math.ceil(mappedWorkspaces.length / limit),
      },
    };
  }

  /**
   * Get workspaces accessible by a user - returns paginated format
   */
  async findByUserPaginated(userId: string, page = 1, limit = 10) {
    const accessRecords = await this.prisma.workspaceUserAccess.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            _count: {
              select: {
                pages: true,
                contacts: true,
              },
            },
          },
        },
      },
      orderBy: { workspace: { sortOrder: 'asc' } },
    });

    const workspaces = accessRecords.map(a => ({
      ...a.workspace,
      status: a.workspace.isActive ? 'active' : 'inactive',
    }));

    return {
      data: workspaces,
      meta: {
        total: workspaces.length,
        page,
        limit,
        totalPages: Math.ceil(workspaces.length / limit),
      },
    };
  }

  /**
   * Get workspaces accessible by a user
   */
  async findByUser(userId: string) {
    return this.prisma.workspaceUserAccess.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { workspace: { sortOrder: 'asc' } },
    });
  }

  /**
   * Get workspace by ID
   */
  async findById(id: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }

    return workspace;
  }

  /**
   * Get workspace with full details (stats, pages, etc.)
   */
  async findByIdWithDetails(id: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        facebookAccounts: {
          include: {
            pages: true,
          },
        },
        userAccess: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            contacts: true,
            segments: true,
            campaigns: true,
            conversations: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }

    return workspace;
  }

  /**
   * Update workspace
   */
  async update(id: string, dto: UpdateWorkspaceDto) {
    await this.findById(id); // Verify exists

    return this.prisma.workspace.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Delete workspace (soft delete by deactivating)
   */
  async deactivate(id: string) {
    await this.findById(id);

    return this.prisma.workspace.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Permanently delete workspace
   * Warning: This will cascade delete all related data
   */
  async delete(id: string): Promise<void> {
    await this.findById(id);

    await this.prisma.workspace.delete({
      where: { id },
    });
  }

  /**
   * Assign user to workspace
   */
  async assignUser(workspaceId: string, dto: AssignUserDto) {
    await this.findById(workspaceId);

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    // Upsert user access
    return this.prisma.workspaceUserAccess.upsert({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: dto.userId,
        },
      },
      create: {
        workspaceId,
        userId: dto.userId,
        permissionLevel: dto.permissionLevel as PermissionLevel,
      },
      update: {
        permissionLevel: dto.permissionLevel as PermissionLevel,
      },
    });
  }

  /**
   * Remove user from workspace
   */
  async removeUser(workspaceId: string, userId: string): Promise<void> {
    await this.findById(workspaceId);

    const access = await this.prisma.workspaceUserAccess.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!access) {
      throw new NotFoundException('User is not assigned to this workspace');
    }

    await this.prisma.workspaceUserAccess.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });
  }

  /**
   * Check if user has access to workspace
   */
  async checkUserAccess(
    workspaceId: string,
    userId: string,
    requiredLevel?: PermissionLevel
  ): Promise<boolean> {
    const access = await this.prisma.workspaceUserAccess.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!access) return false;

    if (requiredLevel) {
      const levels = ['VIEW_ONLY', 'OPERATOR', 'MANAGER'];
      const userLevelIndex = levels.indexOf(access.permissionLevel);
      const requiredIndex = levels.indexOf(requiredLevel);
      return userLevelIndex >= requiredIndex;
    }

    return true;
  }

  /**
   * Get workspace statistics
   */
  async getStats(workspaceId: string) {
    await this.findById(workspaceId);

    const [
      totalContacts,
      totalConversations,
      totalCampaigns,
      activeCampaigns,
      totalPages,
      messageStats,
    ] = await Promise.all([
      this.prisma.contact.count({ where: { workspaceId } }),
      this.prisma.conversation.count({ where: { workspaceId } }),
      this.prisma.campaign.count({ where: { workspaceId } }),
      this.prisma.campaign.count({
        where: { workspaceId, status: 'RUNNING' },
      }),
      this.prisma.page.count({ where: { workspaceId, isActive: true } }),
      this.prisma.message.groupBy({
        by: ['direction'],
        where: {
          conversation: { workspaceId },
        },
        _count: true,
      }),
    ]);

    const inbound = messageStats.find((s: { direction: string; _count: number }) => s.direction === 'INBOUND')?._count || 0;
    const outbound = messageStats.find((s: { direction: string; _count: number }) => s.direction === 'OUTBOUND')?._count || 0;

    return {
      totalContacts,
      totalConversations,
      totalCampaigns,
      activeCampaigns,
      totalPages,
      messagesInbound: inbound,
      messagesOutbound: outbound,
      messagesTotal: inbound + outbound,
    };
  }

  /**
   * Reorder workspaces
   */
  async reorder(workspaceIds: string[]): Promise<void> {
    const updates = workspaceIds.map((id, index) =>
      this.prisma.workspace.update({
        where: { id },
        data: { sortOrder: index },
      })
    );

    await this.prisma.$transaction(updates);
  }

  // ===========================================
  // Team Invitations
  // ===========================================

  /**
   * Generate an invite token and store in SystemSetting
   */
  async createInviteToken(
    workspaceId: string,
    email: string,
    role: PermissionLevel,
    inviterId: string,
  ): Promise<{ token: string; expiresAt: string }> {
    await this.findById(workspaceId);

    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    // Build invitation record
    const invite = {
      token,
      workspaceId,
      email,
      role,
      inviterId,
      expiresAt,
      createdAt: new Date().toISOString(),
      status: 'pending' as const,
    };

    // Store in SystemSetting (array of invites per workspace)
    const key = `workspace_invites_${workspaceId}`;
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    const invites = setting ? (setting.value as unknown as any[]) : [];
    invites.push(invite);

    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: invites as any },
      update: { value: invites as any },
    });

    return { token, expiresAt };
  }

  /**
   * Accept an invitation token
   */
  async acceptInvite(token: string, userId: string): Promise<{ workspaceId: string; role: string }> {
    // Find the invite across all workspaces
    const settings = await this.prisma.systemSetting.findMany({
      where: { key: { startsWith: 'workspace_invites_' } },
    });

    for (const setting of settings) {
      const invites = setting.value as unknown as any[];
      const inviteIdx = invites.findIndex(
        (i: any) => i.token === token && i.status === 'pending',
      );

      if (inviteIdx >= 0) {
        const invite = invites[inviteIdx];

        // Check expiry
        if (new Date(invite.expiresAt) < new Date()) {
          invites[inviteIdx].status = 'expired';
          await this.prisma.systemSetting.update({
            where: { key: setting.key },
            data: { value: invites as any },
          });
          throw new BadRequestException('Invitation has expired');
        }

        // Assign user to workspace
        await this.prisma.workspaceUserAccess.upsert({
          where: {
            workspaceId_userId: {
              workspaceId: invite.workspaceId,
              userId,
            },
          },
          create: {
            workspaceId: invite.workspaceId,
            userId,
            permissionLevel: invite.role,
          },
          update: {
            permissionLevel: invite.role,
          },
        });

        // Mark invite as accepted
        invites[inviteIdx].status = 'accepted';
        invites[inviteIdx].acceptedAt = new Date().toISOString();
        invites[inviteIdx].acceptedBy = userId;
        await this.prisma.systemSetting.update({
          where: { key: setting.key },
          data: { value: invites as any },
        });

        return { workspaceId: invite.workspaceId, role: invite.role };
      }
    }

    throw new NotFoundException('Invalid or expired invitation token');
  }

  /**
   * List pending invites for a workspace
   */
  async listInvites(workspaceId: string): Promise<any[]> {
    const key = `workspace_invites_${workspaceId}`;
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (!setting) return [];
    const invites = setting.value as unknown as any[];
    return invites
      .filter((i: any) => i.status === 'pending' && new Date(i.expiresAt) > new Date())
      .map(({ token, ...rest }: any) => ({ ...rest, tokenPreview: token.substring(0, 8) + '...' }));
  }

  /**
   * Revoke a pending invite
   */
  async revokeInvite(workspaceId: string, email: string): Promise<{ success: boolean }> {
    const key = `workspace_invites_${workspaceId}`;
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (!setting) return { success: false };

    const invites = setting.value as unknown as any[];
    const idx = invites.findIndex(
      (i: any) => i.email === email && i.status === 'pending',
    );

    if (idx >= 0) {
      invites[idx].status = 'revoked';
      await this.prisma.systemSetting.update({
        where: { key },
        data: { value: invites as any },
      });
      return { success: true };
    }
    return { success: false };
  }
}
