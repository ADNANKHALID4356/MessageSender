import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsArray,
  IsEmail,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ContactSource as PrismaContactSource, EngagementLevel as PrismaEngagementLevel } from '@prisma/client';

// Re-export Prisma enums for use in DTOs and elsewhere
export const ContactSource = PrismaContactSource;
export type ContactSource = PrismaContactSource;

export const EngagementLevel = PrismaEngagementLevel;
export type EngagementLevel = PrismaEngagementLevel;

export class CreateContactDto {
  @ApiProperty({ description: 'Page ID the contact belongs to' })
  @IsUUID()
  @IsNotEmpty()
  pageId: string;

  @ApiProperty({ description: 'Facebook Page-Scoped User ID' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  psid: string;

  @ApiPropertyOptional({ description: 'First name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Profile picture URL' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  profilePictureUrl?: string;

  @ApiPropertyOptional({ description: 'Locale (e.g., en_US)' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  locale?: string;

  @ApiPropertyOptional({ description: 'Timezone offset' })
  @IsNumber()
  @IsOptional()
  timezone?: number;

  @ApiPropertyOptional({ description: 'Gender' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  gender?: string;

  @ApiPropertyOptional({ enum: ContactSource, description: 'Contact source' })
  @IsEnum(ContactSource)
  @IsOptional()
  source?: ContactSource;

  @ApiPropertyOptional({ description: 'Custom fields JSON' })
  @IsOptional()
  customFields?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Notes about the contact' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateContactDto {
  @ApiPropertyOptional({ description: 'First name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Profile picture URL' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  profilePictureUrl?: string;

  @ApiPropertyOptional({ enum: EngagementLevel, description: 'Engagement level' })
  @IsEnum(EngagementLevel)
  @IsOptional()
  engagementLevel?: EngagementLevel;

  @ApiPropertyOptional({ description: 'Custom fields JSON' })
  @IsOptional()
  customFields?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Is subscribed to messages' })
  @IsBoolean()
  @IsOptional()
  isSubscribed?: boolean;

  @ApiPropertyOptional({ description: 'Notes about the contact' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ContactListQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search query (name, PSID)' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: EngagementLevel, description: 'Filter by engagement level' })
  @IsEnum(EngagementLevel)
  @IsOptional()
  engagementLevel?: EngagementLevel;

  @ApiPropertyOptional({ description: 'Filter by page ID' })
  @IsUUID()
  @IsOptional()
  pageId?: string;

  @ApiPropertyOptional({ description: 'Filter by tag IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  tagIds?: string[];

  @ApiPropertyOptional({ description: 'Filter by subscription status' })
  @IsBoolean()
  @IsOptional()
  isSubscribed?: boolean;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'lastInteractionAt' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'lastInteractionAt';

  @ApiPropertyOptional({ description: 'Sort direction', default: 'desc' })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class AddTagsDto {
  @ApiProperty({ description: 'Tag IDs to add' })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  tagIds: string[];
}

export class RemoveTagsDto {
  @ApiProperty({ description: 'Tag IDs to remove' })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  tagIds: string[];
}

export class CreateTagDto {
  @ApiProperty({ description: 'Tag name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ description: 'Tag color (hex)', default: '#6B7280' })
  @IsString()
  @IsOptional()
  @MaxLength(7)
  color?: string;
}

export class UpdateTagDto {
  @ApiPropertyOptional({ description: 'Tag name' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ description: 'Tag color (hex)' })
  @IsString()
  @IsOptional()
  @MaxLength(7)
  color?: string;
}

export class BulkUpdateContactsDto {
  @ApiProperty({ description: 'Contact IDs to update' })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  contactIds: string[];

  @ApiPropertyOptional({ description: 'Tag IDs to add' })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  addTagIds?: string[];

  @ApiPropertyOptional({ description: 'Tag IDs to remove' })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  removeTagIds?: string[];

  @ApiPropertyOptional({ enum: EngagementLevel, description: 'Set engagement level' })
  @IsEnum(EngagementLevel)
  @IsOptional()
  engagementLevel?: EngagementLevel;

  @ApiPropertyOptional({ description: 'Set subscription status' })
  @IsBoolean()
  @IsOptional()
  isSubscribed?: boolean;
}
