import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createServer } from '../src/server.js';
import { createAuthService } from '../src/auth/service.js';
import { InMemoryAuthStore } from '../src/auth/store.js';
import { createKycService } from '../src/identity/kyc-service.js';

const TEST_ADMIN_API_KEY = 'test-admin-key';
const EXAMPLE_CHECKSUM = 'a3f9f6f30311d8e8860f5f5f5366f6544dc34e8e833b8f13294f129f0d4af167';

function buildWebhookHeaders({ secret, idempotencyKey, payload, timestampMs = Date.now() }) {
  const rawPayload = JSON.stringify(payload);
  const signature = createHmac('sha256', secret)
    .update(`${timestampMs}.${idempotencyKey}.${rawPayload}`)
    .digest('hex');

  return {
    'x-kyc-webhook-secret': secret,
    'x-idempotency-key': idempotencyKey,
    'x-kyc-webhook-signature': `sha256=${signature}`,
    'x-kyc-webhook-timestamp': String(timestampMs)
  };
}

async function withServer(run, options = {}) {
  const server = createServer(options);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

async function postJson(baseUrl, path, payload, { accessToken, headers: extraHeaders } = {}) {
  const requestHeaders = { 'Content-Type': 'application/json' };
  if (accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }
  if (extraHeaders) {
    Object.assign(requestHeaders, extraHeaders);
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify(payload)
  });

  let body = null;
  const text = await res.text();
  if (text) {
    body = JSON.parse(text);
  }

  return { res, body };
}

async function getJson(baseUrl, path, { accessToken, headers } = {}) {
  const requestHeaders = {};
  if (accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }
  if (headers) {
    Object.assign(requestHeaders, headers);
  }

  const res = await fetch(`${baseUrl}${path}`, { headers: requestHeaders });
  const body = await res.json();
  return { res, body };
}

test('kyc status requires access token', async () => {
  await withServer(async (baseUrl) => {
    const { res, body } = await getJson(baseUrl, '/identity/kyc/status');

    assert.equal(res.status, 401);
    assert.equal(body.error.code, 'missing_access_token');
  });
});

