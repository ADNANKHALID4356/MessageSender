import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ===========================================
// Webhook Verification DTO
// ===========================================

export class WebhookVerificationDto {
  @ApiProperty({ description: 'Verification mode' })
  @IsString()
  'hub.mode': string;

  @ApiProperty({ description: 'Verification token' })
  @IsString()
  'hub.verify_token': string;

  @ApiProperty({ description: 'Challenge string to return' })
  @IsString()
  'hub.challenge': string;
}

// ===========================================
// Webhook Event Types
// ===========================================

export class WebhookSender {
  @ApiProperty({ description: 'Page-scoped user ID' })
  @IsString()
  id: string;
}

export class WebhookRecipient {
  @ApiProperty({ description: 'Page ID' })
  @IsString()
  id: string;
}

export class WebhookMessageAttachment {
  @ApiProperty({ description: 'Attachment type' })
  @IsString()
  type: 'image' | 'video' | 'audio' | 'file' | 'location' | 'fallback' | 'template';

  @ApiProperty({ description: 'Attachment payload' })
  @IsObject()
  payload: {
    url?: string;
    sticker_id?: number;
    coordinates?: {
      lat: number;
      long: number;
    };
  };
}

export class WebhookQuickReply {
  @ApiProperty({ description: 'Quick reply payload' })
  @IsString()
  payload: string;
}

export class WebhookMessageContent {
  @ApiPropertyOptional({ description: 'Message ID' })
  @IsString()
  @IsOptional()
  mid?: string;

  @ApiPropertyOptional({ description: 'Message text' })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiPropertyOptional({ description: 'Attachments' })
  @IsArray()
  @IsOptional()
  attachments?: WebhookMessageAttachment[];

  @ApiPropertyOptional({ description: 'Quick reply' })
  @IsOptional()
  quick_reply?: WebhookQuickReply;

  @ApiPropertyOptional({ description: 'Reply to message' })
  @IsOptional()
  reply_to?: {
    mid: string;
  };

  @ApiPropertyOptional({ description: 'Is echo (sent by page)' })
  @IsOptional()
  is_echo?: boolean;

  @ApiPropertyOptional({ description: 'App ID if echo' })
  @IsOptional()
  app_id?: number;

  @ApiPropertyOptional({ description: 'Metadata if echo' })
  @IsOptional()
  metadata?: string;
}

export class WebhookReferral {
  @ApiPropertyOptional({ description: 'Referral ref parameter' })
  @IsString()
  @IsOptional()
  ref?: string;

  @ApiProperty({ description: 'Referral source' })
  @IsString()
  source: string;

  @ApiProperty({ description: 'Referral type' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'Ad ID' })
  @IsString()
  @IsOptional()
  ad_id?: string;

  @ApiPropertyOptional({ description: 'Ads context token' })
  @IsString()
  @IsOptional()
  ads_context_data?: {
    ad_title?: string;
    photo_url?: string;
    video_url?: string;
    post_id?: string;
    product_id?: string;
  };
}

export class WebhookPostback {
  @ApiProperty({ description: 'Postback title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Postback payload' })
  @IsString()
  payload: string;

  @ApiPropertyOptional({ description: 'Referral info' })
  @IsOptional()
  referral?: WebhookReferral;
}

export class WebhookOptin {
  @ApiPropertyOptional({ description: 'Optin ref' })
  @IsString()
  @IsOptional()
  ref?: string;

  @ApiPropertyOptional({ description: 'User ref for checkbox plugin' })
  @IsString()
  @IsOptional()
  user_ref?: string;

  @ApiPropertyOptional({ description: 'OTN type' })
  @IsString()
  @IsOptional()
  type?: 'one_time_notif_req';

  @ApiPropertyOptional({ description: 'OTN payload' })
  @IsString()
  @IsOptional()
  payload?: string;

  @ApiPropertyOptional({ description: 'OTN token' })
  @IsString()
  @IsOptional()
  one_time_notif_token?: string;

  @ApiPropertyOptional({ description: 'Notification messages token (recurring)' })
  @IsString()
  @IsOptional()
  notification_messages_token?: string;

  @ApiPropertyOptional({ description: 'Notification messages frequency' })
  @IsString()
  @IsOptional()
  notification_messages_frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';

  @ApiPropertyOptional({ description: 'Token expiry timestamp' })
  @IsNumber()
  @IsOptional()
  token_expiry_timestamp?: number;

  @ApiPropertyOptional({ description: 'Notification messages status' })
  @IsString()
  @IsOptional()
  notification_messages_status?: 'STOP_NOTIFICATIONS' | 'RESUME_NOTIFICATIONS';

  @ApiPropertyOptional({ description: 'Notification messages timezone' })
  @IsString()
  @IsOptional()
  notification_messages_timezone?: string;
}

export class WebhookDelivery {
  @ApiProperty({ description: 'Message IDs delivered' })
  @IsArray()
  @IsOptional()
  mids?: string[];

  @ApiProperty({ description: 'Watermark timestamp' })
  @IsNumber()
  watermark: number;
}

