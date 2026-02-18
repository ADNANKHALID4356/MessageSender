import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../auth/guards/workspace.guard';
import { CurrentWorkspace } from '../auth/decorators/current-workspace.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/analytics')
@UseGuards(JwtAuthGuard, WorkspaceGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get workspace analytics overview' })
  async getOverview(@CurrentWorkspace() workspace: any) {
    return this.analyticsService.getOverview(workspace.id);
  }

  @Get('messages')
  @ApiOperation({ summary: 'Get message analytics' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getMessageStats(
    @CurrentWorkspace() workspace: any,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getMessageStats(workspace.id, days);
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Get campaign analytics' })
  async getCampaignStats(@CurrentWorkspace() workspace: any) {
    return this.analyticsService.getCampaignStats(workspace.id);
  }

  @Get('contacts')
  @ApiOperation({ summary: 'Get contact growth analytics' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getContactGrowth(
    @CurrentWorkspace() workspace: any,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getContactGrowth(workspace.id, days);
  }

  @Get('pages')
  @ApiOperation({ summary: 'Get page performance analytics' })
  async getPagePerformance(@CurrentWorkspace() workspace: any) {
    return this.analyticsService.getPagePerformance(workspace.id);
  }

  @Get('engagement')
  @ApiOperation({ summary: 'Get engagement metrics' })
  async getEngagementMetrics(@CurrentWorkspace() workspace: any) {
    return this.analyticsService.getEngagementMetrics(workspace.id);
  }
}
