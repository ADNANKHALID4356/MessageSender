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
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { SegmentType } from '@prisma/client';

// ===========================================
// Filter Types
// ===========================================

export enum FilterOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  CONTAINS = 'CONTAINS',
  NOT_CONTAINS = 'NOT_CONTAINS',
  STARTS_WITH = 'STARTS_WITH',
  ENDS_WITH = 'ENDS_WITH',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  GREATER_THAN_OR_EQUAL = 'GREATER_THAN_OR_EQUAL',
  LESS_THAN_OR_EQUAL = 'LESS_THAN_OR_EQUAL',
  BETWEEN = 'BETWEEN',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  IS_NULL = 'IS_NULL',
  IS_NOT_NULL = 'IS_NOT_NULL',
  IS_TRUE = 'IS_TRUE',
  IS_FALSE = 'IS_FALSE',
  BEFORE = 'BEFORE', // Date comparison
  AFTER = 'AFTER', // Date comparison
  WITHIN_LAST = 'WITHIN_LAST', // e.g., last 7 days
  NOT_WITHIN_LAST = 'NOT_WITHIN_LAST',
}

export enum FilterField {
  // Contact Fields
  FIRST_NAME = 'firstName',
  LAST_NAME = 'lastName',
  FULL_NAME = 'fullName',
  EMAIL = 'email',
  PHONE = 'phone',
  GENDER = 'gender',
  LOCALE = 'locale',
  TIMEZONE = 'timezone',
  SOURCE = 'source',
  IS_BLOCKED = 'isBlocked',
  IS_SUBSCRIBED = 'isSubscribed',
  
  // Engagement Fields
  TOTAL_MESSAGES_SENT = 'totalMessagesSent',
  TOTAL_MESSAGES_RECEIVED = 'totalMessagesReceived',
  LAST_MESSAGE_FROM_CONTACT_AT = 'lastMessageFromContactAt',
  LAST_MESSAGE_TO_CONTACT_AT = 'lastMessageToContactAt',
  FIRST_INTERACTION_AT = 'firstInteractionAt',
  LAST_INTERACTION_AT = 'lastInteractionAt',
  
  // Tag Fields
  HAS_TAG = 'hasTag',
  DOES_NOT_HAVE_TAG = 'doesNotHaveTag',
  
  // Page Fields
  PAGE_ID = 'pageId',
  
  // Custom Field
  CUSTOM_FIELD = 'customField',
  
  // 24-Hour Window
  IS_WITHIN_24H_WINDOW = 'isWithin24HWindow',
}

export enum FilterLogic {
  AND = 'AND',
  OR = 'OR',
}

export class FilterConditionDto {
  @IsEnum(FilterField)
  field: FilterField;

  @IsEnum(FilterOperator)
  operator: FilterOperator;

  @IsOptional()
  value?: any; // String, number, array, or date depending on operator

  @IsString()
  @IsOptional()
  customFieldKey?: string; // For CUSTOM_FIELD filter

  @IsOptional()
  negate?: boolean; // NOT logic — wraps condition in Prisma NOT
}

export class FilterGroupDto {
  @IsEnum(FilterLogic)
  @IsOptional()
  logic?: FilterLogic = FilterLogic.AND;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterConditionDto)
  conditions: FilterConditionDto[];

  @IsOptional()
  negate?: boolean; // NOT logic — wraps entire group in Prisma NOT

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterGroupDto)
  @IsOptional()
  nestedGroups?: FilterGroupDto[]; // Nested sub-groups for complex queries
}

export class SegmentFiltersDto {
  @IsEnum(FilterLogic)
  @IsOptional()
  logic?: FilterLogic = FilterLogic.AND;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterGroupDto)
  groups: FilterGroupDto[];
}

// ===========================================
// Create Segment DTO
// ===========================================

export class CreateSegmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(SegmentType)
  @IsNotEmpty()
  segmentType: SegmentType;

  @ValidateNested()
  @Type(() => SegmentFiltersDto)
  @IsOptional()
  filters?: SegmentFiltersDto;

  // For STATIC segments, allow direct contact IDs
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  contactIds?: string[];
}

// ===========================================
// Update Segment DTO
// ===========================================

export class UpdateSegmentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @ValidateNested()
  @Type(() => SegmentFiltersDto)
  @IsOptional()
  filters?: SegmentFiltersDto;
}

// ===========================================
// Query DTOs
// ===========================================

export class SegmentListQueryDto {
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

  @IsEnum(SegmentType)
  @IsOptional()
  type?: SegmentType;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  sortBy?: 'createdAt' | 'name' | 'contactCount' = 'createdAt';

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class SegmentContactsQueryDto {
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
  search?: string;
}

export class AddContactsToSegmentDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  contactIds: string[];
}

export class RemoveContactsFromSegmentDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  contactIds: string[];
}

// ===========================================
// Response Types
// ===========================================

export interface SegmentResponse {
  id: string;
  name: string;
  description: string | null;
  segmentType: SegmentType;
  filters: SegmentFiltersDto | null;
  contactCount: number;
  lastCalculatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentListResponse {
  data: SegmentResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SegmentPreviewResponse {
  totalContacts: number;
  sampleContacts: Array<{
    id: string;
    fullName: string | null;
    email: string | null;
    pageId: string;
  }>;
}