test('kyc flow: not started -> create session -> upload document -> submit session -> history', async () => {
  await withServer(async (baseUrl) => {
    const register = await postJson(
      baseUrl,
      '/auth/register',
      {
        fullName: 'KYC User',
        email: 'kyc@example.com',
        password: 'pass1234'
      }
    );

    assert.equal(register.res.status, 201);
    const accessToken = register.body.accessToken;
    assert.ok(accessToken);

    const statusBefore = await getJson(baseUrl, '/identity/kyc/status', { accessToken });
    assert.equal(statusBefore.res.status, 200);
    assert.equal(statusBefore.body.status, 'NOT_STARTED');
    assert.equal(statusBefore.body.session, null);

    const createSession = await postJson(baseUrl, '/identity/kyc/sessions', { provider: 'Sumsub' }, { accessToken });

    assert.equal(createSession.res.status, 201);
    assert.equal(createSession.body.status, 'IN_PROGRESS');
    assert.equal(createSession.body.session.status, 'CREATED');
    assert.equal(createSession.body.session.provider, 'sumsub');
    assert.ok(createSession.body.session.id);

    const uploadUrl = await postJson(
      baseUrl,
      '/identity/kyc/upload-url',
      {
        sessionId: createSession.body.session.id,
        documentType: 'ktp',
        fileName: 'ktp-front.jpg',
        contentType: 'image/jpeg',
        contentLength: 512000,
        checksumSha256: EXAMPLE_CHECKSUM
      },
      { accessToken }
    );

    assert.equal(uploadUrl.res.status, 201);
    assert.equal(uploadUrl.body.status, 'IN_PROGRESS');
    assert.equal(uploadUrl.body.session.status, 'CREATED');
    assert.ok(uploadUrl.body.upload.objectKey);
    assert.match(uploadUrl.body.upload.objectKey, new RegExp(`^kyc/.+/${createSession.body.session.id}/`));
    assert.equal(uploadUrl.body.upload.method, 'PUT');
    assert.ok(uploadUrl.body.upload.uploadUrl);
    assert.equal(uploadUrl.body.upload.headers['Content-Type'], 'image/jpeg');

    const uploadDocument = await postJson(
      baseUrl,
      '/identity/kyc/documents',
      {
        sessionId: createSession.body.session.id,
        documentType: 'ktp',
        objectKey: uploadUrl.body.upload.objectKey,
        checksumSha256: EXAMPLE_CHECKSUM,
        metadata: { side: 'front', country: 'ID' }
      },
      { accessToken }
    );

    assert.equal(uploadDocument.res.status, 201);
    assert.equal(uploadDocument.body.session.status, 'CREATED');
    assert.equal(uploadDocument.body.document.documentType, 'KTP');
    assert.equal(uploadDocument.body.document.objectKey, uploadUrl.body.upload.objectKey);
    assert.equal(uploadDocument.body.document.checksumSha256, EXAMPLE_CHECKSUM);

    const duplicateUpload = await postJson(
      baseUrl,
      '/identity/kyc/documents',
      {
        sessionId: createSession.body.session.id,
        documentType: 'ktp',
        objectKey: uploadUrl.body.upload.objectKey,
        checksumSha256: EXAMPLE_CHECKSUM
      },
      { accessToken }
    );
    assert.equal(duplicateUpload.res.status, 409);
    assert.equal(duplicateUpload.body.error.code, 'duplicate_document');

    const submitSession = await postJson(
      baseUrl,
      `/identity/kyc/sessions/${createSession.body.session.id}/submit`,
      {},
      { accessToken }
    );
    assert.equal(submitSession.res.status, 200);
    assert.equal(submitSession.body.session.status, 'SUBMITTED');

    const statusAfter = await getJson(baseUrl, '/identity/kyc/status', { accessToken });
    assert.equal(statusAfter.res.status, 200);
    assert.equal(statusAfter.body.status, 'IN_PROGRESS');
    assert.equal(statusAfter.body.session.status, 'SUBMITTED');

    const history = await getJson(baseUrl, `/identity/kyc/history?sessionId=${createSession.body.session.id}`, {
      accessToken
    });

    assert.equal(history.res.status, 200);
    assert.equal(history.body.events.length, 2);
    assert.equal(history.body.events[0].toStatus, 'CREATED');
    assert.equal(history.body.events[1].toStatus, 'SUBMITTED');
  });
});

