import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InitiateOAuthDto {
  @ApiProperty({ description: 'Workspace ID to connect Facebook to' })
  @IsUUID()
  @IsNotEmpty()
  workspaceId: string;

  @ApiPropertyOptional({ description: 'Redirect URL after OAuth completion' })
  @IsString()
  @IsOptional()
  redirectUrl?: string;
}

export class OAuthCallbackDto {
  @ApiProperty({ description: 'Authorization code from Facebook' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'State parameter for validation' })
  @IsString()
  @IsNotEmpty()
  state: string;
}

export class ConnectPageDto {
  @ApiProperty({ description: 'Facebook Account ID (UUID)' })
  @IsUUID('4', { message: 'facebookAccountId must be a valid UUID' })
  @IsNotEmpty({ message: 'facebookAccountId is required' })
  facebookAccountId: string;

  @ApiProperty({ description: 'Facebook Page ID (numeric string)' })
  @IsString({ message: 'pageId must be a string' })
  @IsNotEmpty({ message: 'pageId is required' })
  pageId: string;

  @ApiProperty({ description: 'Page name' })
  @IsString({ message: 'pageName must be a string' })
  @IsNotEmpty({ message: 'pageName is required' })
  pageName: string;

  @ApiPropertyOptional({ description: 'Page access token' })
  @IsString()
  @IsOptional()
  pageAccessToken?: string;
}

export class DisconnectPageDto {
  @ApiProperty({ description: 'Page ID to disconnect' })
  @IsUUID()
  @IsNotEmpty()
  pageId: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Facebook Account ID' })
  @IsUUID()
  @IsNotEmpty()
  facebookAccountId: string;
}
