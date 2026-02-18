import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to get the current workspace ID from the request
 * The workspace ID should be set by middleware or from user's active workspace
 */
export const CurrentWorkspace = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    
    // First check header
    let workspaceId = request.headers['x-workspace-id'];
    
    // Then check query parameter
    if (!workspaceId) {
      workspaceId = request.query?.workspaceId;
    }
    
    // Then check user's active workspace
    if (!workspaceId && request.user?.activeWorkspaceId) {
      workspaceId = request.user.activeWorkspaceId;
    }
    
    // Then check user's workspaces array (use first one)
    if (!workspaceId && request.user?.workspaces?.length > 0) {
      workspaceId = request.user.workspaces[0].id;
    }
    
    return workspaceId || '';
  },
);
