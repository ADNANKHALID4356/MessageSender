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
  @ApiProperty({ description: 'Facebook Account ID' })
  @IsUUID()
  @IsNotEmpty()
  facebookAccountId: string;

  @ApiProperty({ description: 'Facebook Page ID' })
  @IsString()
  @IsNotEmpty()
  pageId: string;

  @ApiProperty({ description: 'Page name' })
  @IsString()
  @IsNotEmpty()
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
