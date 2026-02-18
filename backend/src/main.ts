import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import * as Sentry from '@sentry/nestjs';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // ──────────────────────────────────────────
  // Sentry initialization (must be before NestFactory.create)
  // No-op when SENTRY_DSN is empty — safe for development
  // ──────────────────────────────────────────
  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
      debug: process.env.NODE_ENV === 'development',
      // Filter out health check transactions
      beforeSendTransaction(event) {
        if (event.transaction?.includes('/health')) return null;
        return event;
      },
    });
    logger.log('Sentry error tracking initialized');
  }

  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  const configService = app.get(ConfigService);

  // ──────────────────────────────────────────
  // Graceful Shutdown — drain connections on SIGTERM/SIGINT
  // ──────────────────────────────────────────
  app.enableShutdownHooks();

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // CORS configuration - support multiple frontend URLs
  const frontendUrls = configService.get<string>('FRONTEND_URL', 'http://localhost:3000').split(',').map(url => url.trim());
  app.enableCors({
    origin: frontendUrls,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-Id'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ──────────────────────────────────────────
  // Sentry Error Handler — captures and reports all unhandled exceptions
  // Must be added AFTER all routes & middleware
  // ──────────────────────────────────────────
  if (sentryDsn) {
    const expressApp = app.getHttpAdapter().getInstance();
    Sentry.setupExpressErrorHandler(expressApp);
    logger.log('Sentry Express error handler enabled');
  }

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Facebook Page Messaging Platform API')
      .setDescription('API documentation for Facebook Page Messaging Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('admin', 'Admin management endpoints')
      .addTag('users', 'User management endpoints')
      .addTag('workspaces', 'Workspace management endpoints')
      .addTag('pages', 'Facebook page management endpoints')
      .addTag('contacts', 'Contact management endpoints')
      .addTag('messages', 'Messaging endpoints')
      .addTag('campaigns', 'Campaign management endpoints')
      .addTag('segments', 'Segmentation endpoints')
      .addTag('analytics', 'Analytics endpoints')
      .addTag('webhooks', 'Facebook webhook endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    logger.log('Swagger docs enabled at /docs');
  }

  const port = configService.get<number>('PORT', 4000);
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}/api/v1`);
  logger.log(`Graceful shutdown hooks enabled`);

  // ──────────────────────────────────────────
  // Graceful shutdown signal logging
  // ──────────────────────────────────────────
  const shutdown = (signal: string) => {
    logger.log(`Received ${signal} — starting graceful shutdown...`);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
