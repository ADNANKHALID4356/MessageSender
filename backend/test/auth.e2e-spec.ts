/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Skip if no database connection (for CI environments without DB)
    if (!process.env.DATABASE_URL || process.env.SKIP_E2E_TESTS === 'true') {
      console.log('Skipping E2E tests - no database connection');
      return;
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /auth/login', () => {
    it('should return 401 for invalid credentials', async () => {
      if (!app) return;

      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'nonexistent@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should require username and password', async () => {
      if (!app) return;

      return request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400);
    });
  });

  describe('POST /auth/admin/login', () => {
    it('should return 401 for invalid admin credentials', async () => {
      if (!app) return;

      return request(app.getHttpServer())
        .post('/auth/admin/login')
        .send({
          username: 'nonexistent',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should return 401 without auth token', async () => {
      if (!app) return;

      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      if (!app) return;

      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return 401 with invalid refresh token', async () => {
      if (!app) return;

      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should return 401 without auth token', async () => {
      if (!app) return;

      return request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });
  });

  describe('POST /auth/change-password', () => {
    it('should return 401 without auth token', async () => {
      if (!app) return;

      return request(app.getHttpServer())
        .post('/auth/change-password')
        .send({
          currentPassword: 'oldPassword',
          newPassword: 'newPassword',
        })
        .expect(401);
    });
  });
});
