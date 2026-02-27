import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

function toBase64Url(input) {
  return Buffer.from(input).toString('base64url');
}

function fromBase64Url(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

export function createAccessToken({ payload, secret }) {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifyAccessToken({ token, secret }) {
  const parts = String(token || '').split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, signature] = parts;
  const expected = createHmac('sha256', secret).update(encodedPayload).digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    return JSON.parse(fromBase64Url(encodedPayload));
  } catch {
    return null;
  }
}

export function createRefreshToken() {
  return randomBytes(48).toString('base64url');
}
