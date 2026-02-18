import { SetMetadata } from '@nestjs/common';
import { Role } from '../guards/roles.guard';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify which roles can access an endpoint.
 * Access is granted if the user's role level is >= any of the specified roles.
 * 
 * Role hierarchy (highest to lowest):
 * - SUPER_ADMIN: Full system access
 * - ADMIN: Administrative access
 * - MANAGER: Workspace management
 * - OPERATOR: Basic operations
 * - VIEW_ONLY: Read-only access
 * 
 * @example
 * // Only SUPER_ADMIN and ADMIN can access
 * @Roles('ADMIN')
 * 
 * @example
 * // MANAGER and above can access
 * @Roles('MANAGER')
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
