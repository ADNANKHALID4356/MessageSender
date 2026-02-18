import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConnectPageDto {
  @ApiProperty({ description: 'Facebook Page ID' })
  @IsString()
  @IsNotEmpty()
  pageId: string;

  @ApiProperty({ description: 'Page name' })
  @IsString()
  @IsNotEmpty()
  pageName: string;

  @ApiProperty({ description: 'Facebook Account ID' })
  @IsUUID()
  @IsNotEmpty()
  facebookAccountId: string;
}

export class UpdatePageDto {
  @ApiPropertyOptional({ description: 'Welcome message for new conversations' })
  @IsString()
  @IsOptional()
  welcomeMessage?: string;

  @ApiPropertyOptional({ description: 'Away message when not available' })
  @IsString()
  @IsOptional()
  awayMessage?: string;

  @ApiPropertyOptional({ description: 'Whether page is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Custom page settings JSON' })
  @IsOptional()
  settings?: Record<string, unknown>;
}

export class PageStatsDto {
  totalConversations: number;
  activeConversations: number;
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  totalContacts: number;
  averageResponseTime?: number;
}
