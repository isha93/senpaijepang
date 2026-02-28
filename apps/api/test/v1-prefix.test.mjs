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
  const body = text ? JSON.parse(text) : null;
  return { res, body };
}

test('v1 prefix aliases unversioned runtime routes', async () => {
  await withServer(async (baseUrl) => {
    const health = await fetch(`${baseUrl}/v1/health`);
    const healthBody = await health.json();
    assert.equal(health.status, 200);
    assert.equal(healthBody.status, 'ok');

    const optionsRes = await fetch(`${baseUrl}/v1/auth/register`, { method: 'OPTIONS' });
    assert.equal(optionsRes.status, 204);

    const register = await postJson(baseUrl, '/v1/auth/register', {
      fullName: 'V1 Prefix User',
      email: 'v1-prefix@example.com',
      password: 'pass1234'
    });

    assert.equal(register.res.status, 201);
    assert.ok(register.body.accessToken);

    const me = await fetch(`${baseUrl}/v1/auth/me`, {
      headers: { Authorization: `Bearer ${register.body.accessToken}` }
    });
    const meBody = await me.json();
    assert.equal(me.status, 200);
    assert.equal(meBody.user.email, 'v1-prefix@example.com');

    const jobs = await fetch(`${baseUrl}/v1/jobs`);
    assert.equal(jobs.status, 200);

    const createSession = await postJson(
      baseUrl,
      '/v1/identity/kyc/sessions',
      { provider: 'manual' },
      { accessToken: register.body.accessToken }
    );
    assert.equal(createSession.res.status, 201);

    const submitWithoutDocument = await postJson(
      baseUrl,
      `/v1/identity/kyc/sessions/${createSession.body.session.id}/submit`,
      {},
      { accessToken: register.body.accessToken }
    );
    assert.equal(submitWithoutDocument.res.status, 409);
    assert.equal(submitWithoutDocument.body.error.code, 'kyc_session_incomplete');
  });
});
