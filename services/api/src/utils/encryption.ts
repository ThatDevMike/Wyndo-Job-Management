/**
 * Encryption utilities for sensitive data at rest
 * Uses AES-256-GCM for authenticated encryption
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Encrypt data using AES-256-GCM
 */
export function encrypt(text: string, key: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');
  
  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decrypt(encryptedData: string, key: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }
  
  const [saltHex, ivHex, tagHex, encrypted] = parts;
  
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  
  const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
