import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '@/config/env';
import { ValidationError } from '@/shared/errors';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_BYTE_LENGTH = 12;

function getEncryptionKey(): Buffer {
  try {
    return Buffer.from(env.integrationsEncryptionKey, 'hex');
  } catch {
    throw new ValidationError('Invalid integrations encryption key configuration');
  }
}

export function encryptIntegrationSecret(value: string): string {
  const iv = randomBytes(IV_BYTE_LENGTH);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptIntegrationSecret(payload: string): string {
  const [ivHex, authTagHex, encryptedHex] = payload.split(':');

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new ValidationError('Invalid encrypted integration payload');
  }

  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
