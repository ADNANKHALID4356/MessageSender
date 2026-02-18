// ===========================================
// EncryptionService — Comprehensive Unit Tests
// Covers: encrypt/decrypt, format validation, error handling,
//         migration helpers, constant-time compare, key rotation
// ===========================================

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let configService: ConfigService;

  const VALID_KEY = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'; // 64 hex chars = 32 bytes

  const createService = async (overrides: Record<string, string> = {}) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: string) => {
              const env: Record<string, string> = {
                ENCRYPTION_KEY: VALID_KEY,
                NODE_ENV: 'test',
                ...overrides,
              };
              return env[key] ?? defaultVal;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
    configService = module.get<ConfigService>(ConfigService);
    service.onModuleInit();
    return { service, configService };
  };

  beforeEach(async () => {
    await createService();
  });

  // ===========================================
  // Basic Encrypt/Decrypt
  // ===========================================

  describe('encrypt/decrypt round-trip', () => {
    it('should encrypt and decrypt a simple string', () => {
      const plaintext = 'my-secret-token';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt an empty-ish string', () => {
      const plaintext = ' ';
      const encrypted = service.encrypt(plaintext);
      expect(service.decrypt(encrypted)).toBe(plaintext);
    });

    it('should encrypt and decrypt unicode characters', () => {
      const plaintext = '🔑 تشفير 加密 шифрование';
      const encrypted = service.encrypt(plaintext);
      expect(service.decrypt(encrypted)).toBe(plaintext);
    });

    it('should encrypt and decrypt a very long token', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = service.encrypt(plaintext);
      expect(service.decrypt(encrypted)).toBe(plaintext);
    });

    it('should encrypt and decrypt a real-looking Facebook token', () => {
      const plaintext = 'EAABsbCS1VWgBAMzZC6ZB5kZBZCfZAHqLVJ5yHOeGZAYj4ZC2';
      const encrypted = service.encrypt(plaintext);
      expect(service.decrypt(encrypted)).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'same-token';
      const enc1 = service.encrypt(plaintext);
      const enc2 = service.encrypt(plaintext);
      expect(enc1).not.toBe(enc2);
      // But both should decrypt to the same value
      expect(service.decrypt(enc1)).toBe(plaintext);
      expect(service.decrypt(enc2)).toBe(plaintext);
    });
  });

  // ===========================================
  // Output Format Validation
  // ===========================================

  describe('encrypted output format', () => {
    it('should produce format iv:authTag:ciphertext', () => {
      const encrypted = service.encrypt('test');
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
    });

    it('should produce valid base64 parts', () => {
      const encrypted = service.encrypt('test');
      const parts = encrypted.split(':');
      for (const part of parts) {
        expect(() => Buffer.from(part, 'base64')).not.toThrow();
      }
    });

    it('should have correct IV length (12 bytes = 16 base64 chars)', () => {
      const encrypted = service.encrypt('test');
      const iv = Buffer.from(encrypted.split(':')[0], 'base64');
      expect(iv.length).toBe(12);
    });

    it('should have correct auth tag length (16 bytes)', () => {
      const encrypted = service.encrypt('test');
      const authTag = Buffer.from(encrypted.split(':')[1], 'base64');
      expect(authTag.length).toBe(16);
    });
  });

  // ===========================================
  // Error Handling
  // ===========================================

  describe('error handling', () => {
    it('should throw on encrypt with empty string', () => {
      expect(() => service.encrypt('')).toThrow('Cannot encrypt empty or null value');
    });

    it('should throw on encrypt with null/undefined', () => {
      expect(() => service.encrypt(null as any)).toThrow('Cannot encrypt empty or null value');
      expect(() => service.encrypt(undefined as any)).toThrow('Cannot encrypt empty or null value');
    });

    it('should throw on decrypt with empty string', () => {
      expect(() => service.decrypt('')).toThrow('Cannot decrypt empty or null value');
    });

    it('should throw on decrypt with null/undefined', () => {
      expect(() => service.decrypt(null as any)).toThrow('Cannot decrypt empty or null value');
      expect(() => service.decrypt(undefined as any)).toThrow('Cannot decrypt empty or null value');
    });

    it('should throw on decrypt with invalid format (no colons)', () => {
      expect(() => service.decrypt('not-valid')).toThrow('Invalid encrypted value format');
    });

    it('should throw on decrypt with invalid format (wrong part count)', () => {
      expect(() => service.decrypt('a:b')).toThrow('Invalid encrypted value format');
      expect(() => service.decrypt('a:b:c:d')).toThrow('Invalid encrypted value format');
    });

    it('should throw on decrypt with tampered ciphertext', () => {
      const encrypted = service.encrypt('secret');
      const parts = encrypted.split(':');
      // Tamper with the ciphertext
      const tampered = [parts[0], parts[1], 'dGFtcGVyZWQ='].join(':');
      expect(() => service.decrypt(tampered)).toThrow();
    });

    it('should throw on decrypt with tampered auth tag', () => {
      const encrypted = service.encrypt('secret');
      const parts = encrypted.split(':');
      // Replace auth tag with a different 16-byte value
      const fakeTag = Buffer.alloc(16, 0xff).toString('base64');
      const tampered = [parts[0], fakeTag, parts[2]].join(':');
      expect(() => service.decrypt(tampered)).toThrow();
    });

    it('should throw on decrypt with wrong key', async () => {
      const encrypted = service.encrypt('secret');
      // Create a new service with a different key
      const differentKey = 'b'.repeat(64);
      await createService({ ENCRYPTION_KEY: differentKey });
      expect(() => service.decrypt(encrypted)).toThrow();
    });
  });

  // ===========================================
  // Key Validation
  // ===========================================

  describe('key validation', () => {
    it('should accept a valid 64-char hex key', async () => {
      await expect(createService({ ENCRYPTION_KEY: VALID_KEY })).resolves.not.toThrow();
    });

    it('should use default key in dev when none provided', async () => {
      await createService({ ENCRYPTION_KEY: '', NODE_ENV: 'development' });
      // Should work with default key
      const encrypted = service.encrypt('test');
      expect(service.decrypt(encrypted)).toBe('test');
    });

    it('should throw in production when no key is set', async () => {
      await expect(
        createService({ ENCRYPTION_KEY: '', NODE_ENV: 'production' }),
      ).rejects.toThrow('ENCRYPTION_KEY is required in production/staging');
    });

    it('should throw in staging when no key is set', async () => {
      await expect(
        createService({ ENCRYPTION_KEY: '', NODE_ENV: 'staging' }),
      ).rejects.toThrow('ENCRYPTION_KEY is required in production/staging');
    });
  });

  // ===========================================
  // isEncrypted detection
  // ===========================================

  describe('isEncrypted', () => {
    it('should return true for encrypted values', () => {
      const encrypted = service.encrypt('test-token');
      expect(service.isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plaintext', () => {
      expect(service.isEncrypted('EAABsbCS1VWgBAMzZC6ZB5kZBZCfZAHqLVJ5yHOeGZAYj4ZC2')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(service.isEncrypted('')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(service.isEncrypted(null as any)).toBe(false);
      expect(service.isEncrypted(undefined as any)).toBe(false);
    });

    it('should return false for random colons', () => {
      expect(service.isEncrypted('a:b:c')).toBe(false);
    });
  });

  // ===========================================
  // Idempotent encrypt/decrypt helpers
  // ===========================================

  describe('encryptIfNeeded', () => {
    it('should encrypt plaintext', () => {
      const plaintext = 'facebook-token';
      const result = service.encryptIfNeeded(plaintext);
      expect(result).not.toBe(plaintext);
      expect(service.decrypt(result)).toBe(plaintext);
    });

    it('should not re-encrypt already encrypted value', () => {
      const encrypted = service.encrypt('token');
      const result = service.encryptIfNeeded(encrypted);
      expect(result).toBe(encrypted); // should be unchanged
    });

    it('should return empty string for empty input', () => {
      expect(service.encryptIfNeeded('')).toBe('');
    });
  });

  describe('decryptIfNeeded', () => {
    it('should decrypt encrypted values', () => {
      const encrypted = service.encrypt('secret');
      expect(service.decryptIfNeeded(encrypted)).toBe('secret');
    });

    it('should return plaintext as-is', () => {
      const plaintext = 'not-encrypted';
      expect(service.decryptIfNeeded(plaintext)).toBe(plaintext);
    });

    it('should return empty string for empty input', () => {
      expect(service.decryptIfNeeded('')).toBe('');
    });
  });

  // ===========================================
  // Constant-Time Compare
  // ===========================================

  describe('constantTimeCompare', () => {
    it('should return true for matching plaintext and encrypted', () => {
      const plaintext = 'my-token';
      const encrypted = service.encrypt(plaintext);
      expect(service.constantTimeCompare(plaintext, encrypted)).toBe(true);
    });

    it('should return false for non-matching', () => {
      const encrypted = service.encrypt('correct');
      expect(service.constantTimeCompare('wrong', encrypted)).toBe(false);
    });

    it('should return false for invalid encrypted input', () => {
      expect(service.constantTimeCompare('test', 'not-encrypted')).toBe(false);
    });

    it('should return false for length mismatch', () => {
      const encrypted = service.encrypt('short');
      expect(service.constantTimeCompare('much-longer-string', encrypted)).toBe(false);
    });
  });

  // ===========================================
  // Key Rotation (re-encrypt)
  // ===========================================

  describe('reEncrypt', () => {
    it('should produce different ciphertext with same key (new IV)', () => {
      const original = service.encrypt('token');
      const rotated = service.reEncrypt(original);
      expect(rotated).not.toBe(original);
      expect(service.decrypt(rotated)).toBe('token');
    });

    it('should throw on invalid input', () => {
      expect(() => service.reEncrypt('invalid')).toThrow();
    });
  });

  // ===========================================
  // Grey Hat / Security Edge Cases
  // ===========================================

  describe('security edge cases', () => {
    it('should not leak plaintext in error messages', () => {
      try {
        service.decrypt('dGVzdA==:dGVzdA==:dGVzdA=='); // valid base64 but bad crypto
      } catch (error: any) {
        expect(error.message).not.toContain('secret');
        expect(error.message).not.toContain('token');
      }
    });

    it('should handle colons in plaintext correctly', () => {
      const plaintext = 'part1:part2:part3:part4';
      const encrypted = service.encrypt(plaintext);
      expect(service.decrypt(encrypted)).toBe(plaintext);
    });

    it('should handle base64-looking plaintext', () => {
      const plaintext = 'dGVzdDoxMjM0'; // valid base64 of "test:1234"
      const encrypted = service.encrypt(plaintext);
      expect(service.decrypt(encrypted)).toBe(plaintext);
    });

    it('should handle binary-safe data', () => {
      const plaintext = '\x00\x01\x02\xFF\xFE\xFD';
      const encrypted = service.encrypt(plaintext);
      expect(service.decrypt(encrypted)).toBe(plaintext);
    });

    it('should not be vulnerable to padding oracle (GCM has no padding)', () => {
      const encrypted = service.encrypt('test');
      const parts = encrypted.split(':');
      // Flip one bit in ciphertext
      const ct = Buffer.from(parts[2], 'base64');
      ct[0] ^= 1;
      const modified = [parts[0], parts[1], ct.toString('base64')].join(':');
      // GCM should reject this due to auth tag mismatch
      expect(() => service.decrypt(modified)).toThrow();
    });

    it('should detect IV reuse (would require implementation change to be vulnerable)', () => {
      // Encrypt same plaintext multiple times — IVs must differ
      const results = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const encrypted = service.encrypt('same');
        const iv = encrypted.split(':')[0];
        results.add(iv);
      }
      // All IVs should be unique
      expect(results.size).toBe(100);
    });
  });
});
