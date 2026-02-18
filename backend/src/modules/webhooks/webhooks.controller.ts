import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Req,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { WebhookPayloadDto } from './dto/webhook.dto';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('webhooks')
@SkipThrottle()
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  // ===========================================
  // Facebook Webhook Verification
  // ===========================================

  @Get('facebook')
  @Public()
  @ApiOperation({ summary: 'Facebook webhook verification endpoint' })
  @ApiResponse({ status: 200, description: 'Verification successful' })
  @ApiResponse({ status: 401, description: 'Verification failed' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    this.logger.log('Webhook verification request received');
    return this.webhooksService.verifyWebhook(mode, token, challenge);
  }

  // ===========================================
  // Facebook Webhook Events
  // ===========================================

  @Post('facebook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Facebook webhook event receiver' })
  @ApiResponse({ status: 200, description: 'Event received' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async receiveWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string,
    @Body() payload: WebhookPayloadDto,
  ): Promise<string> {
    this.logger.log(`Webhook event received: ${payload.object}, entries: ${payload.entry?.length || 0}`);

    // Verify signature
    const rawBody = req.rawBody?.toString() || JSON.stringify(payload);
    if (!this.webhooksService.verifySignature(signature, rawBody)) {
      this.logger.warn('Webhook signature verification failed');
      throw new UnauthorizedException('Invalid signature');
    }

    // Process asynchronously - return 200 immediately to Facebook
    // This prevents timeouts and ensures Facebook knows we received the event
    setImmediate(async () => {
      try {
        await this.webhooksService.processWebhook(payload);
      } catch (error) {
        this.logger.error(`Async webhook processing error: ${error.message}`, error.stack);
      }
    });

    return 'EVENT_RECEIVED';
  }

  // ===========================================
  // Test Endpoints (Development Only)
  // ===========================================

  @Post('facebook/test')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async testWebhook(@Body() payload: WebhookPayloadDto): Promise<{ success: boolean; message: string }> {
    // Only available in development
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Test endpoint not available in production');
    }

    this.logger.log('Test webhook received');
    
    try {
      await this.webhooksService.processWebhook(payload);
      return { success: true, message: 'Test webhook processed' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('facebook/status')
  @Public()
  @ApiOperation({ summary: 'Get webhook status' })
  @ApiResponse({ status: 200, description: 'Webhook is active' })
  getStatus(): { status: string; timestamp: string } {
    return {
      status: 'active',
      timestamp: new Date().toISOString(),
    };
  }
}
