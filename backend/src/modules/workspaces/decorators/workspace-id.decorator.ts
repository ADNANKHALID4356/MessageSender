import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

/**
 * Decorator to extract workspace ID from request headers
 * Expects 'x-workspace-id' header to be set
 */
export const WorkspaceId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const workspaceId = request.headers['x-workspace-id'];

    if (!workspaceId) {
      throw new BadRequestException('Workspace ID is required. Set x-workspace-id header.');
    }

    return workspaceId as string;
  },
);
