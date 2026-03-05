import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

const TEST_ADMIN_API_KEY = 'test-admin-key';
const CHECKSUM = 'a3f9f6f30311d8e8860f5f5f5366f6544dc34e8e833b8f13294f129f0d4af167';

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

async function postJson(baseUrl, path, payload, { accessToken, headers } = {}) {
  const requestHeaders = { 'Content-Type': 'application/json' };
  if (accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }
  if (headers) {
    Object.assign(requestHeaders, headers);
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  return { res, body: text ? JSON.parse(text) : null };
}

async function getJson(baseUrl, path, { accessToken, headers } = {}) {
  const requestHeaders = {};
  if (accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }
  if (headers) {
    Object.assign(requestHeaders, headers);
  }

  const res = await fetch(`${baseUrl}${path}`, {
    headers: requestHeaders
  });
  const text = await res.text();
  return { res, body: text ? JSON.parse(text) : null };
}

async function createSubmittedKycSession(baseUrl, accessToken) {
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
      checksumSha256: CHECKSUM
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
      checksumSha256: CHECKSUM
    },
    { accessToken }
  );
  assert.equal(uploadDocument.res.status, 201);

  const submit = await postJson(baseUrl, `/identity/kyc/sessions/${sessionId}/submit`, {}, { accessToken });
  assert.equal(submit.res.status, 200);
  assert.equal(submit.body.session.status, 'SUBMITTED');

  return { sessionId };
}

test('legacy trust profile alias mirrors users/me/profile', async () => {
  await withServer(async (baseUrl) => {
    const register = await postJson(baseUrl, '/auth/register', {
      fullName: 'Legacy Trust User',
      email: 'legacy-trust-user@example.com',
      password: 'pass1234'
    });
    assert.equal(register.res.status, 201);
    const accessToken = register.body.accessToken;

    const canonical = await getJson(baseUrl, '/users/me/profile', { accessToken });
    assert.equal(canonical.res.status, 200);

    const legacy = await getJson(baseUrl, '/trust/profile', { accessToken });
    assert.equal(legacy.res.status, 200);
    assert.deepEqual(legacy.body, canonical.body);

    const missingToken = await getJson(baseUrl, '/trust/profile');
    assert.equal(missingToken.res.status, 401);
    assert.equal(missingToken.body.error.code, 'missing_access_token');
  });
});

test('legacy admin cases list alias maps case statuses to review queue', async () => {
  await withServer(
    async (baseUrl) => {
      const register = await postJson(baseUrl, '/auth/register', {
        fullName: 'Legacy Cases Queue User',
        email: 'legacy-cases-queue-user@example.com',
        password: 'pass1234'
      });
      assert.equal(register.res.status, 201);

      const accessToken = register.body.accessToken;
      const { sessionId } = await createSubmittedKycSession(baseUrl, accessToken);

      const missingKey = await getJson(baseUrl, '/admin/cases');
      assert.equal(missingKey.res.status, 401);
      assert.equal(missingKey.body.error.code, 'missing_admin_api_key');

      const openCases = await getJson(baseUrl, '/admin/cases?status=OPEN&limit=10', {
        headers: { 'x-admin-api-key': TEST_ADMIN_API_KEY }
      });
      assert.equal(openCases.res.status, 200);
      assert.equal(openCases.body.count, 1);
      assert.equal(openCases.body.items[0].session.id, sessionId);
      assert.equal(openCases.body.items[0].session.status, 'SUBMITTED');

      const resolvedCases = await getJson(baseUrl, '/admin/cases?status=RESOLVED', {
        headers: { 'x-admin-api-key': TEST_ADMIN_API_KEY }
      });
      assert.equal(resolvedCases.res.status, 200);
      assert.equal(resolvedCases.body.count, 0);

      const invalidStatus = await getJson(baseUrl, '/admin/cases?status=INVALID_CASE_STATE', {
        headers: { 'x-admin-api-key': TEST_ADMIN_API_KEY }
      });
      assert.equal(invalidStatus.res.status, 400);
      assert.equal(invalidStatus.body.error.code, 'invalid_status_filter');
    },
    { adminApiKey: TEST_ADMIN_API_KEY }
  );
});

test('legacy admin case action alias supports action mapping and decision passthrough', async () => {
  await withServer(
    async (baseUrl) => {
      const firstUser = await postJson(baseUrl, '/auth/register', {
        fullName: 'Legacy Action User One',
        email: 'legacy-action-user-one@example.com',
        password: 'pass1234'
      });
      assert.equal(firstUser.res.status, 201);
      const firstSession = await createSubmittedKycSession(baseUrl, firstUser.body.accessToken);

      const resolveValid = await postJson(
        baseUrl,
        `/admin/cases/${firstSession.sessionId}/action`,
        {
          action: 'RESOLVE_VALID',
          note: 'legacy case resolved as valid'
        },
        { headers: { 'x-admin-api-key': TEST_ADMIN_API_KEY } }
      );
      assert.equal(resolveValid.res.status, 200);
      assert.equal(resolveValid.body.status, 'VERIFIED');
      assert.equal(resolveValid.body.session.status, 'VERIFIED');
      assert.equal(resolveValid.body.session.reviewedBy, 'legacy_admin_case_action');

      const secondUser = await postJson(baseUrl, '/auth/register', {
        fullName: 'Legacy Action User Two',
        email: 'legacy-action-user-two@example.com',
        password: 'pass1234'
      });
      assert.equal(secondUser.res.status, 201);
      const secondSession = await createSubmittedKycSession(baseUrl, secondUser.body.accessToken);

      const decisionPassthrough = await postJson(
        baseUrl,
        `/admin/cases/${secondSession.sessionId}/action`,
        {
          decision: 'REJECTED',
          reason: 'legacy decision passthrough'
        },
        { headers: { 'x-admin-api-key': TEST_ADMIN_API_KEY } }
      );
      assert.equal(decisionPassthrough.res.status, 200);
      assert.equal(decisionPassthrough.body.status, 'REJECTED');
      assert.equal(decisionPassthrough.body.session.status, 'REJECTED');
      assert.equal(decisionPassthrough.body.session.reviewedBy, 'legacy_admin_case_action');

      const thirdUser = await postJson(baseUrl, '/auth/register', {
        fullName: 'Legacy Action User Three',
        email: 'legacy-action-user-three@example.com',
        password: 'pass1234'
      });
      assert.equal(thirdUser.res.status, 201);
      const thirdSession = await createSubmittedKycSession(baseUrl, thirdUser.body.accessToken);

      const unsupportedAction = await postJson(
        baseUrl,
        `/admin/cases/${thirdSession.sessionId}/action`,
        {
          action: 'PAUSE_CASE'
        },
        { headers: { 'x-admin-api-key': TEST_ADMIN_API_KEY } }
      );
      assert.equal(unsupportedAction.res.status, 400);
      assert.equal(unsupportedAction.body.error.code, 'unsupported_case_action');
    },
    { adminApiKey: TEST_ADMIN_API_KEY }
  );
});
