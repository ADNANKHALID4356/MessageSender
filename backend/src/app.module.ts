import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

// Core modules
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { EncryptionModule } from './common/encryption.module';
import { envValidationSchema } from './config/env.validation';
import { AllExceptionsFilter } from './common/http-exception.filter';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { UsersModule } from './modules/users/users.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { FacebookModule } from './modules/facebook/facebook.module';
import { PagesModule } from './modules/pages/pages.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { MessagesModule } from './modules/messages/messages.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { SegmentsModule } from './modules/segments/segments.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // Configuration with validation — fail fast on missing env vars
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false, // report ALL errors at once
        allowUnknown: true,
      },
    }),

    // Rate limiting — reads THROTTLE_TTL and THROTTLE_LIMIT from env
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ([
        {
          ttl: config.get<number>('THROTTLE_TTL', 60000),
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ]),
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // Core modules
    PrismaModule,
    RedisModule,
    EncryptionModule,

    // Feature modules
    AuthModule,
    AdminModule,
    UsersModule,
    WorkspacesModule,
    FacebookModule,
    PagesModule,
    ContactsModule,
    MessagesModule,
    ConversationsModule,
    CampaignsModule,
    SegmentsModule,
    WebhooksModule,
    AnalyticsModule,
    HealthModule,
  ],
  providers: [
    // Global exception filter — standardised error responses
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // Global throttle guard — enforces rate limiting on all endpoints
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
