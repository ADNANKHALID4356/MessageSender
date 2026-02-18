// ===========================================
// Environment Variable Validation Schema
// Validates ALL required env vars at startup — fail fast on misconfiguration
// ===========================================

import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // ──────────────────────────────────────────
  // Application
  // ──────────────────────────────────────────
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().port().default(4000),

  // ──────────────────────────────────────────
  // Database
  // ──────────────────────────────────────────
  DATABASE_URL: Joi.string().uri().required().messages({
    'any.required': 'DATABASE_URL is required (e.g., postgresql://user:pass@localhost:5432/dbname)',
    'string.uri': 'DATABASE_URL must be a valid connection URI',
  }),

  // ──────────────────────────────────────────
  // Redis
  // ──────────────────────────────────────────
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().integer().min(0).max(15).default(0),
  REDIS_URL: Joi.string().optional(),

  // ──────────────────────────────────────────
  // JWT Authentication
  // ──────────────────────────────────────────
  JWT_SECRET: Joi.string().min(32).required().messages({
    'any.required': 'JWT_SECRET is required (min 32 chars). Generate with: openssl rand -hex 32',
    'string.min': 'JWT_SECRET must be at least 32 characters for security',
  }),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required().messages({
    'any.required': 'JWT_REFRESH_SECRET is required (min 32 chars). Generate with: openssl rand -hex 32',
    'string.min': 'JWT_REFRESH_SECRET must be at least 32 characters for security',
  }),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // ──────────────────────────────────────────
  // Encryption (AES-256)
  // ──────────────────────────────────────────
  ENCRYPTION_KEY: Joi.string()
    .hex()
    .length(64)
    .when('NODE_ENV', {
      is: Joi.string().valid('production', 'staging'),
      then: Joi.required(),
      otherwise: Joi.optional().default('0'.repeat(64)),
    })
    .messages({
      'any.required': 'ENCRYPTION_KEY is required in production (64 hex chars = 32 bytes). Generate with: openssl rand -hex 32',
      'string.hex': 'ENCRYPTION_KEY must be a hexadecimal string',
      'string.length': 'ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)',
    }),

  // ──────────────────────────────────────────
  // Facebook API
  // ──────────────────────────────────────────
  FACEBOOK_APP_ID: Joi.string().when('NODE_ENV', {
    is: Joi.string().valid('production', 'staging'),
    then: Joi.required(),
    otherwise: Joi.optional().default(''),
  }).messages({
    'any.required': 'FACEBOOK_APP_ID is required in production',
  }),
  FACEBOOK_APP_SECRET: Joi.string().when('NODE_ENV', {
    is: Joi.string().valid('production', 'staging'),
    then: Joi.required(),
    otherwise: Joi.optional().default(''),
  }).messages({
    'any.required': 'FACEBOOK_APP_SECRET is required in production',
  }),
  FACEBOOK_WEBHOOK_VERIFY_TOKEN: Joi.string().when('NODE_ENV', {
    is: Joi.string().valid('production', 'staging'),
    then: Joi.required(),
    otherwise: Joi.optional().default('local-verify-token'),
  }).messages({
    'any.required': 'FACEBOOK_WEBHOOK_VERIFY_TOKEN is required in production',
  }),
  FACEBOOK_API_VERSION: Joi.string().default('v18.0'),

  // ──────────────────────────────────────────
  // SMTP / Email
  // ──────────────────────────────────────────
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().port().optional(),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  SMTP_FROM: Joi.string().optional(),
  SMTP_SECURE: Joi.boolean().optional(),

  // ──────────────────────────────────────────
  // Frontend
  // ──────────────────────────────────────────
  FRONTEND_URL: Joi.string().default('http://localhost:3000'),

  // ──────────────────────────────────────────
  // Sentry (optional — no-op when missing)
  // ──────────────────────────────────────────
  SENTRY_DSN: Joi.string().uri().allow('').optional(),
  SENTRY_ENVIRONMENT: Joi.string().optional(),

  // ──────────────────────────────────────────
  // Rate Limiting
  // ──────────────────────────────────────────
  THROTTLE_TTL: Joi.number().integer().positive().default(60000),
  THROTTLE_LIMIT: Joi.number().integer().positive().default(100),
}).options({
  // Allow extra env vars that we don't explicitly validate
  allowUnknown: true,
  // Report ALL validation errors at once, not just the first
  abortEarly: false,
});
