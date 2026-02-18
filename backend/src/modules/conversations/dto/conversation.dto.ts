import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ConversationStatus as PrismaConversationStatus } from '@prisma/client';

// Re-export Prisma enum for use in DTOs and elsewhere
export const ConversationStatus = PrismaConversationStatus;
export type ConversationStatus = PrismaConversationStatus;

export class ConversationListQueryDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  @IsEnum(ConversationStatus)
  @IsOptional()
  status?: ConversationStatus;

  @IsUUID()
  @IsOptional()
  pageId?: string;

  @IsUUID()
  @IsOptional()
  assignedToUserId?: string;

  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  unreadOnly?: boolean;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  sortBy?: 'lastMessageAt' | 'createdAt' | 'unreadCount' = 'lastMessageAt';

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class UpdateConversationDto {
  @IsEnum(ConversationStatus)
  @IsOptional()
  status?: ConversationStatus;

  @IsUUID()
  @IsOptional()
  assignedToUserId?: string | null;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AssignConversationDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}

export class BulkUpdateConversationsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  conversationIds: string[];

  @IsEnum(ConversationStatus)
  @IsOptional()
  status?: ConversationStatus;

  @IsUUID()
  @IsOptional()
  assignedToUserId?: string | null;
}

export class CreateConversationDto {
  @IsUUID()
  @IsNotEmpty()
  contactId: string;

  @IsUUID()
  @IsOptional()
  pageId?: string;

  @IsUUID()
  @IsOptional()
  assignedToUserId?: string;
}
