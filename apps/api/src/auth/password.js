import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const ITERATIONS = 120000;
const KEY_LEN = 32;
const DIGEST = 'sha256';

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password, encoded) {
  const parts = String(encoded || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
    return false;
  }

  const iterations = Number(parts[1]);
  const salt = parts[2];
  const hash = parts[3];
  if (!iterations || !salt || !hash) {
    return false;
  }

  const candidate = pbkdf2Sync(password, salt, iterations, KEY_LEN, DIGEST).toString('hex');
  const hashBuf = Buffer.from(hash, 'hex');
  const candidateBuf = Buffer.from(candidate, 'hex');

  if (hashBuf.length !== candidateBuf.length) {
    return false;
  }

  return timingSafeEqual(hashBuf, candidateBuf);
}
