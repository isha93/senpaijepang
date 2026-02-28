import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

const CHECKSUM_A = 'a3f9f6f30311d8e8860f5f5f5366f6544dc34e8e833b8f13294f129f0d4af167';
const CHECKSUM_B = 'b3f9f6f30311d8e8860f5f5f5366f6544dc34e8e833b8f13294f129f0d4af168';

async function withServer(run) {
  const server = createServer();
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

async function postJson(baseUrl, path, payload, { accessToken } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  return { res, body: text ? JSON.parse(text) : null };
}

async function getJson(baseUrl, path, { accessToken } = {}) {
  const headers = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const res = await fetch(`${baseUrl}${path}`, { headers });
  const text = await res.text();
  return { res, body: text ? JSON.parse(text) : null };
}

test('profile endpoint returns base profile and missing checklist for new user', async () => {
  await withServer(async (baseUrl) => {
    const register = await postJson(baseUrl, '/auth/register', {
      fullName: 'Profile User',
      email: 'profile-user@example.com',
      password: 'pass1234'
    });
    assert.equal(register.res.status, 201);
    const accessToken = register.body.accessToken;

    const profile = await getJson(baseUrl, '/users/me/profile', { accessToken });
    assert.equal(profile.res.status, 200);
    assert.equal(profile.body.profile.fullName, 'Profile User');
    assert.equal(profile.body.profile.verificationStatus, 'NOT_STARTED');
    assert.equal(profile.body.profile.trustScoreLabel, 'UNVERIFIED');
    assert.equal(profile.body.profile.verification.sessionId, null);
    assert.equal(profile.body.profile.verification.documentsUploaded, 0);
    assert.equal(profile.body.profile.verification.requiredDocuments, 2);

    const documents = await getJson(baseUrl, '/users/me/verification-documents', { accessToken });
    assert.equal(documents.res.status, 200);
    assert.equal(documents.body.session, null);
    assert.equal(documents.body.documents.length, 2);
    assert.equal(documents.body.documents[0].documentType, 'PASSPORT');
    assert.equal(documents.body.documents[0].status, 'MISSING');
    assert.equal(documents.body.documents[1].documentType, 'SELFIE');
    assert.equal(documents.body.documents[1].status, 'MISSING');
    assert.equal(documents.body.summary.requiredTotal, 2);
    assert.equal(documents.body.summary.missingRequired, 2);
  });
});

test('verification documents and final request flow is idempotent after KYC submit', async () => {
  await withServer(async (baseUrl) => {
    const register = await postJson(baseUrl, '/auth/register', {
      fullName: 'Verification User',
      email: 'verification-user@example.com',
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

    const uploadUrl = await postJson(
      baseUrl,
      '/identity/kyc/upload-url',
      {
        sessionId,
        documentType: 'passport',
        fileName: 'passport.jpg',
        contentType: 'image/jpeg',
        contentLength: 120000,
        checksumSha256: CHECKSUM_A
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
        checksumSha256: CHECKSUM_A
      },
      { accessToken }
    );
    assert.equal(uploadDocument.res.status, 201);

    const submit = await postJson(baseUrl, `/identity/kyc/sessions/${sessionId}/submit`, {}, { accessToken });
    assert.equal(submit.res.status, 200);
    assert.equal(submit.body.session.status, 'SUBMITTED');

    const profile = await getJson(baseUrl, '/users/me/profile', { accessToken });
    assert.equal(profile.res.status, 200);
    assert.equal(profile.body.profile.verificationStatus, 'IN_PROGRESS');
    assert.equal(profile.body.profile.trustScoreLabel, 'BUILDING_TRUST');
    assert.equal(profile.body.profile.verification.sessionStatus, 'SUBMITTED');
    assert.equal(profile.body.profile.verification.requiredDocumentsUploaded, 1);
    assert.equal(profile.body.profile.verification.finalRequest, null);

    const documents = await getJson(baseUrl, '/users/me/verification-documents', { accessToken });
    assert.equal(documents.res.status, 200);
    assert.equal(documents.body.session.status, 'SUBMITTED');
    assert.equal(documents.body.documents.length, 2);

    const passportItem = documents.body.documents.find((item) => item.documentType === 'PASSPORT');
    const selfieItem = documents.body.documents.find((item) => item.documentType === 'SELFIE');
    assert.ok(passportItem);
    assert.ok(selfieItem);
    assert.equal(passportItem.status, 'PENDING');
    assert.equal(passportItem.required, true);
    assert.ok(passportItem.uploadedAt);
    assert.equal(selfieItem.status, 'MISSING');
    assert.equal(selfieItem.required, true);
    assert.equal(documents.body.summary.requiredTotal, 2);
    assert.equal(documents.body.summary.uploadedRequired, 1);
    assert.equal(documents.body.summary.missingRequired, 1);

    const finalRequestFirst = await postJson(
      baseUrl,
      '/users/me/verification/final-request',
      {
        source: 'PROFILE_SCREEN',
        note: 'Please prioritize this review.'
      },
      { accessToken }
    );
    assert.equal(finalRequestFirst.res.status, 201);
    assert.equal(finalRequestFirst.body.created, true);
    assert.equal(finalRequestFirst.body.request.source, 'PROFILE_SCREEN');
    assert.equal(finalRequestFirst.body.request.status, 'REQUESTED');
    assert.equal(finalRequestFirst.body.request.note, 'Please prioritize this review.');
    assert.equal(finalRequestFirst.body.request.documentsCount, 1);

    const finalRequestSecond = await postJson(
      baseUrl,
      '/users/me/verification/final-request',
      {
        source: 'PROFILE_SCREEN',
        note: 'another note should be ignored after first request'
      },
      { accessToken }
    );
    assert.equal(finalRequestSecond.res.status, 200);
    assert.equal(finalRequestSecond.body.created, false);
    assert.equal(finalRequestSecond.body.request.id, finalRequestFirst.body.request.id);
    assert.equal(finalRequestSecond.body.request.note, 'Please prioritize this review.');

    const status = await getJson(baseUrl, '/identity/kyc/status', { accessToken });
    assert.equal(status.res.status, 200);
    assert.equal(status.body.session.providerMetadata.finalVerification.id, finalRequestFirst.body.request.id);
  });
});

test('final verification request validates auth, session state, and payload constraints', async () => {
  await withServer(async (baseUrl) => {
    const missingToken = await postJson(baseUrl, '/users/me/verification/final-request', { source: 'PROFILE' });
    assert.equal(missingToken.res.status, 401);
    assert.equal(missingToken.body.error.code, 'missing_access_token');

    const register = await postJson(baseUrl, '/auth/register', {
      fullName: 'Final Request User',
      email: 'final-request-user@example.com',
      password: 'pass1234'
    });
    assert.equal(register.res.status, 201);
    const accessToken = register.body.accessToken;

    const noSession = await postJson(
      baseUrl,
      '/users/me/verification/final-request',
      { source: 'PROFILE_SCREEN' },
      { accessToken }
    );
    assert.equal(noSession.res.status, 409);
    assert.equal(noSession.body.error.code, 'verification_session_required');

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
        fileName: 'passport.jpg',
        contentType: 'image/jpeg',
        contentLength: 120000,
        checksumSha256: CHECKSUM_B
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
        checksumSha256: CHECKSUM_B
      },
      { accessToken }
    );
    assert.equal(uploadDocument.res.status, 201);

    const beforeSubmit = await postJson(
      baseUrl,
      '/users/me/verification/final-request',
      { source: 'PROFILE_SCREEN' },
      { accessToken }
    );
    assert.equal(beforeSubmit.res.status, 409);
    assert.equal(beforeSubmit.body.error.code, 'kyc_session_not_submitted');

    const submit = await postJson(baseUrl, `/identity/kyc/sessions/${sessionId}/submit`, {}, { accessToken });
    assert.equal(submit.res.status, 200);

    const invalidNote = await postJson(
      baseUrl,
      '/users/me/verification/final-request',
      { note: 'x'.repeat(501) },
      { accessToken }
    );
    assert.equal(invalidNote.res.status, 400);
    assert.equal(invalidNote.body.error.code, 'invalid_note');
  });
});
