import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendApiService } from './send-api.service';
import { OtnService } from './otn.service';
import { RecurringNotificationService } from './recurring-notification.service';
import { ComplianceService } from './compliance.service';
import { SponsoredMessageService } from './sponsored-message.service';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto, UpdateTemplateDto, CreateCannedResponseDto, UpdateCannedResponseDto } from './dto/template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';
import {
  SendMessageDto,
  SendQuickMessageDto,
  MessageListQueryDto,
  ContactMessagesQueryDto,
} from './dto';

@Controller('messages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MessagesController {
  constructor(
    private messagesService: MessagesService,
    private sendApiService: SendApiService,
    private otnService: OtnService,
    private recurringService: RecurringNotificationService,
    private complianceService: ComplianceService,
    private sponsoredMessageService: SponsoredMessageService,
    private templatesService: TemplatesService,
  ) {}

  @Post()
  @Roles('OPERATOR')
  async sendMessage(
    @WorkspaceId() workspaceId: string,
    @Request() req: { user: { id: string } },
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(workspaceId, req.user.id, dto);
  }

  @Post('quick')
  @Roles('OPERATOR')
  async sendQuickMessage(
    @WorkspaceId() workspaceId: string,
    @Request() req: { user: { id: string } },
    @Body() dto: SendQuickMessageDto,
  ) {
    return this.messagesService.sendQuickMessage(workspaceId, req.user.id, dto);
  }

  @Get()
  @Roles('VIEW_ONLY')
  async getMessages(
    @WorkspaceId() workspaceId: string,
    @Query() query: MessageListQueryDto,
  ) {
    return this.messagesService.getMessages(workspaceId, query);
  }

  @Get('stats')
  @Roles('VIEW_ONLY')
  async getStats(
    @WorkspaceId() workspaceId: string,
    @Query('days') days?: string,
  ) {
    return this.messagesService.getStats(workspaceId, days ? parseInt(days) : 30);
  }

  @Get('contact/:contactId')
  @Roles('VIEW_ONLY')
  async getContactMessages(
    @WorkspaceId() workspaceId: string,
    @Param('contactId') contactId: string,
    @Query() query: ContactMessagesQueryDto,
  ) {
    return this.messagesService.getContactMessages(workspaceId, contactId, query);
  }

  @Get('window-status/:contactId/:pageId')
  @Roles('VIEW_ONLY')
  async getWindowStatus(
    @Param('contactId') contactId: string,
    @Param('pageId') pageId: string,
  ) {
    return this.sendApiService.getWindowStatus(contactId, pageId);
  }

  // ==========================================
  // MESSAGE TEMPLATE ENDPOINTS
  // ==========================================

  @Get('templates/categories')
  @Roles('VIEW_ONLY')
  async getTemplateCategories(@WorkspaceId() workspaceId: string) {
    return this.templatesService.getTemplateCategories(workspaceId);
  }

  @Get('templates/all')
  @Roles('VIEW_ONLY')
  async getTemplates(
    @WorkspaceId() workspaceId: string,
    @Query('category') category?: string,
  ) {
    return this.templatesService.getTemplates(workspaceId, category);
  }

  @Get('templates/:templateId')
  @Roles('VIEW_ONLY')
  async getTemplate(
    @WorkspaceId() workspaceId: string,
    @Param('templateId') templateId: string,
  ) {
    return this.templatesService.getTemplate(workspaceId, templateId);
  }

  @Post('templates')
  @Roles('OPERATOR')
  async createTemplate(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.templatesService.createTemplate(workspaceId, dto);
  }

  @Put('templates/:templateId')
  @Roles('OPERATOR')
  async updateTemplate(
    @WorkspaceId() workspaceId: string,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templatesService.updateTemplate(workspaceId, templateId, dto);
  }

  @Delete('templates/:templateId')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(
    @WorkspaceId() workspaceId: string,
    @Param('templateId') templateId: string,
  ) {
    return this.templatesService.deleteTemplate(workspaceId, templateId);
  }

  // ==========================================
  // CANNED RESPONSE ENDPOINTS
  // ==========================================

  @Get('canned-responses/all')
  @Roles('VIEW_ONLY')
  async getCannedResponses(
    @WorkspaceId() workspaceId: string,
    @Query('category') category?: string,
  ) {
    return this.templatesService.getCannedResponses(workspaceId, category);
  }

  @Get('canned-responses/search/:shortcut')
  @Roles('VIEW_ONLY')
  async findCannedByShortcut(
    @WorkspaceId() workspaceId: string,
    @Param('shortcut') shortcut: string,
  ) {
    return this.templatesService.findCannedByShortcut(workspaceId, shortcut);
  }

  @Post('canned-responses')
  @Roles('OPERATOR')
  async createCannedResponse(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateCannedResponseDto,
  ) {
    return this.templatesService.createCannedResponse(workspaceId, dto);
  }

  @Put('canned-responses/:responseId')
  @Roles('OPERATOR')
  async updateCannedResponse(
    @WorkspaceId() workspaceId: string,
    @Param('responseId') responseId: string,
    @Body() dto: UpdateCannedResponseDto,
  ) {
    return this.templatesService.updateCannedResponse(workspaceId, responseId, dto);
  }

  @Delete('canned-responses/:responseId')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCannedResponse(
    @WorkspaceId() workspaceId: string,
    @Param('responseId') responseId: string,
  ) {
    return this.templatesService.deleteCannedResponse(workspaceId, responseId);
  }

  // ==========================================
  // OTN (One-Time Notification) ENDPOINTS
  // ==========================================

  /**
   * Request OTN opt-in from a contact
   */
  @Post('otn/request')
  @Roles('OPERATOR')
  async requestOtn(
    @WorkspaceId() workspaceId: string,
    @Body() dto: { contactId: string; pageId: string; title: string; payload?: string },
  ) {
    return this.otnService.requestOtn({
      contactId: dto.contactId,
      pageId: dto.pageId,
      workspaceId,
      title: dto.title,
      payload: dto.payload,
    });
  }

  /**
   * Send a message using an OTN token
   */
  @Post('otn/use')
  @Roles('OPERATOR')
  async useOtnToken(
    @WorkspaceId() workspaceId: string,
    @Body() dto: {
      otnTokenId: string;
      contactId: string;
      pageId: string;
      messageContent: { text?: string; attachmentUrl?: string; attachmentType?: string };
    },
  ) {
    return this.otnService.useOtnToken({
      otnTokenId: dto.otnTokenId,
      contactId: dto.contactId,
      pageId: dto.pageId,
      workspaceId,
      messageContent: dto.messageContent as any,
    });
  }

  /**
   * Get available OTN tokens for a contact
   */
  @Get('otn/tokens/:contactId/:pageId')
  @Roles('VIEW_ONLY')
  async getOtnTokens(
    @Param('contactId') contactId: string,
    @Param('pageId') pageId: string,
  ) {
    return this.otnService.getAvailableTokens(contactId, pageId);
  }

  /**
   * Get OTN token count for a contact
   */
  @Get('otn/count/:contactId/:pageId')
  @Roles('VIEW_ONLY')
  async getOtnTokenCount(
    @Param('contactId') contactId: string,
    @Param('pageId') pageId: string,
  ) {
    const count = await this.otnService.getTokenCount(contactId, pageId);
    return { count };
  }

  // ==========================================
  // RECURRING NOTIFICATION ENDPOINTS
  // ==========================================

  /**
   * Request recurring notification subscription
   */
  @Post('recurring/request')
  @Roles('OPERATOR')
  async requestRecurringSubscription(
    @WorkspaceId() workspaceId: string,
    @Body() dto: {
      contactId: string;
      pageId: string;
      title: string;
      frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
      topic?: string;
    },
  ) {
    return this.recurringService.requestSubscription({
      contactId: dto.contactId,
      pageId: dto.pageId,
      workspaceId,
      title: dto.title,
      frequency: dto.frequency as any,
    });
  }

  /**
   * Send a recurring notification message
   */
  @Post('recurring/send')
  @Roles('OPERATOR')
  async sendRecurringMessage(
    @WorkspaceId() workspaceId: string,
    @Body() dto: {
      subscriptionId: string;
      contactId: string;
      pageId: string;
      messageContent: { text?: string; attachmentUrl?: string; attachmentType?: string };
    },
  ) {
    return this.recurringService.sendRecurringMessage({
      subscriptionId: dto.subscriptionId,
      pageId: dto.pageId,
      workspaceId,
      messageContent: dto.messageContent as any,
    });
  }

  /**
   * Get subscriptions for a contact
   */
  @Get('recurring/subscriptions/:contactId/:pageId')
  @Roles('VIEW_ONLY')
  async getContactSubscriptions(
    @Param('contactId') contactId: string,
    @Param('pageId') pageId: string,
  ) {
    return this.recurringService.getContactSubscriptions(contactId, pageId);
  }

  /**
   * Check if can send for a subscription
   */
  @Get('recurring/can-send/:subscriptionId')
  @Roles('VIEW_ONLY')
  async canSendRecurring(@Param('subscriptionId') subscriptionId: string) {
    const canSend = await this.recurringService.canSendNow(subscriptionId);
    return { canSend };
  }

  // ==========================================
  // COMPLIANCE ENDPOINTS (FR-7.7)
  // ==========================================

  /**
   * Pre-send compliance check
   */
  @Post('compliance/check')
  @Roles('VIEW_ONLY')
  async checkCompliance(
    @WorkspaceId() workspaceId: string,
    @Body() dto: {
      contactId: string;
      pageId: string;
      bypassMethod?: string;
      messageTag?: string;
    },
  ) {
    return this.complianceService.checkCompliance(
      workspaceId,
      dto.contactId,
      dto.pageId,
      dto.bypassMethod as any,
      dto.messageTag as any,
    );
  }

  /**
   * Get compliance audit report
   */
  @Get('compliance/report')
  @Roles('MANAGER')
  async getComplianceReport(
    @WorkspaceId() workspaceId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.complianceService.getComplianceReport(
      workspaceId,
      new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date(endDate || Date.now()),
    );
  }

  // ==========================================
  // SPONSORED MESSAGE ENDPOINTS (FR-7.6)
  // ==========================================

  @Post('sponsored/create')
  @Roles('MANAGER')
  async createSponsoredCampaign(
    @WorkspaceId() workspaceId: string,
    @Body() dto: {
      pageId: string;
      messageText: string;
      targetContactIds?: string[];
      dailyBudgetCents: number;
      durationDays: number;
    },
  ) {
    return this.sponsoredMessageService.createSponsoredCampaign({
      ...dto,
      workspaceId,
    });
  }

  @Post('sponsored/:campaignId/submit')
  @Roles('MANAGER')
  async submitSponsoredForReview(@Param('campaignId') campaignId: string) {
    return this.sponsoredMessageService.submitForReview(campaignId);
  }

  @Post('sponsored/:campaignId/pause')
  @Roles('MANAGER')
  async pauseSponsoredCampaign(@Param('campaignId') campaignId: string) {
    return this.sponsoredMessageService.pauseCampaign(campaignId);
  }

  @Post('sponsored/:campaignId/resume')
  @Roles('MANAGER')
  async resumeSponsoredCampaign(@Param('campaignId') campaignId: string) {
    return this.sponsoredMessageService.resumeCampaign(campaignId);
  }

  @Get('sponsored/list')
  @Roles('VIEW_ONLY')
  async listSponsoredCampaigns(@WorkspaceId() workspaceId: string) {
    return this.sponsoredMessageService.listCampaigns(workspaceId);
  }

  @Get('sponsored/:campaignId')
  @Roles('VIEW_ONLY')
  async getSponsoredCampaign(@Param('campaignId') campaignId: string) {
    return this.sponsoredMessageService.getCampaign(campaignId);
  }

  @Get('sponsored/:campaignId/stats')
  @Roles('VIEW_ONLY')
  async getSponsoredCampaignStats(@Param('campaignId') campaignId: string) {
    return this.sponsoredMessageService.getCampaignStats(campaignId);
  }

  @Delete('sponsored/:campaignId')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSponsoredCampaign(@Param('campaignId') campaignId: string) {
    return this.sponsoredMessageService.deleteCampaign(campaignId);
  }

  // ==========================================
  // GENERIC MESSAGE BY ID (must be LAST to avoid
  // catching template/canned/otn/sponsored routes)
  // ==========================================

  @Get(':id')
  @Roles('VIEW_ONLY')
  async findById(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.messagesService.findById(workspaceId, id);
  }
}
