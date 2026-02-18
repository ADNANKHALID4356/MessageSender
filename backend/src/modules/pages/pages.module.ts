import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FacebookModule } from '../facebook/facebook.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { RedisModule } from '../../redis/redis.module';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';
import { PageSyncService } from './page-sync.service';

@Module({
  imports: [PrismaModule, FacebookModule, WorkspacesModule, RedisModule],
  controllers: [PagesController],
  providers: [PagesService, PageSyncService],
  exports: [PagesService, PageSyncService],
})
export class PagesModule {}
