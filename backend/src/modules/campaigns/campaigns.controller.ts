import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { DripCampaignService } from './drip-campaign.service';
import { AbTestingService } from './ab-testing.service';
import { TriggerCampaignService } from './trigger-campaign.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignListQueryDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentWorkspace } from '../auth/decorators';

@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly dripService: DripCampaignService,
    private readonly abTestingService: AbTestingService,
    private readonly triggerService: TriggerCampaignService,
  ) {}

  // ===========================================
  // CRUD Endpoints
  // ===========================================

  /**
   * Create a new campaign
   */
  @Post()
  @Roles('MANAGER')
  async create(
    @CurrentWorkspace() workspaceId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.campaignsService.create(workspaceId, userId, dto);
  }

  /**
   * Get all campaigns
   */
  @Get()
  @Roles('VIEW_ONLY')
  async findAll(
    @CurrentWorkspace() workspaceId: string,
    @Query() query: CampaignListQueryDto,
  ) {
    return this.campaignsService.findAll(workspaceId, query);
  }

  /**
   * Get campaign by ID
   */
  @Get(':id')
  @Roles('VIEW_ONLY')
  async findById(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.campaignsService.findById(workspaceId, id);
  }

  /**
   * Update a campaign
   */
  @Put(':id')
  @Roles('MANAGER')
  async update(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(workspaceId, id, dto);
  }

  /**
   * Delete a campaign
   */
  @Delete(':id')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    await this.campaignsService.delete(workspaceId, id);
  }

  /**
   * Duplicate a campaign
   */
  @Post(':id/duplicate')
  @Roles('MANAGER')
  async duplicate(
    @CurrentWorkspace() workspaceId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.campaignsService.duplicate(workspaceId, id, userId);
  }

  // ===========================================
  // Campaign Actions
  // ===========================================

  /**
   * Launch/start a campaign
   */
  @Post(':id/launch')
  @Roles('MANAGER')
  async launch(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.campaignsService.launch(workspaceId, id);
  }

  /**
   * Schedule a campaign
   */
  @Post(':id/schedule')
  @Roles('MANAGER')
  async schedule(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
    @Body('scheduledAt') scheduledAt: string,
  ) {
    return this.campaignsService.schedule(workspaceId, id, new Date(scheduledAt));
  }

  /**
   * Pause a running campaign
   */
  @Post(':id/pause')
  @Roles('MANAGER')
  async pause(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.campaignsService.pause(workspaceId, id);
  }

  /**
   * Resume a paused campaign
   */
  @Post(':id/resume')
  @Roles('MANAGER')
  async resume(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.campaignsService.resume(workspaceId, id);
  }

  /**
   * Cancel a campaign
   */
  @Post(':id/cancel')
  @Roles('MANAGER')
  async cancel(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.campaignsService.cancel(workspaceId, id);
  }

  // ===========================================
  // Statistics
  // ===========================================

  /**
   * Get campaign statistics
   */
  @Get(':id/stats')
  @Roles('VIEW_ONLY')
  async getStats(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.campaignsService.getStats(workspaceId, id);
  }

  /**
   * Get campaign progress
   */
  @Get(':id/progress')
  @Roles('VIEW_ONLY')
  async getProgress(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.campaignsService.getProgress(workspaceId, id);
  }

  // ===========================================
  // Drip Campaign Endpoints
  // ===========================================

  /**
   * Launch a drip campaign
   */
  @Post(':id/drip/launch')
  @Roles('MANAGER')
  async launchDrip(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.dripService.launchDripCampaign(workspaceId, id);
  }

  /**
   * Get drip campaign progress overview
   */
  @Get(':id/drip/progress')
  @Roles('VIEW_ONLY')
  async getDripProgress(@Param('id') id: string) {
    return this.dripService.getCampaignDripProgress(id);
  }

  /**
   * Get drip progress for a specific contact
   */
  @Get(':id/drip/contact/:contactId')
  @Roles('VIEW_ONLY')
  async getDripContactProgress(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
  ) {
    return this.dripService.getContactProgress(id, contactId);
  }

  /**
   * Remove a contact from drip sequence
   */
  @Delete(':id/drip/contact/:contactId')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDripContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
  ) {
    await this.dripService.removeContactFromDrip(id, contactId);
  }

  // ===========================================
  // A/B Testing Endpoints
  // ===========================================

  /**
   * Launch an A/B test campaign
   */
  @Post(':id/ab-test/launch')
  @Roles('MANAGER')
  async launchAbTest(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.abTestingService.launchAbTest(workspaceId, id);
  }

  /**
   * Get A/B test results
   */
  @Get(':id/ab-test/results')
  @Roles('VIEW_ONLY')
  async getAbTestResults(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.abTestingService.getAbTestResults(workspaceId, id);
  }

  /**
   * Send winning variant to remaining audience
   */
  @Post(':id/ab-test/send-winner')
  @Roles('MANAGER')
  async sendWinnerToRemaining(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.abTestingService.sendWinnerToRemaining(workspaceId, id);
  }

  // ===========================================
  // Trigger Campaign Endpoints
  // ===========================================

  /**
   * Activate a trigger campaign
   */
  @Post(':id/trigger/activate')
  @Roles('MANAGER')
  async activateTrigger(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    await this.triggerService.activateTrigger(workspaceId, id);
    return { message: 'Trigger campaign activated' };
  }

  /**
   * Deactivate a trigger campaign
   */
  @Post(':id/trigger/deactivate')
  @Roles('MANAGER')
  async deactivateTrigger(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    await this.triggerService.deactivateTrigger(workspaceId, id);
    return { message: 'Trigger campaign deactivated' };
  }

  /**
   * Get trigger campaign stats
   */
  @Get(':id/trigger/stats')
  @Roles('VIEW_ONLY')
  async getTriggerStats(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.triggerService.getTriggerStats(workspaceId, id);
  }

  /**
   * Get all active triggers for workspace
   */
  @Get('triggers/active')
  @Roles('VIEW_ONLY')
  async getActiveTriggers(
    @CurrentWorkspace() workspaceId: string,
  ) {
    return this.triggerService.getActiveTriggers(workspaceId);
  }
}
