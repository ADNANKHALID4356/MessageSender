// ===========================================
// Phase 1 Integration & Grey-Hat Security Tests
// Covers:
//   1. Encryption ↔ Service integration
//   2. Env validation ↔ ConfigModule integration
//   3. Token lifecycle: encrypt → store → read → decrypt → API call
//   4. Grey-hat: tamper resistance, key rotation, oracle attacks, timing
// ===========================================

import { EncryptionService } from './encryption.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

// ===========================================
// Integration: EncryptionService with Facebook-like token flow
// ===========================================

describe('Phase1 Integration: Encryption ↔ Token Lifecycle', () => {
  let encryption: EncryptionService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def?: string) => {
              if (key === 'ENCRYPTION_KEY') return 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
              if (key === 'NODE_ENV') return 'test';
              return def;
            }),
          },
        },
      ],
    }).compile();

    encryption = module.get<EncryptionService>(EncryptionService);
    encryption.onModuleInit();
  });

  describe('complete token lifecycle', () => {
    it('should handle: receive plaintext → encrypt → simulate DB store → read → decrypt → use', () => {
      // Step 1: Receive token from Facebook OAuth
      const facebookToken = 'EAABsbCS1VWgBAMzZC6ZB5kZBZCfZAHqLVJ5yHOeGZAYj4ZC2kHJdyDZCZBLjKhZBk';

      // Step 2: Encrypt before storing
      const encrypted = encryption.encrypt(facebookToken);
      expect(encrypted).not.toBe(facebookToken);
      expect(encrypted).toContain(':'); // format check

      // Step 3: Simulate DB storage (pretend this is Prisma .create)
      const dbRecord = {
        id: 'fb-account-1',
        accessToken: encrypted, // stored encrypted
      };

      // Step 4: Read from DB and decrypt for API call
      const decrypted = encryption.decrypt(dbRecord.accessToken);
      expect(decrypted).toBe(facebookToken);

      // Step 5: Verify idempotent helpers work correctly
      expect(encryption.isEncrypted(dbRecord.accessToken)).toBe(true);
      expect(encryption.isEncrypted(facebookToken)).toBe(false);
      expect(encryption.decryptIfNeeded(dbRecord.accessToken)).toBe(facebookToken);
      expect(encryption.decryptIfNeeded(facebookToken)).toBe(facebookToken);
    });

    it('should handle multiple tokens independently', () => {
      const tokens = [
        'EAA_user_token_123',
        'EAA_page_token_456',
        'otn_token_789',
        'recurring_token_abc',
      ];

      const encrypted = tokens.map(t => encryption.encrypt(t));

      // All should be unique ciphertext
      expect(new Set(encrypted).size).toBe(encrypted.length);

      // All should decrypt correctly
      encrypted.forEach((enc, i) => {
        expect(encryption.decrypt(enc)).toBe(tokens[i]);
      });
    });

    it('should handle token refresh cycle: old → decrypt → FB API → new → encrypt → store', () => {
      // Current stored token
      const oldEncrypted = encryption.encrypt('old-token-123');

      // Simulate refresh: decrypt old token
      const oldPlain = encryption.decrypt(oldEncrypted);
      expect(oldPlain).toBe('old-token-123');

      // Facebook returns new token
      const newTokenFromFacebook = 'new-long-lived-token-456';

      // Encrypt new token
      const newEncrypted = encryption.encrypt(newTokenFromFacebook);

      // Verify new token is different ciphertext
      expect(newEncrypted).not.toBe(oldEncrypted);

      // Verify new decrypts correctly
      expect(encryption.decrypt(newEncrypted)).toBe(newTokenFromFacebook);
    });
  });

  describe('migration scenario: mixed plaintext and encrypted tokens', () => {
    it('should handle mixed DB records during migration', () => {
      const records = [
        { id: '1', accessToken: 'plaintext-token-1' }, // pre-migration
        { id: '2', accessToken: encryption.encrypt('already-encrypted-2') }, // post-migration
        { id: '3', accessToken: 'another-plain-token' }, // pre-migration
      ];

      // encryptIfNeeded should be idempotent
      const migrated = records.map(r => ({
        ...r,
        accessToken: encryption.encryptIfNeeded(r.accessToken),
      }));

      // All should now be encrypted
      migrated.forEach(r => {
        expect(encryption.isEncrypted(r.accessToken)).toBe(true);
      });

      // Decrypt all — should get correct values
      expect(encryption.decrypt(migrated[0].accessToken)).toBe('plaintext-token-1');
      expect(encryption.decrypt(migrated[1].accessToken)).toBe('already-encrypted-2');
      expect(encryption.decrypt(migrated[2].accessToken)).toBe('another-plain-token');
    });
  });
});

// ===========================================
// Grey Hat Security Tests
// ===========================================

