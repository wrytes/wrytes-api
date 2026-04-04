import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const raw = this.configService.get<string>('ENCRYPTION_KEY')!.trim();
    // Accept either a 64-char hex string or a base64 string that decodes to 32 bytes
    this.key = raw.length === 64 ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
    if (this.key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars or 44-char base64)');
    }
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv, authTag, ciphertext].map((b) => b.toString('base64')).join('.');
  }

  decrypt(encoded: string): string {
    const parts = encoded.split('.');
    if (parts.length !== 3) throw new Error('Invalid encrypted data format');
    const [iv, authTag, ciphertext] = parts.map((p) => Buffer.from(p, 'base64'));
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }
}
