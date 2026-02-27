import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

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

async function postJson(baseUrl, path, payload, accessToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  let body = null;
  const text = await res.text();
  if (text) {
    body = JSON.parse(text);
  }

  return { res, body };
}

async function getJson(baseUrl, path, accessToken) {
  const headers = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${baseUrl}${path}`, { headers });
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

test('kyc flow: not started -> create session -> in progress', async () => {
  await withServer(async (baseUrl) => {
    const register = await postJson(baseUrl, '/auth/register', {
      fullName: 'KYC User',
      email: 'kyc@example.com',
      password: 'pass1234'
    });

    assert.equal(register.res.status, 201);
    const accessToken = register.body.accessToken;
    assert.ok(accessToken);

    const statusBefore = await getJson(baseUrl, '/identity/kyc/status', accessToken);
    assert.equal(statusBefore.res.status, 200);
    assert.equal(statusBefore.body.status, 'NOT_STARTED');
    assert.equal(statusBefore.body.session, null);

    const createSession = await postJson(
      baseUrl,
      '/identity/kyc/sessions',
      { provider: 'Sumsub' },
      accessToken
    );

    assert.equal(createSession.res.status, 201);
    assert.equal(createSession.body.status, 'IN_PROGRESS');
    assert.equal(createSession.body.session.status, 'CREATED');
    assert.equal(createSession.body.session.provider, 'sumsub');
    assert.ok(createSession.body.session.id);

    const statusAfter = await getJson(baseUrl, '/identity/kyc/status', accessToken);
    assert.equal(statusAfter.res.status, 200);
    assert.equal(statusAfter.body.status, 'IN_PROGRESS');
    assert.equal(statusAfter.body.session.id, createSession.body.session.id);
    assert.equal(statusAfter.body.session.status, 'CREATED');
  });
});
