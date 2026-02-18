import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { DripCampaignService } from './drip-campaign.service';
import { AbTestingService } from './ab-testing.service';
import { TriggerCampaignService } from './trigger-campaign.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { MessagesModule } from '../messages/messages.module';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    MessagesModule,
    RedisModule,
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService, DripCampaignService, AbTestingService, TriggerCampaignService],
  exports: [CampaignsService, DripCampaignService, AbTestingService, TriggerCampaignService],
})
export class CampaignsModule {}
