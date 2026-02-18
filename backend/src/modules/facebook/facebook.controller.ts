import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { FacebookService } from './facebook.service';
import { InitiateOAuthDto, ConnectPageDto, RefreshTokenDto } from './dto';

@ApiTags('facebook')
@Controller('facebook')
export class FacebookController {
  constructor(private readonly facebookService: FacebookService) {}

  @Post('oauth/initiate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Initiate Facebook OAuth flow' })
  @ApiResponse({ status: 200, description: 'Returns authorization URL' })
  async initiateOAuth(
    @Body() dto: InitiateOAuthDto,
    @CurrentUser() user: { userId: string }
  ) {
    const authUrl = await this.facebookService.initiateOAuth(dto, user.userId);
    return { authUrl };
  }

  @Get('callback')
  @Public()
  @ApiOperation({ summary: 'Facebook OAuth callback endpoint' })
  @ApiQuery({ name: 'code', description: 'Authorization code from Facebook' })
  @ApiQuery({ name: 'state', description: 'State parameter for validation' })
  @ApiResponse({ status: 302, description: 'Redirects to app after processing' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response
  ) {
    // Get frontend URL (handle comma-separated list - use first URL)
    const frontendUrlRaw = process.env.FRONTEND_URL || 'http://localhost:3000';
    const frontendUrl = frontendUrlRaw.split(',')[0].trim();

    // Handle OAuth errors
    if (error) {
      const errorUrl = `${frontendUrl}/settings?tab=integrations&error=${encodeURIComponent(error)}&message=${encodeURIComponent(errorDescription || '')}`;
      return res.redirect(errorUrl);
    }

    try {
      const result = await this.facebookService.handleCallback(code, state);

      // Redirect to frontend settings page with success
      const successUrl = `${frontendUrl}/settings?tab=integrations&success=true&facebookAccountId=${result.facebookAccountId}`;
      return res.redirect(successUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const errorUrl = `${frontendUrl}/settings?tab=integrations&error=oauth_failed&message=${encodeURIComponent(errorMessage)}`;
      return res.redirect(errorUrl);
    }
  }

  @Get('workspaces/:workspaceId/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VIEW_ONLY')
  @ApiOperation({ summary: 'Get Facebook connection status for workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace UUID' })
  @ApiResponse({ status: 200, description: 'Connection status' })
  async getConnectionStatus(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string
  ) {
    return this.facebookService.getConnectionStatus(workspaceId);
  }

  @Get('accounts/:accountId/pages')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Get available Facebook pages' })
  @ApiParam({ name: 'accountId', description: 'Facebook Account UUID' })
  @ApiResponse({ status: 200, description: 'List of available pages' })
  async getAvailablePages(
    @Param('accountId', ParseUUIDPipe) accountId: string
  ) {
    return this.facebookService.getAvailablePages(accountId);
  }

  @Post('workspaces/:workspaceId/pages')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Connect a Facebook page to workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace UUID' })
  @ApiResponse({ status: 201, description: 'Page connected successfully' })
  async connectPage(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: ConnectPageDto
  ) {
    return this.facebookService.connectPage(workspaceId, dto);
  }

  @Delete('workspaces/:workspaceId/pages/:pageId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect a Facebook page' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace UUID' })
  @ApiParam({ name: 'pageId', description: 'Page UUID' })
  @ApiResponse({ status: 204, description: 'Page disconnected' })
  async disconnectPage(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('pageId', ParseUUIDPipe) pageId: string
  ) {
    await this.facebookService.disconnectPage(workspaceId, pageId);
  }

  @Delete('workspaces/:workspaceId/disconnect')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect Facebook account from workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace UUID' })
  @ApiResponse({ status: 204, description: 'Account disconnected' })
  async disconnectAccount(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string
  ) {
    await this.facebookService.disconnectAccount(workspaceId);
  }

  @Post('accounts/:accountId/refresh')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Refresh Facebook access token' })
  @ApiParam({ name: 'accountId', description: 'Facebook Account UUID' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  async refreshToken(@Param('accountId', ParseUUIDPipe) accountId: string) {
    return this.facebookService.refreshToken(accountId);
  }

  // DEVELOPMENT/MOCK ENDPOINTS - Only available when FACEBOOK_MOCK_MODE=true
  @Post('mock/connect')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  @ApiOperation({ summary: '[DEV ONLY] Mock Facebook connection for testing' })
  @ApiResponse({ status: 200, description: 'Mock connection created' })
  async mockConnect(
    @Body() dto: { workspaceId: string },
    @CurrentUser() user: { userId: string }
  ) {
    const mockMode = process.env.FACEBOOK_MOCK_MODE === 'true';
    if (!mockMode) {
      throw new BadRequestException('Mock mode is not enabled');
    }
    return this.facebookService.createMockConnection(dto.workspaceId, user.userId);
  }
}