test('kyc submit requires uploaded document and is idempotent', async () => {
  await withServer(async (baseUrl) => {
    const register = await postJson(baseUrl, '/auth/register', {
      fullName: 'KYC Submit User',
      email: 'kyc-submit@example.com',
      password: 'pass1234'
    });
    assert.equal(register.res.status, 201);
    const accessToken = register.body.accessToken;

    const createSession = await postJson(
      baseUrl,
      '/identity/kyc/sessions',
      { provider: 'manual' },
      { accessToken }
    );
    assert.equal(createSession.res.status, 201);
    const sessionId = createSession.body.session.id;

    const submitWithoutDocument = await postJson(
      baseUrl,
      `/identity/kyc/sessions/${sessionId}/submit`,
      {},
      { accessToken }
    );
    assert.equal(submitWithoutDocument.res.status, 409);
    assert.equal(submitWithoutDocument.body.error.code, 'kyc_session_incomplete');

    const uploadUrl = await postJson(
      baseUrl,
      '/identity/kyc/upload-url',
      {
        sessionId,
        documentType: 'passport',
        fileName: 'passport.pdf',
        contentType: 'application/pdf',
        contentLength: 420000,
        checksumSha256: EXAMPLE_CHECKSUM
      },
      { accessToken }
    );
    assert.equal(uploadUrl.res.status, 201);

    const uploadDocument = await postJson(
      baseUrl,
      '/identity/kyc/documents',
      {
        sessionId,
        documentType: 'passport',
        objectKey: uploadUrl.body.upload.objectKey,
        checksumSha256: EXAMPLE_CHECKSUM
      },
      { accessToken }
    );
    assert.equal(uploadDocument.res.status, 201);
    assert.equal(uploadDocument.body.session.status, 'CREATED');

    const submit = await postJson(baseUrl, `/identity/kyc/sessions/${sessionId}/submit`, {}, { accessToken });
    assert.equal(submit.res.status, 200);
    assert.equal(submit.body.session.status, 'SUBMITTED');

    const submitAgain = await postJson(
      baseUrl,
      `/identity/kyc/sessions/${sessionId}/submit`,
      {},
      { accessToken }
    );
    assert.equal(submitAgain.res.status, 200);
    assert.equal(submitAgain.body.session.status, 'SUBMITTED');

    const history = await getJson(baseUrl, `/identity/kyc/history?sessionId=${sessionId}`, {
      accessToken
    });
    assert.equal(history.res.status, 200);
    assert.equal(history.body.events.length, 2);
    assert.equal(history.body.events[0].toStatus, 'CREATED');
    assert.equal(history.body.events[1].toStatus, 'SUBMITTED');
  });
});

test('kyc provider metadata endpoint updates owned session', async () => {
  await withServer(async (baseUrl) => {
    const ownerRegister = await postJson(baseUrl, '/auth/register', {
      fullName: 'Provider Owner',
      email: 'provider-owner@example.com',
      password: 'pass1234'
    });
    assert.equal(ownerRegister.res.status, 201);
    const ownerAccessToken = ownerRegister.body.accessToken;

    const otherRegister = await postJson(baseUrl, '/auth/register', {
      fullName: 'Provider Other',
      email: 'provider-other@example.com',
      password: 'pass1234'
    });
    assert.equal(otherRegister.res.status, 201);
    const otherAccessToken = otherRegister.body.accessToken;

    const createSession = await postJson(
      baseUrl,
      '/identity/kyc/sessions',
      { provider: 'sumsub' },
      { accessToken: ownerAccessToken }
    );
    assert.equal(createSession.res.status, 201);
    const sessionId = createSession.body.session.id;

    const metadata = await postJson(
      baseUrl,
      `/identity/kyc/sessions/${sessionId}/provider-metadata`,
      {
        providerRef: 'sumsub-session-123',
        metadata: {
          reviewMode: 'manual',
          providerStatus: 'pending'
        }
      },
      { accessToken: ownerAccessToken }
    );
    assert.equal(metadata.res.status, 200);
    assert.equal(metadata.body.session.providerRef, 'sumsub-session-123');
    assert.equal(metadata.body.session.providerMetadata.reviewMode, 'manual');
    assert.equal(metadata.body.session.providerMetadata.providerStatus, 'pending');

    const status = await getJson(baseUrl, '/identity/kyc/status', { accessToken: ownerAccessToken });
    assert.equal(status.res.status, 200);
    assert.equal(status.body.session.providerRef, 'sumsub-session-123');

    const forbidden = await postJson(
      baseUrl,
      `/identity/kyc/sessions/${sessionId}/provider-metadata`,
      { providerRef: 'attempt-by-other' },
      { accessToken: otherAccessToken }
    );
    assert.equal(forbidden.res.status, 404);
    assert.equal(forbidden.body.error.code, 'kyc_session_not_found');
  });
});

