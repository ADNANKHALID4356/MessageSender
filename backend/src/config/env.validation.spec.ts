// ===========================================
// Environment Validation Schema — Unit Tests
// Tests all required/optional env vars, type coercion, defaults,
// conditional requirements, and error messages
// ===========================================

import { envValidationSchema } from './env.validation';

describe('envValidationSchema', () => {
  // Helper: validate with base valid env + overrides
  const validate = (overrides: Record<string, unknown> = {}) => {
    const baseEnv = {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      JWT_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      ENCRYPTION_KEY: 'a'.repeat(64),
      ...overrides,
    };
    return envValidationSchema.validate(baseEnv);
  };

  // ===========================================
  // Valid Configurations
  // ===========================================

  describe('valid configurations', () => {
    it('should accept minimal valid env (test)', () => {
      const { error } = validate();
      expect(error).toBeUndefined();
    });

    it('should accept full production env', () => {
      const { error } = validate({
        NODE_ENV: 'production',
        PORT: 4000,
        FACEBOOK_APP_ID: '123456',
        FACEBOOK_APP_SECRET: 'secret',
        FACEBOOK_WEBHOOK_VERIFY_TOKEN: 'verify-token',
        ENCRYPTION_KEY: 'a'.repeat(64),
        SENTRY_DSN: 'https://key@sentry.io/1',
      });
      expect(error).toBeUndefined();
    });

    it('should accept development env without Facebook vars', () => {
      const { error } = validate({
        NODE_ENV: 'development',
      });
      expect(error).toBeUndefined();
    });

    it('should allow unknown env vars', () => {
      const { error } = validate({
        CUSTOM_VAR: 'value',
        ANOTHER_VAR: 'test',
      });
      expect(error).toBeUndefined();
    });
  });

  // ===========================================
  // Defaults
  // ===========================================

  describe('defaults', () => {
    it('should default NODE_ENV to development', () => {
      const { value } = validate({ NODE_ENV: undefined });
      expect(value.NODE_ENV).toBe('development');
    });

    it('should default PORT to 4000', () => {
      const { value } = validate();
      expect(value.PORT).toBe(4000);
    });

    it('should default JWT_EXPIRES_IN to 15m', () => {
      const { value } = validate();
      expect(value.JWT_EXPIRES_IN).toBe('15m');
    });

    it('should default JWT_REFRESH_EXPIRES_IN to 7d', () => {
      const { value } = validate();
      expect(value.JWT_REFRESH_EXPIRES_IN).toBe('7d');
    });

    it('should default FRONTEND_URL to http://localhost:3000', () => {
      const { value } = validate();
      expect(value.FRONTEND_URL).toBe('http://localhost:3000');
    });

    it('should default FACEBOOK_API_VERSION to v18.0', () => {
      const { value } = validate();
      expect(value.FACEBOOK_API_VERSION).toBe('v18.0');
    });

    it('should default THROTTLE_TTL and THROTTLE_LIMIT', () => {
      const { value } = validate();
      expect(value.THROTTLE_TTL).toBe(60000);
      expect(value.THROTTLE_LIMIT).toBe(100);
    });
  });

  // ===========================================
  // Required Fields (Missing)
  // ===========================================

  describe('required fields', () => {
    it('should fail when DATABASE_URL is missing', () => {
      const { error } = validate({ DATABASE_URL: undefined });
      expect(error).toBeDefined();
      expect(error!.message).toContain('DATABASE_URL');
    });

    it('should fail when JWT_SECRET is missing', () => {
      const { error } = validate({ JWT_SECRET: undefined });
      expect(error).toBeDefined();
      expect(error!.message).toContain('JWT_SECRET');
    });

    it('should fail when JWT_REFRESH_SECRET is missing', () => {
      const { error } = validate({ JWT_REFRESH_SECRET: undefined });
      expect(error).toBeDefined();
      expect(error!.message).toContain('JWT_REFRESH_SECRET');
    });
  });

  // ===========================================
  // JWT_SECRET Minimum Length
  // ===========================================

  describe('JWT_SECRET validation', () => {
    it('should fail when JWT_SECRET is too short', () => {
      const { error } = validate({ JWT_SECRET: 'short' });
      expect(error).toBeDefined();
      expect(error!.message).toContain('32 characters');
    });

    it('should accept JWT_SECRET of exactly 32 chars', () => {
      const { error } = validate({ JWT_SECRET: 'x'.repeat(32) });
      expect(error).toBeUndefined();
    });
  });

  // ===========================================
  // ENCRYPTION_KEY Validation
  // ===========================================

  describe('ENCRYPTION_KEY validation', () => {
    it('should accept valid 64-char hex key', () => {
      const { error } = validate({ ENCRYPTION_KEY: 'abcdef0123456789'.repeat(4) });
      expect(error).toBeUndefined();
    });

    it('should fail for non-hex characters in key', () => {
      const { error } = validate({ ENCRYPTION_KEY: 'g'.repeat(64) });
      expect(error).toBeDefined();
    });

    it('should fail for wrong length key', () => {
      const { error } = validate({ ENCRYPTION_KEY: 'a'.repeat(32) }); // 32 hex = 16 bytes, needs 64
      expect(error).toBeDefined();
    });

    it('should require key in production', () => {
      const { error } = validate({
        NODE_ENV: 'production',
        ENCRYPTION_KEY: undefined,
        FACEBOOK_APP_ID: '123',
        FACEBOOK_APP_SECRET: 'sec',
        FACEBOOK_WEBHOOK_VERIFY_TOKEN: 'tok',
      });
      expect(error).toBeDefined();
      expect(error!.message).toContain('ENCRYPTION_KEY');
    });

    it('should default in non-production', () => {
      const { error, value } = validate({
        NODE_ENV: 'development',
        ENCRYPTION_KEY: undefined,
      });
      expect(error).toBeUndefined();
      expect(value.ENCRYPTION_KEY).toBe('0'.repeat(64));
    });
  });

  // ===========================================
  // Conditional Facebook Vars (production only)
  // ===========================================

  describe('Facebook vars (conditional)', () => {
    it('should require FACEBOOK_APP_ID in production', () => {
      const { error } = validate({
        NODE_ENV: 'production',
        FACEBOOK_APP_ID: undefined,
        FACEBOOK_APP_SECRET: 'sec',
        FACEBOOK_WEBHOOK_VERIFY_TOKEN: 'tok',
      });
      expect(error).toBeDefined();
      expect(error!.message).toContain('FACEBOOK_APP_ID');
    });

    it('should require FACEBOOK_APP_SECRET in production', () => {
      const { error } = validate({
        NODE_ENV: 'production',
        FACEBOOK_APP_ID: '123',
        FACEBOOK_APP_SECRET: undefined,
        FACEBOOK_WEBHOOK_VERIFY_TOKEN: 'tok',
      });
      expect(error).toBeDefined();
      expect(error!.message).toContain('FACEBOOK_APP_SECRET');
    });

    it('should not require Facebook vars in development', () => {
      const { error } = validate({
        NODE_ENV: 'development',
        FACEBOOK_APP_ID: undefined,
        FACEBOOK_APP_SECRET: undefined,
      });
      expect(error).toBeUndefined();
    });
  });

  // ===========================================
  // NODE_ENV Validation
  // ===========================================

  describe('NODE_ENV', () => {
    it('should accept valid values', () => {
      for (const env of ['development', 'test']) {
        const { error } = validate({ NODE_ENV: env });
        expect(error).toBeUndefined();
      }
    });

    it('should accept production/staging with all required vars', () => {
      for (const env of ['production', 'staging']) {
        const { error } = validate({
          NODE_ENV: env,
          FACEBOOK_APP_ID: '123',
          FACEBOOK_APP_SECRET: 'sec',
          FACEBOOK_WEBHOOK_VERIFY_TOKEN: 'tok',
        });
        expect(error).toBeUndefined();
      }
    });

    it('should reject invalid NODE_ENV', () => {
      const { error } = validate({ NODE_ENV: 'invalid' });
      expect(error).toBeDefined();
    });
  });

  // ===========================================
  // PORT Validation
  // ===========================================

  describe('PORT', () => {
    it('should accept valid port numbers', () => {
      const { error } = validate({ PORT: 3000 });
      expect(error).toBeUndefined();
    });

    it('should reject port > 65535', () => {
      const { error } = validate({ PORT: 70000 });
      expect(error).toBeDefined();
    });
  });

  // ===========================================
  // SENTRY_DSN Validation
  // ===========================================

  describe('SENTRY_DSN', () => {
    it('should accept valid DSN URI', () => {
      const { error } = validate({ SENTRY_DSN: 'https://key@sentry.io/1' });
      expect(error).toBeUndefined();
    });

    it('should accept empty string (disabled)', () => {
      const { error } = validate({ SENTRY_DSN: '' });
      expect(error).toBeUndefined();
    });

    it('should accept missing (optional)', () => {
      const { error } = validate({ SENTRY_DSN: undefined });
      expect(error).toBeUndefined();
    });
  });

  // ===========================================
  // abortEarly: false — reports all errors
  // ===========================================

  describe('reports all errors at once', () => {
    it('should report multiple missing required fields', () => {
      const { error } = envValidationSchema.validate({
        NODE_ENV: 'test',
        // Missing: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
      });
      expect(error).toBeDefined();
      const messages = error!.details.map(d => d.message);
      expect(messages.length).toBeGreaterThanOrEqual(3);
    });
  });
});
