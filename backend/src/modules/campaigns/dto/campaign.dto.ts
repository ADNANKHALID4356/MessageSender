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
  IsBoolean,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  CampaignType,
  CampaignStatus,
  AudienceType,
  BypassMethod,
  MessageTag,
  ABWinnerCriteria,
} from '@prisma/client';

// ===========================================
// Create Campaign DTO
// ===========================================

export class MessageContentDto {
  @IsString()
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @IsString()
  @IsOptional()
  attachmentType?: 'image' | 'video' | 'audio' | 'file';

  @IsArray()
  @IsOptional()
  quickReplies?: Array<{
    content_type: 'text';
    title: string;
    payload: string;
  }>;

  @IsObject()
  @IsOptional()
  template?: {
    id: string;
    params?: Record<string, string>;
  };
}

export class ABVariantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @ValidateNested()
  @Type(() => MessageContentDto)
  content: MessageContentDto;

  @IsInt()
  @Min(1)
  @Max(100)
  percentage: number;
}

export class RecurringPatternDto {
  @IsEnum(['DAILY', 'WEEKLY', 'MONTHLY'])
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';

  @IsArray()
  @IsOptional()
  daysOfWeek?: number[]; // 0-6, Sunday = 0

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @IsString()
  @IsNotEmpty()
  time: string; // HH:mm format

  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  maxOccurrences?: number;
}

export class DripStepDto {
  @IsInt()
  @Min(0)
  delayMinutes: number;

  @ValidateNested()
  @Type(() => MessageContentDto)
  content: MessageContentDto;

  @IsString()
  @IsOptional()
  condition?: string; // JSON condition for filtering
}

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CampaignType)
  @IsNotEmpty()
  campaignType: CampaignType;

  @IsEnum(AudienceType)
  @IsNotEmpty()
  audienceType: AudienceType;

  @IsUUID()
  @IsOptional()
  audienceSegmentId?: string; // For SEGMENT audience

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  audiencePageIds?: string[]; // For PAGES audience

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  audienceContactIds?: string[]; // For MANUAL audience

  @ValidateNested()
  @Type(() => MessageContentDto)
  @IsNotEmpty()
  messageContent: MessageContentDto;

  @IsEnum(BypassMethod)
  @IsOptional()
  bypassMethod?: BypassMethod;

  @IsEnum(MessageTag)
  @IsOptional()
  messageTag?: MessageTag;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @ValidateNested()
  @Type(() => RecurringPatternDto)
  @IsOptional()
  recurringPattern?: RecurringPatternDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DripStepDto)
  @IsOptional()
  dripSequence?: DripStepDto[];

  @IsBoolean()
  @IsOptional()
  isAbTest?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ABVariantDto)
  @IsOptional()
  abVariants?: ABVariantDto[];

  @IsEnum(ABWinnerCriteria)
  @IsOptional()
  abWinnerCriteria?: ABWinnerCriteria;
}

// ===========================================
// Update Campaign DTO
// ===========================================

export class UpdateCampaignDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @ValidateNested()
  @Type(() => MessageContentDto)
  @IsOptional()
  messageContent?: MessageContentDto;

  @IsEnum(AudienceType)
  @IsOptional()
  audienceType?: AudienceType;

  @IsUUID()
  @IsOptional()
  audienceSegmentId?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  audiencePageIds?: string[];

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  audienceContactIds?: string[];

  @IsEnum(BypassMethod)
  @IsOptional()
  bypassMethod?: BypassMethod;

  @IsEnum(MessageTag)
  @IsOptional()
  messageTag?: MessageTag;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsString()
  @IsOptional()
  timezone?: string;
}

// ===========================================
// Query DTOs
// ===========================================

export class CampaignListQueryDto {
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
  limit?: number = 20;

  @IsEnum(CampaignStatus)
  @IsOptional()
  status?: CampaignStatus;

  @IsEnum(CampaignType)
  @IsOptional()
  type?: CampaignType;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  sortBy?: 'createdAt' | 'name' | 'scheduledAt' | 'sentCount' = 'createdAt';

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// ===========================================
// Response Types
// ===========================================

export interface CampaignResponse {
  id: string;
  name: string;
  description: string | null;
  campaignType: CampaignType;
  status: CampaignStatus;
  audienceType: AudienceType;
  messageContent: any;
  bypassMethod: BypassMethod | null;
  messageTag: MessageTag | null;
  scheduledAt: Date | null;
  timezone: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  openedCount: number;
  clickedCount: number;
  repliedCount: number;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignStatsResponse {
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  openedCount: number;
  clickedCount: number;
  repliedCount: number;
  unsubscribedCount: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
}

export interface CampaignListResponse {
  data: CampaignResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
