/**
 * Phase 3 — Hardening Integration Tests
 *
 * Validates that all five Phase 3 features are correctly wired:
 *   3.1 Global rate limiting (ThrottlerGuard as APP_GUARD)
 *   3.2 WebSocket CORS (dynamic CORS from FRONTEND_URL)
 *   3.3 Public health endpoint (HealthModule with liveness + readiness)
 *   3.4 Login brute-force protection (LoginRateLimitGuard wired to login)
 *   3.5 Swagger gated in production
 */

import 'reflect-metadata';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from '../app.module';
import { WebhooksController } from './webhooks/webhooks.controller';
import { AuthController } from './auth/auth.controller';
import { InboxGateway } from './conversations/inbox.gateway';
import { HealthModule } from './health/health.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { LoginRateLimitGuard } from './auth/guards/rate-limit.guard';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 3 — Hardening', () => {
  // =====================
  // 3.1 Global Rate Limiting
  // =====================
  describe('3.1 Global Rate Limiting', () => {
    it('AppModule should register ThrottlerGuard as APP_GUARD', () => {
      const providers = Reflect.getMetadata('providers', AppModule);
      expect(providers).toBeDefined();

      const guardProvider = providers.find(
        (p: any) => p && p.provide === APP_GUARD && p.useClass === ThrottlerGuard,
      );
      expect(guardProvider).toBeDefined();
      expect(guardProvider.useClass).toBe(ThrottlerGuard);
    });

    it('AppModule should import ThrottlerModule', () => {
      const imports = Reflect.getMetadata('imports', AppModule);
      expect(imports).toBeDefined();

      const throttlerImport = imports.find(
        (i: any) => i && (i.module?.name === 'ThrottlerModule' || i.name === 'ThrottlerModule'),
      );
      expect(throttlerImport).toBeDefined();
    });

    it('WebhooksController should have @SkipThrottle()', () => {
      // @SkipThrottle() stores metadata as THROTTLER:SKIP + name ('default')
      const skipMeta = Reflect.getMetadata('THROTTLER:SKIPdefault', WebhooksController);
      expect(skipMeta).toBe(true);
    });

    it('AuthController adminLogin should have @Throttle() with 10 requests/60s', () => {
      // @Throttle stores each field with key THROTTLER:<FIELD><name>
      const limitMeta = Reflect.getMetadata('THROTTLER:LIMITdefault', AuthController.prototype.adminLogin);
      const ttlMeta = Reflect.getMetadata('THROTTLER:TTLdefault', AuthController.prototype.adminLogin);
      expect(limitMeta).toBe(10);
      expect(ttlMeta).toBe(60000);
    });

    it('AuthController userLogin should have @Throttle() with 10 requests/60s', () => {
      const limitMeta = Reflect.getMetadata('THROTTLER:LIMITdefault', AuthController.prototype.userLogin);
      const ttlMeta = Reflect.getMetadata('THROTTLER:TTLdefault', AuthController.prototype.userLogin);
      expect(limitMeta).toBe(10);
      expect(ttlMeta).toBe(60000);
    });
  });

  // =====================
  // 3.2 WebSocket CORS
  // =====================
  describe('3.2 WebSocket CORS', () => {
    it('InboxGateway source should NOT contain hardcoded origin: * string', () => {
      // Read the source file to verify no cors: { origin: '*' }
      const gatewayPath = path.resolve(__dirname, './conversations/inbox.gateway.ts');
      const src = fs.readFileSync(gatewayPath, 'utf-8');
      // The decorator options should not have origin: '*'
      const decoratorMatch = src.match(/@WebSocketGateway\(([^)]+)\)/s);
      if (decoratorMatch) {
        expect(decoratorMatch[1]).not.toContain("origin: '*'");
        expect(decoratorMatch[1]).not.toContain('origin: "*"');
      }
    });

    it('InboxGateway should have afterInit method for dynamic CORS', () => {
      expect(InboxGateway.prototype.afterInit).toBeDefined();
      expect(typeof InboxGateway.prototype.afterInit).toBe('function');
    });

    it('InboxGateway should implement OnGatewayInit', () => {
      const gateway = Object.create(InboxGateway.prototype);
      expect('afterInit' in gateway).toBe(true);
    });
  });

  // =====================
  // 3.3 Public Health Endpoint
  // =====================
  describe('3.3 Public Health Endpoint', () => {
    it('HealthModule should be imported in AppModule', () => {
      const imports = Reflect.getMetadata('imports', AppModule);
      const healthImport = imports.find((i: any) => i === HealthModule);
      expect(healthImport).toBeDefined();
    });

    it('HealthModule should import TerminusModule', () => {
      const imports = Reflect.getMetadata('imports', HealthModule);
      expect(imports).toBeDefined();

      const terminusImport = imports.find(
        (i: any) => i && (i.name === 'TerminusModule' || i.module?.name === 'TerminusModule'),
      );
      expect(terminusImport).toBeDefined();
    });

    it('HealthController should have @Public() on check endpoint', () => {
      const isPublic = Reflect.getMetadata('isPublic', HealthController.prototype.check);
      expect(isPublic).toBe(true);
    });

    it('HealthController should have @SkipThrottle() on check endpoint', () => {
      const skipThrottle = Reflect.getMetadata(
        'THROTTLER:SKIPdefault',
        HealthController.prototype.check,
      );
      expect(skipThrottle).toBe(true);
    });

    it('HealthController should have @Public() on readiness endpoint', () => {
      const isPublic = Reflect.getMetadata('isPublic', HealthController.prototype.readiness);
      expect(isPublic).toBe(true);
    });

    it('HealthController should have @SkipThrottle() on readiness endpoint', () => {
      const skipThrottle = Reflect.getMetadata(
        'THROTTLER:SKIPdefault',
        HealthController.prototype.readiness,
      );
      expect(skipThrottle).toBe(true);
    });

    it('HealthController should be decorated with @Controller("health")', () => {
      const controllerPath = Reflect.getMetadata('path', HealthController);
      expect(controllerPath).toBe('health');
    });
  });

  // =====================
  // 3.4 Login Brute-Force Protection
  // =====================
  describe('3.4 Login Brute-Force Protection', () => {
    it('AuthModule should include LoginRateLimitGuard in providers', () => {
      const providers = Reflect.getMetadata('providers', AuthModule);
      expect(providers).toContain(LoginRateLimitGuard);
    });

    it('AuthModule should export LoginRateLimitGuard', () => {
      const exports = Reflect.getMetadata('exports', AuthModule);
      expect(exports).toContain(LoginRateLimitGuard);
    });

    it('AuthModule should import RedisModule', () => {
      const imports = Reflect.getMetadata('imports', AuthModule);

      const redisImport = imports.find(
        (i: any) => i && (i.name === 'RedisModule' || i.module?.name === 'RedisModule'),
      );
      expect(redisImport).toBeDefined();
    });

    it('AuthController adminLogin should use LoginRateLimitGuard', () => {
      const guards = Reflect.getMetadata('__guards__', AuthController.prototype.adminLogin);
      expect(guards).toBeDefined();
      expect(guards).toContain(LoginRateLimitGuard);
    });

    it('AuthController userLogin should use LoginRateLimitGuard', () => {
      const guards = Reflect.getMetadata('__guards__', AuthController.prototype.userLogin);
      expect(guards).toBeDefined();
      expect(guards).toContain(LoginRateLimitGuard);
    });

    it('LoginRateLimitGuard should have correct API methods', () => {
      expect(LoginRateLimitGuard.prototype).toHaveProperty('recordFailedAttempt');
      expect(LoginRateLimitGuard.prototype).toHaveProperty('clearAttempts');
      expect(LoginRateLimitGuard.prototype).toHaveProperty('canActivate');
    });
  });

  // =====================
  // 3.5 Swagger in Production
  // =====================
  describe('3.5 Swagger in Production', () => {
    const mainPath = path.resolve(__dirname, '../main.ts');
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(mainPath, 'utf-8');
    });

    it('main.ts should gate Swagger behind NODE_ENV !== production', () => {
      expect(content).toContain("configService.get('NODE_ENV') !== 'production'");
      expect(content).toContain('SwaggerModule.setup');
      expect(content).toContain('SwaggerModule.createDocument');

      const swaggerIfBlock = content.match(
        /if\s*\(configService\.get\('NODE_ENV'\)\s*!==\s*'production'\)\s*\{([\s\S]*?)\}/,
      );
      expect(swaggerIfBlock).toBeDefined();
      if (swaggerIfBlock) {
        const blockContent = swaggerIfBlock[1];
        expect(blockContent).toContain('SwaggerModule.setup');
        expect(blockContent).toContain('Swagger docs enabled');
      }
    });

    it('Swagger log should not reference port variable', () => {
      const swaggerLogMatch = content.match(/Swagger docs.*/g);
      expect(swaggerLogMatch).toBeDefined();
      if (swaggerLogMatch) {
        const swaggerLog = swaggerLogMatch.find((l: string) => l.includes('Swagger'));
        expect(swaggerLog).toBeDefined();
        expect(swaggerLog).not.toContain('${port}');
      }
    });

    it('main.ts should use helmet and compression middleware', () => {
      expect(content).toContain('app.use(helmet())');
      expect(content).toContain('app.use(compression())');
    });

    it('main.ts CORS should read from FRONTEND_URL env variable', () => {
      expect(content).toContain('FRONTEND_URL');
      expect(content).toContain('enableCors');
    });

    it('main.ts should enable shutdown hooks', () => {
      expect(content).toContain('enableShutdownHooks');
    });
  });
});