export class WebhookRead {
  @ApiProperty({ description: 'Watermark timestamp' })
  @IsNumber()
  watermark: number;
}

export class WebhookReaction {
  @ApiProperty({ description: 'Reaction type' })
  @IsString()
  reaction: 'smile' | 'angry' | 'sad' | 'wow' | 'love' | 'like' | 'dislike' | 'other';

  @ApiProperty({ description: 'Emoji' })
  @IsString()
  @IsOptional()
  emoji?: string;

  @ApiProperty({ description: 'Action' })
  @IsString()
  action: 'react' | 'unreact';

  @ApiProperty({ description: 'Message ID' })
  @IsString()
  mid: string;
}

// ===========================================
// Policy Enforcement Event
// ===========================================

export class WebhookPolicyEnforcement {
  @ApiProperty({ description: 'Action taken by Facebook' })
  @IsString()
  action: 'warning' | 'block' | 'unblock';

  @ApiPropertyOptional({ description: 'Reason for action' })
  @IsString()
  @IsOptional()
  reason?: string;
}

// ===========================================
// Handover Protocol Events
// ===========================================

export class WebhookPassThreadControl {
  @ApiProperty({ description: 'New owner app ID' })
  @IsNumber()
  new_owner_app_id: number;

  @ApiPropertyOptional({ description: 'Metadata passed to new owner' })
  @IsString()
  @IsOptional()
  metadata?: string;
}

export class WebhookTakeThreadControl {
  @ApiProperty({ description: 'Previous owner app ID' })
  @IsNumber()
  previous_owner_app_id: number;

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsString()
  @IsOptional()
  metadata?: string;
}

// ===========================================
// Messaging Event
// ===========================================

export class WebhookMessagingEvent {
  @ApiProperty({ description: 'Sender info' })
  @ValidateNested()
  @Type(() => WebhookSender)
  sender: WebhookSender;

  @ApiProperty({ description: 'Recipient info' })
  @ValidateNested()
  @Type(() => WebhookRecipient)
  recipient: WebhookRecipient;

  @ApiProperty({ description: 'Event timestamp' })
  @IsNumber()
  timestamp: number;

  @ApiPropertyOptional({ description: 'Message content' })
  @ValidateNested()
  @Type(() => WebhookMessageContent)
  @IsOptional()
  message?: WebhookMessageContent;

  @ApiPropertyOptional({ description: 'Postback event' })
  @ValidateNested()
  @Type(() => WebhookPostback)
  @IsOptional()
  postback?: WebhookPostback;

  @ApiPropertyOptional({ description: 'Referral event' })
  @ValidateNested()
  @Type(() => WebhookReferral)
  @IsOptional()
  referral?: WebhookReferral;

  @ApiPropertyOptional({ description: 'Optin event' })
  @ValidateNested()
  @Type(() => WebhookOptin)
  @IsOptional()
  optin?: WebhookOptin;

  @ApiPropertyOptional({ description: 'Delivery receipt' })
  @ValidateNested()
  @Type(() => WebhookDelivery)
  @IsOptional()
  delivery?: WebhookDelivery;

  @ApiPropertyOptional({ description: 'Read receipt' })
  @ValidateNested()
  @Type(() => WebhookRead)
  @IsOptional()
  read?: WebhookRead;

  @ApiPropertyOptional({ description: 'Reaction event' })
  @ValidateNested()
  @Type(() => WebhookReaction)
  @IsOptional()
  reaction?: WebhookReaction;

  @ApiPropertyOptional({ description: 'Policy enforcement event' })
  @ValidateNested()
  @Type(() => WebhookPolicyEnforcement)
  @IsOptional()
  'policy-enforcement'?: WebhookPolicyEnforcement;

  @ApiPropertyOptional({ description: 'Pass thread control event' })
  @ValidateNested()
  @Type(() => WebhookPassThreadControl)
  @IsOptional()
  pass_thread_control?: WebhookPassThreadControl;

  @ApiPropertyOptional({ description: 'Take thread control event' })
  @ValidateNested()
  @Type(() => WebhookTakeThreadControl)
  @IsOptional()
  take_thread_control?: WebhookTakeThreadControl;
}

// ===========================================
// Webhook Entry & Payload
// ===========================================

export class WebhookEntry {
  @ApiProperty({ description: 'Page ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Entry time' })
  @IsNumber()
  time: number;

  @ApiProperty({ description: 'Messaging events' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookMessagingEvent)
  @IsOptional()
  messaging?: WebhookMessagingEvent[];

  @ApiPropertyOptional({ description: 'Standby events (handover protocol)' })
  @IsArray()
  @IsOptional()
  standby?: WebhookMessagingEvent[];

  @ApiPropertyOptional({ description: 'Changes (feed events)' })
  @IsArray()
  @IsOptional()
  changes?: any[];
}

export class WebhookPayloadDto {
  @ApiProperty({ description: 'Object type (always "page")' })
  @IsString()
  object: string;

  @ApiProperty({ description: 'Webhook entries' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookEntry)
  entry: WebhookEntry[];
}
