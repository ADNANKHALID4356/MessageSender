import { Module } from '@nestjs/common';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { CustomFieldsService } from './custom-fields.service';
import { ImportExportService } from './import-export.service';
import { EngagementScoringService } from './engagement-scoring.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ContactsController],
  providers: [ContactsService, CustomFieldsService, ImportExportService, EngagementScoringService],
  exports: [ContactsService, CustomFieldsService, ImportExportService, EngagementScoringService],
})
export class ContactsModule {}