test('kyc provider webhook stub validates secret and idempotency key', async () => {
  const store = new InMemoryAuthStore();
  const authService = createAuthService({
    store,
    env: {
      AUTH_TOKEN_SECRET: 'test-secret'
    }
  });
  const kycService = createKycService({
    store,
    env: {
      KYC_PROVIDER_WEBHOOK_SECRET: 'test-webhook-secret'
    }
  });

  await withServer(
    async (baseUrl) => {
      const register = await postJson(baseUrl, '/auth/register', {
        fullName: 'Webhook User',
        email: 'webhook-user@example.com',
        password: 'pass1234'
      });
      assert.equal(register.res.status, 201);
      const accessToken = register.body.accessToken;

      const createSession = await postJson(
        baseUrl,
        '/identity/kyc/sessions',
        { provider: 'sumsub' },
        { accessToken }
      );
      assert.equal(createSession.res.status, 201);
      const sessionId = createSession.body.session.id;

      const missingSecret = await postJson(baseUrl, '/identity/kyc/provider-webhook', {
        sessionId,
        providerRef: 'sumsub-ref-a'
      });
      assert.equal(missingSecret.res.status, 401);
      assert.equal(missingSecret.body.error.code, 'missing_webhook_secret');

      const missingIdempotency = await postJson(
        baseUrl,
        '/identity/kyc/provider-webhook',
        {
          sessionId,
          providerRef: 'sumsub-ref-a'
        },
        {
          headers: { 'x-kyc-webhook-secret': 'test-webhook-secret' }
        }
      );
      assert.equal(missingIdempotency.res.status, 400);
      assert.equal(missingIdempotency.body.error.code, 'missing_idempotency_key');

      const missingSignature = await postJson(
        baseUrl,
        '/identity/kyc/provider-webhook',
        {
          sessionId,
          providerRef: 'sumsub-ref-a',
          metadata: { providerStatus: 'review_pending' }
        },
        {
          headers: {
            'x-kyc-webhook-secret': 'test-webhook-secret',
            'x-idempotency-key': 'event-missing-signature'
          }
        }
      );
      assert.equal(missingSignature.res.status, 401);
      assert.equal(missingSignature.body.error.code, 'missing_webhook_timestamp');

      const staleTimestamp = await postJson(
        baseUrl,
        '/identity/kyc/provider-webhook',
        {
          sessionId,
          providerRef: 'sumsub-ref-a',
          metadata: { providerStatus: 'review_pending' }
        },
        {
          headers: buildWebhookHeaders({
            secret: 'test-webhook-secret',
            idempotencyKey: 'event-stale',
            payload: {
              sessionId,
              providerRef: 'sumsub-ref-a',
              metadata: { providerStatus: 'review_pending' }
            },
            timestampMs: Date.now() - 10 * 60 * 1000
          })
        }
      );
      assert.equal(staleTimestamp.res.status, 401);
      assert.equal(staleTimestamp.body.error.code, 'stale_webhook_timestamp');

      const first = await postJson(
        baseUrl,
        '/identity/kyc/provider-webhook',
        {
          sessionId,
          providerRef: 'sumsub-ref-a',
          metadata: { providerStatus: 'review_pending' }
        },
        {
          headers: buildWebhookHeaders({
            secret: 'test-webhook-secret',
            idempotencyKey: 'event-1',
            payload: {
              sessionId,
              providerRef: 'sumsub-ref-a',
              metadata: { providerStatus: 'review_pending' }
            }
          })
        }
      );
      assert.equal(first.res.status, 202);
      assert.equal(first.body.accepted, true);
      assert.equal(first.body.duplicate, false);
      assert.equal(first.body.updated, true);
      assert.equal(first.body.session.providerRef, 'sumsub-ref-a');

      const duplicate = await postJson(
        baseUrl,
        '/identity/kyc/provider-webhook',
        {
          sessionId,
          providerRef: 'sumsub-ref-b',
          metadata: { providerStatus: 'review_done' }
        },
        {
          headers: buildWebhookHeaders({
            secret: 'test-webhook-secret',
            idempotencyKey: 'event-1',
            payload: {
              sessionId,
              providerRef: 'sumsub-ref-b',
              metadata: { providerStatus: 'review_done' }
            }
          })
        }
      );
      assert.equal(duplicate.res.status, 409);
      assert.equal(duplicate.body.error.code, 'idempotency_key_conflict');

      const duplicateSamePayload = await postJson(
        baseUrl,
        '/identity/kyc/provider-webhook',
        {
          sessionId,
          providerRef: 'sumsub-ref-a',
          metadata: { providerStatus: 'review_pending' }
        },
        {
          headers: buildWebhookHeaders({
            secret: 'test-webhook-secret',
            idempotencyKey: 'event-1',
            payload: {
              sessionId,
              providerRef: 'sumsub-ref-a',
              metadata: { providerStatus: 'review_pending' }
            }
          })
        }
      );
      assert.equal(duplicateSamePayload.res.status, 202);
      assert.equal(duplicateSamePayload.body.accepted, true);
      assert.equal(duplicateSamePayload.body.duplicate, true);
      assert.equal(duplicateSamePayload.body.updated, false);

      const status = await getJson(baseUrl, '/identity/kyc/status', { accessToken });
      assert.equal(status.res.status, 200);
      assert.equal(status.body.session.providerRef, 'sumsub-ref-a');
      assert.equal(status.body.session.providerMetadata.providerStatus, 'review_pending');
    },
    { authService, kycService }
  );
});

