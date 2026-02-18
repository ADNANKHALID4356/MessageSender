import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * User roles from the Prisma schema
 * SUPER_ADMIN: Full system access (the main business owner)
 * ADMIN: Administrative access
 * MANAGER: Can manage workspaces they're assigned to
 * OPERATOR: Can handle conversations and basic operations
 * VIEW_ONLY: Read-only access
 */
export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEW_ONLY';

// Role hierarchy for access level comparison
const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  MANAGER: 60,
  OPERATOR: 40,
  VIEW_ONLY: 20,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required, allow access
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    // Admin users (isAdmin=true from JWT) have SUPER_ADMIN level access
    // This is the primary admin of the single-owner system
    if (user.isAdmin === true) {
      return true;
    }

    // For non-admin users, check their role from the request
    // Role can be set by JwtStrategy or by workspace-level middleware
    const userRole = user.role as Role;
    if (!userRole) {
      return false;
    }

    const userLevel = ROLE_HIERARCHY[userRole] || 0;

    // Check if user's role level is >= any of the required roles
    return requiredRoles.some((requiredRole) => {
      const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
      return userLevel >= requiredLevel;
    });
  }
}
