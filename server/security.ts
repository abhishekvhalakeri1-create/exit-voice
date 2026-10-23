import crypto from 'node:crypto';

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string | null): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

export function createId(prefix = ''): string {
  const raw = crypto.randomBytes(12).toString('hex');
  return prefix ? `${prefix}_${raw}` : raw;
}

export function createSecureToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

export function computeReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 215));
}

export function buildExcerpt(content: string, maxLen = 220): string {
  const plain = content
    .replace(/^#+\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= maxLen) return plain;
  const sliced = plain.slice(0, maxLen);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace > 120 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}
