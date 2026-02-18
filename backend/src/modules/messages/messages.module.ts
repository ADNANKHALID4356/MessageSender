import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ContactsModule } from '../contacts/contacts.module';
import { FacebookModule } from '../facebook/facebook.module';
import { RedisModule } from '../../redis/redis.module';
import { SendApiService } from './send-api.service';
import { OtnService } from './otn.service';
import { RecurringNotificationService } from './recurring-notification.service';
import { RateLimitService } from './rate-limit.service';
import { MessageQueueService } from './message-queue.service';
import { MessageWorkerService } from './message-worker.service';
import { TemplatesService } from './templates.service';
import { ComplianceService } from './compliance.service';
import { SponsoredMessageService } from './sponsored-message.service';

@Module({
  imports: [
    PrismaModule,
    ContactsModule,
    FacebookModule,
    RedisModule,
  ],
  controllers: [MessagesController],
  providers: [
    MessagesService,
    SendApiService,
    OtnService,
    RecurringNotificationService,
    RateLimitService,
    MessageQueueService,
    MessageWorkerService,
    TemplatesService,
    ComplianceService,
    SponsoredMessageService,
  ],
  exports: [
    MessagesService,
    SendApiService,
    OtnService,
    RecurringNotificationService,
    RateLimitService,
    MessageQueueService,
    MessageWorkerService,
    TemplatesService,
    ComplianceService,
    SponsoredMessageService,
  ],
})
export class MessagesModule {}
