import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { FacebookController } from './facebook.controller';
import { FacebookService } from './facebook.service';
import { FacebookApiService } from './facebook-api.service';
import { FacebookConfigService } from './facebook-config.service';

@Module({
  imports: [ConfigModule, PrismaModule, RedisModule],
  controllers: [FacebookController],
  providers: [FacebookService, FacebookApiService, FacebookConfigService],
  exports: [FacebookService, FacebookApiService, FacebookConfigService],
})
export class FacebookModule {}