test('kyc upload url enforces content type and size constraints', async () => {
  await withServer(async (baseUrl) => {
    const register = await postJson(baseUrl, '/auth/register', {
      fullName: 'KYC Validate',
      email: 'kyc-validate@example.com',
      password: 'pass1234'
    });
    assert.equal(register.res.status, 201);
    const accessToken = register.body.accessToken;

    const createSession = await postJson(
      baseUrl,
      '/identity/kyc/sessions',
      { provider: 'manual' },
      { accessToken }
    );
    assert.equal(createSession.res.status, 201);

    const invalidType = await postJson(
      baseUrl,
      '/identity/kyc/upload-url',
      {
        sessionId: createSession.body.session.id,
        documentType: 'passport',
        fileName: 'passport.exe',
        contentType: 'application/x-msdownload',
        contentLength: 1024,
        checksumSha256: EXAMPLE_CHECKSUM
      },
      { accessToken }
    );
    assert.equal(invalidType.res.status, 400);
    assert.equal(invalidType.body.error.code, 'invalid_content_type');

    const oversized = await postJson(
      baseUrl,
      '/identity/kyc/upload-url',
      {
        sessionId: createSession.body.session.id,
        documentType: 'passport',
        fileName: 'passport.pdf',
        contentType: 'application/pdf',
        contentLength: 11 * 1024 * 1024,
        checksumSha256: EXAMPLE_CHECKSUM
      },
      { accessToken }
    );
    assert.equal(oversized.res.status, 400);
    assert.equal(oversized.body.error.code, 'invalid_content_length');
  });
});

