import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';
import { PERMISSION_KEY } from '../decorators/permission.decorator';
import { PermissionLevel } from '@messagesender/shared';

const PERMISSION_HIERARCHY: Record<PermissionLevel, number> = {
  [PermissionLevel.VIEW_ONLY]: 1,
  [PermissionLevel.OPERATOR]: 2,
  [PermissionLevel.MANAGER]: 3,
};

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Admin has full access
    if (user?.isAdmin) {
      return true;
    }

    // Get workspace ID from params, query, or header
    const workspaceId =
      request.params.workspaceId ||
      request.query.workspaceId ||
      request.headers['x-workspace-id'];

    if (!workspaceId) {
      throw new ForbiddenException('Workspace ID is required');
    }

    // Get required permission level
    const requiredPermission = this.reflector.get<PermissionLevel>(
      PERMISSION_KEY,
      context.getHandler(),
    );

    // Check user's access to workspace
    const access = await this.prisma.workspaceUserAccess.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.userId,
        },
      },
    });

    if (!access) {
      throw new ForbiddenException('No access to this workspace');
    }

    // If no specific permission required, just check access exists
    if (!requiredPermission) {
      return true;
    }

    // Check permission level
    const userLevel = PERMISSION_HIERARCHY[access.permissionLevel as PermissionLevel];
    const requiredLevel = PERMISSION_HIERARCHY[requiredPermission];

    if (userLevel < requiredLevel) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Attach workspace access to request for later use
    request.workspaceAccess = access;

    return true;
  }
}
