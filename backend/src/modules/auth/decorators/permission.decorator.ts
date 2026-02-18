import { SetMetadata } from '@nestjs/common';
import { PermissionLevel } from '@messagesender/shared';

export const PERMISSION_KEY = 'permission';
export const RequirePermission = (permission: PermissionLevel) =>
  SetMetadata(PERMISSION_KEY, permission);