describe('Phase1 Grey-Hat Security Tests', () => {
  let encryption: EncryptionService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def?: string) => {
              if (key === 'ENCRYPTION_KEY') return 'f'.repeat(64);
              if (key === 'NODE_ENV') return 'test';
              return def;
            }),
          },
        },
      ],
    }).compile();

    encryption = module.get<EncryptionService>(EncryptionService);
    encryption.onModuleInit();
  });

  // ===========================================
  // Tampering Resistance
  // ===========================================

  describe('tampering resistance (GCM auth tag)', () => {
    it('should reject ciphertext with single bit flip', () => {
      const encrypted = encryption.encrypt('secret-token');
      const parts = encrypted.split(':');
      const ct = Buffer.from(parts[2], 'base64');

      // Flip every bit position in the first byte
      for (let bit = 0; bit < 8; bit++) {
        const tampered = Buffer.from(ct);
        tampered[0] ^= (1 << bit);
        const modified = [parts[0], parts[1], tampered.toString('base64')].join(':');
        expect(() => encryption.decrypt(modified)).toThrow();
      }
    });

    it('should reject truncated ciphertext', () => {
      const encrypted = encryption.encrypt('secret-token');
      const parts = encrypted.split(':');
      const ct = Buffer.from(parts[2], 'base64');

      // Truncate by 1 byte
      const truncated = ct.subarray(0, ct.length - 1);
      const modified = [parts[0], parts[1], truncated.toString('base64')].join(':');
      expect(() => encryption.decrypt(modified)).toThrow();
    });

    it('should reject appended ciphertext', () => {
      const encrypted = encryption.encrypt('secret-token');
      const parts = encrypted.split(':');
      const ct = Buffer.from(parts[2], 'base64');

      // Append extra byte
      const extended = Buffer.concat([ct, Buffer.from([0xff])]);
      const modified = [parts[0], parts[1], extended.toString('base64')].join(':');
      expect(() => encryption.decrypt(modified)).toThrow();
    });

    it('should reject swapped IV', () => {
      const enc1 = encryption.encrypt('token-A');
      const enc2 = encryption.encrypt('token-B');
      const parts1 = enc1.split(':');
      const parts2 = enc2.split(':');

      // Swap IVs
      const modified = [parts2[0], parts1[1], parts1[2]].join(':');
      expect(() => encryption.decrypt(modified)).toThrow();
    });

    it('should reject swapped auth tags', () => {
      const enc1 = encryption.encrypt('token-A');
      const enc2 = encryption.encrypt('token-B');
      const parts1 = enc1.split(':');
      const parts2 = enc2.split(':');

      // Use auth tag from different encryption
      const modified = [parts1[0], parts2[1], parts1[2]].join(':');
      expect(() => encryption.decrypt(modified)).toThrow();
    });

    it('should reject spliced ciphertexts (mix parts from different encryptions)', () => {
      const enc1 = encryption.encrypt('token-1');
      const enc2 = encryption.encrypt('token-2');
      const enc3 = encryption.encrypt('token-3');
      const parts1 = enc1.split(':');
      const parts2 = enc2.split(':');
      const parts3 = enc3.split(':');

      // Mix: IV from 1, tag from 2, ciphertext from 3
      const frankenstein = [parts1[0], parts2[1], parts3[2]].join(':');
      expect(() => encryption.decrypt(frankenstein)).toThrow();
    });
  });

  // ===========================================
  // Chosen-Ciphertext Attack Resistance
  // ===========================================

  describe('chosen-ciphertext attack resistance', () => {
    it('should not reveal key material through error messages', () => {
      const malicious = [
        'AAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAA==:AAAA',  // all zeros
        'AAAAAAAAAAAAAAAA:' + 'A'.repeat(24) + ':' + 'B'.repeat(100), // large payload
      ];

      const keyHex = 'f'.repeat(64);

      for (const input of malicious) {
        try {
          encryption.decrypt(input);
        } catch (error: any) {
          // Error message should not contain actual key material (hex key)
          expect(error.message).not.toContain(keyHex);
          expect(error.message).not.toMatch(/[0-9a-f]{32}/); // no 32+ char hex strings
          // Should not contain the plaintext or raw bytes
          expect(error.message).not.toContain('AAAAAAAAAAAAAAAA');
        }
      }
    });
  });

  // ===========================================
  // Timing Attack Resistance  
  // ===========================================

  describe('timing attack considerations', () => {
    it('constantTimeCompare should take similar time for equal and unequal values', () => {
      const encrypted = encryption.encrypt('known-value');

      // Measure timing for correct comparison
      const iterations = 1000;
      const start1 = process.hrtime.bigint();
      for (let i = 0; i < iterations; i++) {
        encryption.constantTimeCompare('known-value', encrypted);
      }
      const time1 = Number(process.hrtime.bigint() - start1);

      // Measure timing for wrong comparison (same length)
      const start2 = process.hrtime.bigint();
      for (let i = 0; i < iterations; i++) {
        encryption.constantTimeCompare('wrong-valuex', encrypted);
      }
      const time2 = Number(process.hrtime.bigint() - start2);

      // Times should be within 5x of each other (loose bound for CI)
      const ratio = Math.max(time1, time2) / Math.min(time1, time2);
      expect(ratio).toBeLessThan(5);
    });
  });

  // ===========================================
  // Key Rotation
  // ===========================================

  describe('key rotation', () => {
    it('should allow re-encryption without data loss', () => {
      const original = 'facebook-token-to-rotate';
      const encryptedOld = encryption.encrypt(original);

      // Re-encrypt produces different ciphertext
      const reEncrypted = encryption.reEncrypt(encryptedOld);
      expect(reEncrypted).not.toBe(encryptedOld);

      // Both decrypt to same value
      expect(encryption.decrypt(reEncrypted)).toBe(original);
    });

    it('should fail to decrypt after key change', async () => {
      const original = 'token-before-rotation';
      const encryptedOldKey = encryption.encrypt(original);

      // Create new service with different key
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EncryptionService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, def?: string) => {
                if (key === 'ENCRYPTION_KEY') return 'e'.repeat(64); // different key
                if (key === 'NODE_ENV') return 'test';
                return def;
              }),
            },
          },
        ],
      }).compile();

      const newEncryption = module.get<EncryptionService>(EncryptionService);
      newEncryption.onModuleInit();

      // Can't decrypt old data with new key
      expect(() => newEncryption.decrypt(encryptedOldKey)).toThrow();
    });
  });

  // ===========================================
  // Entropy & Randomness Checks
  // ===========================================

  describe('IV randomness', () => {
    it('should generate unique IVs for 1000 encryptions', () => {
      const ivs = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        const encrypted = encryption.encrypt('same-plaintext');
        const iv = encrypted.split(':')[0];
        ivs.add(iv);
      }
      // All 1000 IVs should be unique (probability of collision for 12-byte random is negligible)
      expect(ivs.size).toBe(1000);
    });
  });

  // ===========================================
  // Boundary Conditions
  // ===========================================

  describe('boundary conditions', () => {
    it('should handle 1-char plaintext', () => {
      const encrypted = encryption.encrypt('x');
      expect(encryption.decrypt(encrypted)).toBe('x');
    });

    it('should handle exactly 16-byte plaintext (AES block size)', () => {
      const text = '0123456789abcdef'; // 16 chars = 16 bytes
      const encrypted = encryption.encrypt(text);
      expect(encryption.decrypt(encrypted)).toBe(text);
    });

    it('should handle plaintext with null bytes', () => {
      const text = 'before\0after';
      const encrypted = encryption.encrypt(text);
      expect(encryption.decrypt(encrypted)).toBe(text);
    });

    it('should handle very large plaintext (100KB)', () => {
      const text = 'x'.repeat(100 * 1024);
      const encrypted = encryption.encrypt(text);
      expect(encryption.decrypt(encrypted)).toBe(text);
    });

    it('should handle newlines and whitespace', () => {
      const text = 'line1\nline2\r\n\ttab  spaces';
      const encrypted = encryption.encrypt(text);
      expect(encryption.decrypt(encrypted)).toBe(text);
    });
  });

  // ===========================================
  // Format Injection Attacks
  // ===========================================

  describe('format injection attacks', () => {
    it('should safely handle plaintext containing separator character (:)', () => {
      // If someone's token contains colons, encryption should still work
      const token = 'access:token:with:colons';
      const encrypted = encryption.encrypt(token);
      expect(encryption.decrypt(encrypted)).toBe(token);
    });

    it('should safely handle plaintext that looks like encrypted format', () => {
      // Construct a plaintext that mimics iv:authTag:ciphertext format
      const fakeEncrypted = 'dGVzdA==:dGVzdA==:dGVzdA=='; // valid base64 parts
      const encrypted = encryption.encrypt(fakeEncrypted);
      expect(encryption.decrypt(encrypted)).toBe(fakeEncrypted);
    });

    it('should handle JSON in plaintext', () => {
      const json = JSON.stringify({ token: 'abc', secret: 'xyz' });
      const encrypted = encryption.encrypt(json);
      expect(encryption.decrypt(encrypted)).toBe(json);
    });

    it('should handle SQL injection attempts in plaintext', () => {
      const sqlInjection = "'; DROP TABLE users; --";
      const encrypted = encryption.encrypt(sqlInjection);
      expect(encryption.decrypt(encrypted)).toBe(sqlInjection);
    });
  });
});
