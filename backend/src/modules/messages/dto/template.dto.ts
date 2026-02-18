import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ===========================================
// Message Template DTOs
// ===========================================

export class CreateTemplateDto {
  @ApiProperty({ description: 'Template name', example: 'Welcome Message' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Template category', example: 'general' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  category?: string;

  @ApiProperty({ description: 'Template content (JSON or text)' })
  @IsNotEmpty()
  content: any; // Prisma Json field — accepts string, object, or array
}

export class UpdateTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Template category' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ description: 'Template content (JSON or text)' })
  @IsOptional()
  content?: any;

  @ApiPropertyOptional({ description: 'Whether the template is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// ===========================================
// Canned Response DTOs
// ===========================================

export class CreateCannedResponseDto {
  @ApiProperty({ description: 'Shortcut trigger', example: 'greeting' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  shortcut: string;

  @ApiProperty({ description: 'Response title', example: 'Quick Greeting' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiProperty({ description: 'Response content text' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'Response category', example: 'support' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  category?: string;
}

export class UpdateCannedResponseDto {
  @ApiPropertyOptional({ description: 'Shortcut trigger' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  shortcut?: string;

  @ApiPropertyOptional({ description: 'Response title' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ description: 'Response content text' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: 'Response category' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  category?: string;
}
