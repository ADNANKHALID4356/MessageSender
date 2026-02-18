// ===========================================
// AES-256-GCM Encryption Service
// Encrypts/decrypts sensitive data (Facebook tokens, OTN tokens, etc.)
// Format: iv:authTag:ciphertext (all base64-encoded)
// ===========================================

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'crypto';

/** Encryption algorithm — AES-256 in GCM mode (authenticated encryption) */
const ALGORITHM = 'aes-256-gcm';
/** IV length in bytes (96 bits is the recommended GCM IV length) */
const IV_LENGTH = 12;
/** Authentication tag length in bytes */
const AUTH_TAG_LENGTH = 16;
/** Separator used in the encoded output */
const SEPARATOR = ':';

@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const keyHex = this.configService.get<string>('ENCRYPTION_KEY', '');

    if (!keyHex || keyHex === '0'.repeat(64)) {
      const env = this.configService.get<string>('NODE_ENV', 'development');
      if (env === 'production' || env === 'staging') {
        throw new Error(
          'ENCRYPTION_KEY is required in production/staging. Generate with: openssl rand -hex 32',
        );
      }
      // In development/test, use a deterministic key so tokens are still encrypted
      this.encryptionKey = Buffer.from('0'.repeat(64), 'hex');
      this.logger.warn(
        'Using default encryption key — NOT SAFE FOR PRODUCTION. Set ENCRYPTION_KEY env var.',
      );
    } else {
      this.encryptionKey = Buffer.from(keyHex, 'hex');
    }

    // Validate key length (must be 32 bytes for AES-256)
    if (this.encryptionKey.length !== 32) {
      throw new Error(
        `ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars). Got ${this.encryptionKey.length} bytes.`,
      );
    }
  }

  // ===========================================
  // Public API
  // ===========================================

  /**
   * Encrypt a plaintext string using AES-256-GCM.
   *
   * @returns Encoded string in format: base64(iv):base64(authTag):base64(ciphertext)
   * @throws Error if plaintext is empty or encryption fails
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      throw new Error('Cannot encrypt empty or null value');
    }

    try {
      // Generate cryptographically random IV for each encryption
      const iv = randomBytes(IV_LENGTH);

      const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv, {
        authTagLength: AUTH_TAG_LENGTH,
      });

      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);

      const authTag = cipher.getAuthTag();

      // Return as iv:authTag:ciphertext (all base64-encoded)
      return [
        iv.toString('base64'),
        authTag.toString('base64'),
        encrypted.toString('base64'),
      ].join(SEPARATOR);
    } catch (error) {
      this.logger.error('Encryption failed', error instanceof Error ? error.stack : error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt a previously encrypted string.
   *
   * @param encryptedValue String in format: base64(iv):base64(authTag):base64(ciphertext)
   * @returns The original plaintext
   * @throws Error if decryption fails (wrong key, tampered data, invalid format)
   */
  decrypt(encryptedValue: string): string {
    if (!encryptedValue) {
      throw new Error('Cannot decrypt empty or null value');
    }

    const parts = encryptedValue.split(SEPARATOR);
    if (parts.length !== 3) {
      throw new Error(
        'Invalid encrypted value format. Expected iv:authTag:ciphertext',
      );
    }

    try {
      const [ivB64, authTagB64, ciphertextB64] = parts;

      const iv = Buffer.from(ivB64, 'base64');
      const authTag = Buffer.from(authTagB64, 'base64');
      const ciphertext = Buffer.from(ciphertextB64, 'base64');

      // Validate component lengths
      if (iv.length !== IV_LENGTH) {
        throw new Error(`Invalid IV length: ${iv.length}`);
      }
      if (authTag.length !== AUTH_TAG_LENGTH) {
        throw new Error(`Invalid auth tag length: ${authTag.length}`);
      }

      const decipher = createDecipheriv(ALGORITHM, this.encryptionKey, iv, {
        authTagLength: AUTH_TAG_LENGTH,
      });
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Invalid')) {
        throw error;
      }
      this.logger.error('Decryption failed — possible key mismatch or data tampering');
      throw new Error('Decryption failed — data may be corrupted or key may have changed');
    }
  }

  /**
   * Check if a value appears to be encrypted (matches our format).
   * Useful for migration: skip already-encrypted values.
   */
  isEncrypted(value: string): boolean {
    if (!value) return false;
    const parts = value.split(SEPARATOR);
    if (parts.length !== 3) return false;

    try {
      const iv = Buffer.from(parts[0], 'base64');
      const authTag = Buffer.from(parts[1], 'base64');
      return iv.length === IV_LENGTH && authTag.length === AUTH_TAG_LENGTH;
    } catch {
      return false;
    }
  }

  /**
   * Encrypt a value only if it's not already encrypted.
   * Safe for idempotent migration operations.
   */
  encryptIfNeeded(value: string): string {
    if (!value) return value;
    if (this.isEncrypted(value)) return value;
    return this.encrypt(value);
  }

  /**
   * Decrypt a value only if it appears to be encrypted.
   * Safe for mixed plaintext/encrypted data during migration.
   */
  decryptIfNeeded(value: string): string {
    if (!value) return value;
    if (!this.isEncrypted(value)) return value;
    return this.decrypt(value);
  }

  /**
   * Compare a plaintext value against an encrypted value in constant time.
   * Prevents timing attacks when verifying tokens.
   */
  constantTimeCompare(plaintext: string, encryptedValue: string): boolean {
    try {
      const decrypted = this.decrypt(encryptedValue);
      const a = Buffer.from(plaintext, 'utf8');
      const b = Buffer.from(decrypted, 'utf8');
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  /**
   * Rotate encryption: decrypt with current key, re-encrypt.
   * Returns new encrypted value (useful when ENCRYPTION_KEY is rotated).
   */
  reEncrypt(encryptedValue: string): string {
    const plaintext = this.decrypt(encryptedValue);
    return this.encrypt(plaintext);
  }
}