test('admin review endpoint requires api key and updates status', async () => {
  await withServer(
    async (baseUrl) => {
      const register = await postJson(baseUrl, '/auth/register', {
        fullName: 'Review User',
        email: 'review@example.com',
        password: 'pass1234'
      });
      assert.equal(register.res.status, 201);
      const accessToken = register.body.accessToken;

      const createSession = await postJson(
        baseUrl,
        '/identity/kyc/sessions',
        { provider: 'manual' },
        { accessToken }
      );
      assert.equal(createSession.res.status, 201);
      const sessionId = createSession.body.session.id;

      const missingKey = await postJson(baseUrl, '/admin/kyc/review', {
        sessionId,
        decision: 'VERIFIED',
        reviewedBy: 'ops@senpaijepang.com'
      });
      assert.equal(missingKey.res.status, 401);
      assert.equal(missingKey.body.error.code, 'missing_admin_api_key');

      const invalidKey = await postJson(
        baseUrl,
        '/admin/kyc/review',
        {
          sessionId,
          decision: 'VERIFIED',
          reviewedBy: 'ops@senpaijepang.com'
        },
        {
          headers: { 'x-admin-api-key': 'wrong-key' }
        }
      );
      assert.equal(invalidKey.res.status, 403);
      assert.equal(invalidKey.body.error.code, 'invalid_admin_api_key');

      const beforeSubmit = await postJson(
        baseUrl,
        '/admin/kyc/review',
        {
          sessionId,
          decision: 'VERIFIED',
          reviewedBy: 'ops@senpaijepang.com',
          reason: 'documents_valid'
        },
        {
          headers: { 'x-admin-api-key': TEST_ADMIN_API_KEY }
        }
      );
      assert.equal(beforeSubmit.res.status, 409);
      assert.equal(beforeSubmit.body.error.code, 'kyc_session_not_submitted');

      const uploadUrl = await postJson(
        baseUrl,
        '/identity/kyc/upload-url',
        {
          sessionId,
          documentType: 'passport',
          fileName: 'passport.pdf',
          contentType: 'application/pdf',
          contentLength: 420000,
          checksumSha256: EXAMPLE_CHECKSUM
        },
        { accessToken }
      );
      assert.equal(uploadUrl.res.status, 201);

      const uploadDocument = await postJson(
        baseUrl,
        '/identity/kyc/documents',
        {
          sessionId,
          documentType: 'passport',
          objectKey: uploadUrl.body.upload.objectKey,
          checksumSha256: EXAMPLE_CHECKSUM
        },
        { accessToken }
      );
      assert.equal(uploadDocument.res.status, 201);
      assert.equal(uploadDocument.body.session.status, 'CREATED');

      const submit = await postJson(baseUrl, `/identity/kyc/sessions/${sessionId}/submit`, {}, { accessToken });
      assert.equal(submit.res.status, 200);
      assert.equal(submit.body.session.status, 'SUBMITTED');

      const reviewed = await postJson(
        baseUrl,
        '/admin/kyc/review',
        {
          sessionId,
          decision: 'VERIFIED',
          reviewedBy: 'ops@senpaijepang.com',
          reason: 'documents_valid'
        },
        {
          headers: { 'x-admin-api-key': TEST_ADMIN_API_KEY }
        }
      );
      assert.equal(reviewed.res.status, 200);
      assert.equal(reviewed.body.status, 'VERIFIED');
      assert.equal(reviewed.body.session.status, 'VERIFIED');

      const statusAfterReview = await getJson(baseUrl, '/identity/kyc/status', { accessToken });
      assert.equal(statusAfterReview.res.status, 200);
      assert.equal(statusAfterReview.body.status, 'VERIFIED');

      const history = await getJson(baseUrl, `/identity/kyc/history?sessionId=${sessionId}`, {
        accessToken
      });
      assert.equal(history.res.status, 200);
      assert.equal(history.body.events.length, 3);
      assert.equal(history.body.events[0].toStatus, 'CREATED');
      assert.equal(history.body.events[1].toStatus, 'SUBMITTED');
      assert.equal(history.body.events[1].actorType, 'USER');
      assert.equal(history.body.events[2].toStatus, 'VERIFIED');
      assert.equal(history.body.events[2].actorType, 'ADMIN');
    },
    { adminApiKey: TEST_ADMIN_API_KEY }
  );
});

