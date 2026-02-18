import { Injectable, Logger, OnModuleInit, OnModuleDestroy, OnApplicationShutdown } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Prisma disconnecting on ${signal || 'shutdown'}...`);
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }

  // Clean database for testing
  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanDatabase can only be called in test environment');
    }

    const models = Reflect.ownKeys(this).filter((key): key is string => {
      return (
        typeof key === 'string' &&
        !key.startsWith('_') &&
        !key.startsWith('$') &&
        typeof (this as unknown as Record<string, unknown>)[key] === 'object' &&
        ((this as unknown as Record<string, { deleteMany?: unknown }>)[key])?.deleteMany !== undefined
      );
    });

    return Promise.all(
      models.map((modelKey) => {
        return (this as unknown as Record<string, { deleteMany: () => Promise<unknown> }>)[modelKey].deleteMany();
      }),
    );
  }
}
