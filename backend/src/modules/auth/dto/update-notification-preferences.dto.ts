import { IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class EmailNotificationPrefsDto {
  @ApiPropertyOptional({ description: 'New message notifications' })
  @IsOptional()
  @IsBoolean()
  newMessage?: boolean;

  @ApiPropertyOptional({ description: 'Campaign completed notifications' })
  @IsOptional()
  @IsBoolean()
  campaignComplete?: boolean;

  @ApiPropertyOptional({ description: 'Weekly report emails' })
  @IsOptional()
  @IsBoolean()
  weeklyReport?: boolean;

  @ApiPropertyOptional({ description: 'Security alert emails' })
  @IsOptional()
  @IsBoolean()
  securityAlerts?: boolean;
}

class PushNotificationPrefsDto {
  @ApiPropertyOptional({ description: 'Real-time message notifications' })
  @IsOptional()
  @IsBoolean()
  messages?: boolean;

  @ApiPropertyOptional({ description: 'Mention notifications' })
  @IsOptional()
  @IsBoolean()
  mentions?: boolean;

  @ApiPropertyOptional({ description: 'System update notifications' })
  @IsOptional()
  @IsBoolean()
  updates?: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ description: 'Email notification preferences', type: EmailNotificationPrefsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailNotificationPrefsDto)
  email?: EmailNotificationPrefsDto;

  @ApiPropertyOptional({ description: 'Push notification preferences', type: PushNotificationPrefsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PushNotificationPrefsDto)
  push?: PushNotificationPrefsDto;
}