test('admin review queue returns submitted sessions with documents', async () => {
  await withServer(
    async (baseUrl) => {
      const register = await postJson(baseUrl, '/auth/register', {
        fullName: 'Queue User',
        email: 'queue@example.com',
        password: 'pass1234'
      });
      assert.equal(register.res.status, 201);
      const accessToken = register.body.accessToken;

      const createSession = await postJson(
        baseUrl,
        '/identity/kyc/sessions',
        { provider: 'sumsub' },
        { accessToken }
      );
      assert.equal(createSession.res.status, 201);
      const sessionId = createSession.body.session.id;

      const uploadUrl = await postJson(
        baseUrl,
        '/identity/kyc/upload-url',
        {
          sessionId,
          documentType: 'passport',
          fileName: 'passport.pdf',
          contentType: 'application/pdf',
          contentLength: 420000,
          checksumSha256: EXAMPLE_CHECKSUM
        },
        { accessToken }
      );
      assert.equal(uploadUrl.res.status, 201);

      const uploadDocument = await postJson(
        baseUrl,
        '/identity/kyc/documents',
        {
          sessionId,
          documentType: 'passport',
          objectKey: uploadUrl.body.upload.objectKey,
          checksumSha256: EXAMPLE_CHECKSUM,
          metadata: { page: 'bio' }
        },
        { accessToken }
      );
      assert.equal(uploadDocument.res.status, 201);
      assert.equal(uploadDocument.body.session.status, 'CREATED');

      const submit = await postJson(baseUrl, `/identity/kyc/sessions/${sessionId}/submit`, {}, { accessToken });
      assert.equal(submit.res.status, 200);
      assert.equal(submit.body.session.status, 'SUBMITTED');

      const missingKey = await getJson(baseUrl, '/admin/kyc/review-queue');
      assert.equal(missingKey.res.status, 401);
      assert.equal(missingKey.body.error.code, 'missing_admin_api_key');

      const queue = await getJson(baseUrl, '/admin/kyc/review-queue?status=SUBMITTED&limit=10', {
        headers: { 'x-admin-api-key': TEST_ADMIN_API_KEY }
      });
      assert.equal(queue.res.status, 200);
      assert.equal(queue.body.count, 1);
      assert.equal(queue.body.items[0].session.id, sessionId);
      assert.equal(queue.body.items[0].session.status, 'SUBMITTED');
      assert.equal(queue.body.items[0].user.email, 'queue@example.com');
      assert.equal(queue.body.items[0].documentCount, 1);
      assert.equal(queue.body.items[0].documents[0].objectKey, uploadUrl.body.upload.objectKey);

      const invalidStatus = await getJson(baseUrl, '/admin/kyc/review-queue?status=NOT_VALID', {
        headers: { 'x-admin-api-key': TEST_ADMIN_API_KEY }
      });
      assert.equal(invalidStatus.res.status, 400);
      assert.equal(invalidStatus.body.error.code, 'invalid_status_filter');
    },
    { adminApiKey: TEST_ADMIN_API_KEY }
  );
});

