#!/usr/bin/env node

const base = String(process.env.SMOKE_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');
const adminKey = String(process.env.SMOKE_ADMIN_KEY || process.env.ADMIN_API_KEY || 'smoke-admin-key');
const email = `smoke-${Date.now()}@example.com`;

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (path.startsWith('/admin/')) headers['x-admin-api-key'] = adminKey;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  return { res, json };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function step(label) {
  process.stdout.write(`- ${label}\n`);
}

async function main() {
  step('GET /health');
  const health = await request('/health');
  assert(health.res.status === 200, `health status ${health.res.status}`);
  assert(health.json?.status === 'ok', 'health payload invalid');
  assert(health.res.headers.get('x-request-id'), 'x-request-id missing');

  step('POST /auth/register');
  const register = await request('/auth/register', {
    method: 'POST',
    body: {
      fullName: 'Smoke User',
      email,
      password: 'pass1234'
    }
  });
  assert(register.res.status === 201, `register status ${register.res.status}`);
  assert(Array.isArray(register.json?.user?.roles), 'roles missing');
  assert(register.json.user.roles.includes('sdm'), 'default role sdm missing');

  const accessToken = register.json.accessToken;

  step('GET /auth/me');
  const me = await request('/auth/me', { token: accessToken });
  assert(me.res.status === 200, `me status ${me.res.status}`);
  assert(me.json?.user?.email === email, 'me email mismatch');

  step('POST /identity/kyc/sessions');
  const session = await request('/identity/kyc/sessions', {
    method: 'POST',
    token: accessToken,
    body: { provider: 'sumsub' }
  });
  assert(session.res.status === 201, `kyc session status ${session.res.status}`);
  const sessionId = session.json.session.id;

  const checksum = 'a3f9f6f30311d8e8860f5f5f5366f6544dc34e8e833b8f13294f129f0d4af167';

  step('POST /identity/kyc/upload-url');
  const uploadUrl = await request('/identity/kyc/upload-url', {
    method: 'POST',
    token: accessToken,
    body: {
      sessionId,
      documentType: 'KTP',
      fileName: 'ktp-front.jpg',
      contentType: 'image/jpeg',
      contentLength: 512000,
      checksumSha256: checksum
    }
  });
  assert(uploadUrl.res.status === 201, `upload-url status ${uploadUrl.res.status}`);
  const objectKey = uploadUrl.json?.upload?.objectKey;
  assert(objectKey, 'objectKey missing in upload-url response');

  step('POST /identity/kyc/documents');
  const uploadDocument = await request('/identity/kyc/documents', {
    method: 'POST',
    token: accessToken,
    body: {
      sessionId,
      documentType: 'KTP',
      objectKey,
      checksumSha256: checksum,
      metadata: { side: 'front' }
    }
  });
  assert(uploadDocument.res.status === 201, `documents status ${uploadDocument.res.status}`);
  assert(uploadDocument.json?.session?.status === 'SUBMITTED', 'expected SUBMITTED');

  step('GET /admin/kyc/review-queue');
  const queue = await request('/admin/kyc/review-queue?status=SUBMITTED&limit=10');
  assert(queue.res.status === 200, `queue status ${queue.res.status}`);
  assert(queue.json?.count >= 1, 'queue should have at least one item');

  step('POST /admin/kyc/review');
  const review = await request('/admin/kyc/review', {
    method: 'POST',
    body: {
      sessionId,
      decision: 'VERIFIED',
      reviewedBy: 'ops@senpaijepang.com',
      reason: 'smoke_test'
    }
  });
  assert(review.res.status === 200, `review status ${review.res.status}`);
  assert(review.json?.session?.status === 'VERIFIED', 'expected VERIFIED');

  step('GET /metrics');
  const metrics = await request('/metrics');
  assert(metrics.res.status === 200, `metrics status ${metrics.res.status}`);
  assert(Number.isInteger(metrics.json?.totalRequests), 'metrics totalRequests invalid');

  process.stdout.write(`SMOKE_OK (${email})\n`);
}

main().catch((error) => {
  process.stderr.write(`SMOKE_FAILED: ${error.message}\n`);
  process.exit(1);
});
