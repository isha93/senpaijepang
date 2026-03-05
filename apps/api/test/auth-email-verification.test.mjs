import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';
import { createAuthService } from '../src/auth/service.js';

const TEST_AUTH_SECRET = 'test-email-verification-secret';
const STATIC_CODE = '123456';

async function withServer(run, envOverrides = {}) {
  const authService = createAuthService({
    env: {
      AUTH_TOKEN_SECRET: TEST_AUTH_SECRET,
      AUTH_EMAIL_VERIFICATION_STATIC_CODE: STATIC_CODE,
      AUTH_EMAIL_VERIFICATION_RESEND_COOLDOWN_SEC: '2',
      AUTH_EMAIL_VERIFICATION_MAX_ATTEMPTS: '5',
      AUTH_EMAIL_VERIFICATION_MAX_SEND_PER_HOUR: '5',
      ...envOverrides
    }
  });
  const server = createServer({ authService });
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

test('email verification flow: send -> invalid verify -> valid verify -> me', async () => {
  await withServer(async (baseUrl) => {
    const register = await postJson(baseUrl, '/auth/register', {
      fullName: 'Email Verify User',
      email: 'email-verify-user@example.com',
      password: 'pass1234'
    });
    assert.equal(register.res.status, 201);
    const accessToken = register.body.accessToken;
    const email = register.body.user.email;

    const send = await postJson(
      baseUrl,
      '/auth/email-verification/send',
      { email, purpose: 'REGISTER' },
      { accessToken }
    );
    assert.equal(send.res.status, 200);
    assert.ok(send.body.verificationId);
    assert.ok(Number.isFinite(Number(send.body.nextResendInSec)));

    const invalidVerify = await postJson(
      baseUrl,
      '/auth/email-verification/verify',
      { email, purpose: 'REGISTER', code: '000000' },
      { accessToken }
    );
    assert.equal(invalidVerify.res.status, 400);
    assert.equal(invalidVerify.body.error.code, 'invalid_verification_code');

    const verify = await postJson(
      baseUrl,
      '/auth/email-verification/verify',
      { email, purpose: 'REGISTER', code: STATIC_CODE },
      { accessToken }
    );
    assert.equal(verify.res.status, 200);
    assert.equal(verify.body.verified, true);
    assert.ok(verify.body.verifiedAt);

    const me = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const meBody = await me.json();
    assert.equal(me.status, 200);
    assert.equal(meBody.user.email, email);
    assert.ok(meBody.user.emailVerifiedAt);

    const idempotentVerify = await postJson(
      baseUrl,
      '/auth/email-verification/verify',
      { email, purpose: 'REGISTER', code: STATIC_CODE },
      { accessToken }
    );
    assert.equal(idempotentVerify.res.status, 200);
    assert.equal(idempotentVerify.body.verified, true);
  });
});

test('email verification resend cooldown and missing auth handling', async () => {
  await withServer(
    async (baseUrl) => {
      const missingAuth = await postJson(baseUrl, '/auth/email-verification/send', {
        email: 'nobody@example.com',
        purpose: 'REGISTER'
      });
      assert.equal(missingAuth.res.status, 401);
      assert.equal(missingAuth.body.error.code, 'missing_access_token');

      const register = await postJson(baseUrl, '/auth/register', {
        fullName: 'Email Verify Cooldown User',
        email: 'email-verify-cooldown@example.com',
        password: 'pass1234'
      });
      assert.equal(register.res.status, 201);
      const accessToken = register.body.accessToken;
      const email = register.body.user.email;

      const send = await postJson(
        baseUrl,
        '/auth/email-verification/send',
        { email, purpose: 'REGISTER' },
        { accessToken }
      );
      assert.equal(send.res.status, 200);

      const resendTooSoon = await postJson(
        baseUrl,
        '/auth/email-verification/resend',
        { email, purpose: 'REGISTER' },
        { accessToken }
      );
      assert.equal(resendTooSoon.res.status, 429);
      assert.equal(resendTooSoon.body.error.code, 'verification_resend_cooldown');

      await new Promise((resolve) => setTimeout(resolve, 1200));

      const resendAfterCooldown = await postJson(
        baseUrl,
        '/auth/email-verification/resend',
        { email, purpose: 'REGISTER' },
        { accessToken }
      );
      assert.equal(resendAfterCooldown.res.status, 200);
      assert.ok(resendAfterCooldown.body.verificationId);
    },
    {
      AUTH_EMAIL_VERIFICATION_RESEND_COOLDOWN_SEC: '1'
    }
  );
});

test('email verification endpoints support /v1 alias', async () => {
  await withServer(async (baseUrl) => {
    const register = await postJson(baseUrl, '/v1/auth/register', {
      fullName: 'Email Verify v1 User',
      email: 'email-verify-v1@example.com',
      password: 'pass1234'
    });
    assert.equal(register.res.status, 201);
    const accessToken = register.body.accessToken;
    const email = register.body.user.email;

    const send = await postJson(
      baseUrl,
      '/v1/auth/email-verification/send',
      { email, purpose: 'REGISTER' },
      { accessToken }
    );
    assert.equal(send.res.status, 200);

    const verify = await postJson(
      baseUrl,
      '/v1/auth/email-verification/verify',
      { email, purpose: 'REGISTER', code: STATIC_CODE },
      { accessToken }
    );
    assert.equal(verify.res.status, 200);
    assert.equal(verify.body.verified, true);
  });
});