test('admin review endpoint supports bearer token for super_admin role', async () => {
  const authStore = new InMemoryAuthStore();
  const authService = createAuthService({ store: authStore });

  await withServer(
    async (baseUrl) => {
      const user = await postJson(baseUrl, '/auth/register', {
        fullName: 'Bearer Review User',
        email: 'bearer-review-user@example.com',
        password: 'pass1234'
      });
      assert.equal(user.res.status, 201);
      const userAccessToken = user.body.accessToken;

      const createSession = await postJson(
        baseUrl,
        '/identity/kyc/sessions',
        { provider: 'manual' },
        { accessToken: userAccessToken }
      );
      assert.equal(createSession.res.status, 201);
      const sessionId = createSession.body.session.id;

      const uploadUrl = await postJson(
        baseUrl,
        '/identity/kyc/upload-url',
        {
          sessionId,
          documentType: 'passport',
          fileName: 'passport.pdf',
          contentType: 'application/pdf',
          contentLength: 420000,
          checksumSha256: EXAMPLE_CHECKSUM
        },
        { accessToken: userAccessToken }
      );
      assert.equal(uploadUrl.res.status, 201);

      const uploadDocument = await postJson(
        baseUrl,
        '/identity/kyc/documents',
        {
          sessionId,
          documentType: 'passport',
          objectKey: uploadUrl.body.upload.objectKey,
          checksumSha256: EXAMPLE_CHECKSUM
        },
        { accessToken: userAccessToken }
      );
      assert.equal(uploadDocument.res.status, 201);

      const submit = await postJson(
        baseUrl,
        `/identity/kyc/sessions/${sessionId}/submit`,
        {},
        { accessToken: userAccessToken }
      );
      assert.equal(submit.res.status, 200);

      const admin = await postJson(baseUrl, '/auth/register', {
        fullName: 'Bearer Super Admin',
        email: 'bearer-super-admin@example.com',
        password: 'pass1234'
      });
      assert.equal(admin.res.status, 201);
      const promoted = await authStore.ensureUserRole({
        userId: admin.body.user.id,
        roleCode: 'super_admin'
      });
      assert.equal(promoted, true);

      const reviewed = await postJson(
        baseUrl,
        '/admin/kyc/review',
        {
          sessionId,
          decision: 'VERIFIED',
          reason: 'bearer_admin_review'
        },
        { accessToken: admin.body.accessToken }
      );

      assert.equal(reviewed.res.status, 200);
      assert.equal(reviewed.body.status, 'VERIFIED');
      assert.equal(reviewed.body.session.status, 'VERIFIED');
      assert.equal(reviewed.body.session.reviewedBy, 'bearer-super-admin@example.com');
    },
    { authService }
  );
});

test('admin review bearer auth rejects users without admin role', async () => {
  const authStore = new InMemoryAuthStore();
  const authService = createAuthService({ store: authStore });

  await withServer(
    async (baseUrl) => {
      const user = await postJson(baseUrl, '/auth/register', {
        fullName: 'Bearer Non Admin',
        email: 'bearer-non-admin@example.com',
        password: 'pass1234'
      });
      assert.equal(user.res.status, 201);
      const accessToken = user.body.accessToken;

      const createSession = await postJson(
        baseUrl,
        '/identity/kyc/sessions',
        { provider: 'manual' },
        { accessToken }
      );
      assert.equal(createSession.res.status, 201);
      const sessionId = createSession.body.session.id;

      const uploadUrl = await postJson(
        baseUrl,
        '/identity/kyc/upload-url',
        {
          sessionId,
          documentType: 'passport',
          fileName: 'passport.pdf',
          contentType: 'application/pdf',
          contentLength: 420000,
          checksumSha256: EXAMPLE_CHECKSUM
        },
        { accessToken }
      );
      assert.equal(uploadUrl.res.status, 201);

      const uploadDocument = await postJson(
        baseUrl,
        '/identity/kyc/documents',
        {
          sessionId,
          documentType: 'passport',
          objectKey: uploadUrl.body.upload.objectKey,
          checksumSha256: EXAMPLE_CHECKSUM
        },
        { accessToken }
      );
      assert.equal(uploadDocument.res.status, 201);

      const submit = await postJson(baseUrl, `/identity/kyc/sessions/${sessionId}/submit`, {}, { accessToken });
      assert.equal(submit.res.status, 200);

      const denied = await postJson(
        baseUrl,
        '/admin/kyc/review',
        {
          sessionId,
          decision: 'VERIFIED',
          reason: 'should_be_denied'
        },
        { accessToken }
      );
      assert.equal(denied.res.status, 403);
      assert.equal(denied.body.error.code, 'insufficient_admin_role');
    },
    { authService }
  );
});

test('admin review endpoint disabled when ADMIN_API_KEY is not configured', async () => {
  await withServer(async (baseUrl) => {
    const reviewed = await postJson(baseUrl, '/admin/kyc/review', {
      sessionId: 'any',
      decision: 'VERIFIED',
      reviewedBy: 'ops@senpaijepang.com'
    });

    assert.equal(reviewed.res.status, 503);
    assert.equal(reviewed.body.error.code, 'admin_api_disabled');
  });
});
