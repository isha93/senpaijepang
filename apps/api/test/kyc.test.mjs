import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

const TEST_ADMIN_API_KEY = 'test-admin-key';
const EXAMPLE_CHECKSUM = 'a3f9f6f30311d8e8860f5f5f5366f6544dc34e8e833b8f13294f129f0d4af167';

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

test('kyc flow: not started -> create session -> pre-sign upload -> submit document -> history', async () => {
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
    assert.equal(uploadDocument.body.session.status, 'SUBMITTED');
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
      assert.equal(history.body.events.length, 2);
      assert.equal(history.body.events[0].toStatus, 'CREATED');
      assert.equal(history.body.events[1].toStatus, 'VERIFIED');
      assert.equal(history.body.events[1].actorType, 'ADMIN');
    },
    { adminApiKey: TEST_ADMIN_API_KEY }
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
