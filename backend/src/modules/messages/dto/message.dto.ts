import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { 
  MessageType as PrismaMessageType, 
  MessageStatus as PrismaMessageStatus,
  MessageDirection as PrismaMessageDirection,
  BypassMethod,
} from '@prisma/client';

// Re-export Prisma enums for use in DTOs
export const MessageType = PrismaMessageType;
export type MessageType = PrismaMessageType;

export const MessageStatus = PrismaMessageStatus;
export type MessageStatus = PrismaMessageStatus;

export const MessageDirection = PrismaMessageDirection;
export type MessageDirection = PrismaMessageDirection;

export class SendMessageDto {
  @IsUUID()
  @IsNotEmpty()
  conversationId: string;

  @IsEnum(MessageType)
  @IsOptional()
  messageType?: MessageType = MessageType.TEXT;

  @IsObject()
  @IsNotEmpty()
  content: {
    text?: string;
    attachmentUrl?: string;
    attachmentType?: 'image' | 'video' | 'audio' | 'file';
    fileName?: string;
    templateId?: string;
    templateParams?: Record<string, string>;
    quickReplies?: Array<{
      content_type: 'text';
      title: string;
      payload: string;
    }>;
  };

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  // 24-Hour Bypass Options
  @IsEnum(BypassMethod)
  @IsOptional()
  bypassMethod?: BypassMethod;

  @IsString()
  @IsOptional()
  messageTag?: string; // For MESSAGE_TAG bypass

  @IsUUID()
  @IsOptional()
  otnTokenId?: string; // For OTN_TOKEN bypass

  @IsUUID()
  @IsOptional()
  subscriptionId?: string; // For RECURRING_NOTIFICATION bypass
}

export class SendQuickMessageDto {
  @IsUUID()
  @IsNotEmpty()
  contactId: string;

  @IsString()
  @IsNotEmpty()
  text: string;
}

export class MessageListQueryDto {
  @IsUUID()
  @IsNotEmpty()
  conversationId: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 50;

  @IsString()
  @IsOptional()
  before?: string; // Cursor for pagination (message ID)

  @IsString()
  @IsOptional()
  after?: string; // Cursor for pagination (message ID)
}

export class ContactMessagesQueryDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 50;
}

export class BulkSendMessageDto {
  @IsArray()
  @IsUUID('4', { each: true })
  contactIds: string[];

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class ScheduleMessageDto {
  @IsUUID()
  @IsNotEmpty()
  conversationId: string;

  @IsEnum(MessageType)
  @IsOptional()
  messageType?: MessageType = MessageType.TEXT;

  @IsObject()
  @IsNotEmpty()
  content: {
    text?: string;
    attachmentUrl?: string;
  };

  @IsString()
  @IsNotEmpty()
  scheduledAt: string; // ISO date string
}

export class IncomingWebhookMessageDto {
  @IsString()
  @IsNotEmpty()
  pageId: string;

  @IsString()
  @IsNotEmpty()
  psid: string;

  @IsString()
  @IsNotEmpty()
  mid: string;

  @IsEnum(MessageType)
  @IsOptional()
  messageType?: MessageType = MessageType.TEXT;

  @IsObject()
  @IsNotEmpty()
  content: {
    text?: string;
    attachmentUrl?: string;
    attachmentType?: string;
  };

  @IsInt()
  @IsNotEmpty()
  timestamp: number;
}
