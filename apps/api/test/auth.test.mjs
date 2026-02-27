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

async function postJson(baseUrl, path, payload) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  let body = null;
  const text = await res.text();
  if (text) {
    body = JSON.parse(text);
  }

  return { res, body };
}

test('auth flow: register -> login -> me -> refresh -> logout', async () => {
  await withServer(async (baseUrl) => {
    const register = await postJson(baseUrl, '/auth/register', {
      fullName: 'Isa Test',
      email: 'isa@example.com',
      password: 'pass1234'
    });

    assert.equal(register.res.status, 201);
    assert.equal(register.body.user.email, 'isa@example.com');
    assert.ok(register.body.accessToken);
    assert.ok(register.body.refreshToken);

    const me = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${register.body.accessToken}` }
    });
    const meBody = await me.json();

    assert.equal(me.status, 200);
    assert.equal(meBody.user.email, 'isa@example.com');

    const login = await postJson(baseUrl, '/auth/login', {
      identifier: 'isa@example.com',
      password: 'pass1234'
    });

    assert.equal(login.res.status, 200);
    assert.ok(login.body.accessToken);
    assert.ok(login.body.refreshToken);

    const refresh = await postJson(baseUrl, '/auth/refresh', {
      refreshToken: login.body.refreshToken
    });

    assert.equal(refresh.res.status, 200);
    assert.ok(refresh.body.accessToken);
    assert.ok(refresh.body.refreshToken);

    const refreshOldToken = await postJson(baseUrl, '/auth/refresh', {
      refreshToken: login.body.refreshToken
    });

    assert.equal(refreshOldToken.res.status, 401);
    assert.equal(refreshOldToken.body.error.code, 'invalid_refresh_token');

    const logout = await postJson(baseUrl, '/auth/logout', {
      refreshToken: refresh.body.refreshToken
    });

    assert.equal(logout.res.status, 204);

    const refreshAfterLogout = await postJson(baseUrl, '/auth/refresh', {
      refreshToken: refresh.body.refreshToken
    });

    assert.equal(refreshAfterLogout.res.status, 401);
    assert.equal(refreshAfterLogout.body.error.code, 'invalid_refresh_token');
  });
});

test('register with duplicate email returns 409', async () => {
  await withServer(async (baseUrl) => {
    const first = await postJson(baseUrl, '/auth/register', {
      fullName: 'First User',
      email: 'dupe@example.com',
      password: 'pass1234'
    });
    assert.equal(first.res.status, 201);

    const second = await postJson(baseUrl, '/auth/register', {
      fullName: 'Second User',
      email: 'dupe@example.com',
      password: 'pass1234'
    });

    assert.equal(second.res.status, 409);
    assert.equal(second.body.error.code, 'email_exists');
  });
});

test('auth me without token returns 401', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/auth/me`);
    const body = await res.json();

    assert.equal(res.status, 401);
    assert.equal(body.error.code, 'missing_access_token');
  });
});
