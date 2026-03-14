import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';
import { createAuthService } from '../src/auth/service.js';
import { InMemoryAuthStore } from '../src/auth/store.js';

async function withServer(envOverrides, run) {
  const store = new InMemoryAuthStore();
  const authService = createAuthService({
    store,
    env: {
      NODE_ENV: 'test',
      AUTH_EMAIL_PROVIDER: 'log',
      AUTH_EMAIL_VERIFICATION_EXPOSE_CODE: 'true',
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

async function postJson(baseUrl, path, payload, headers = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(payload)
  });

  let body = null;
  const text = await res.text();
  if (text) {
    body = JSON.parse(text);
  }

  return { res, body };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('register sends verification code and verify marks user as verified', async () => {
  await withServer({}, async (baseUrl) => {
    const register = await postJson(baseUrl, '/auth/register', {
      fullName: 'Verify User',
      email: 'verify-user@example.com',
      password: 'pass1234'
    });

    assert.equal(register.res.status, 201);
    assert.equal(register.body.user.emailVerified, false);
    assert.equal(register.body.emailVerification.required, true);
    assert.equal(register.body.emailVerification.sent, true);
    assert.match(register.body.emailVerification.developmentCode, /^\d{6}$/);

    const verify = await postJson(baseUrl, '/auth/email-verification/verify', {
      email: 'verify-user@example.com',
      code: register.body.emailVerification.developmentCode
    });

    assert.equal(verify.res.status, 200);
    assert.equal(verify.body.verified, true);
    assert.equal(verify.body.alreadyVerified, false);

    const me = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${register.body.accessToken}`
      }
    });
    const meBody = await me.json();

    assert.equal(me.status, 200);
    assert.equal(meBody.user.emailVerified, true);
    assert.ok(meBody.user.emailVerifiedAt);
  });
});

test('resend rotates verification challenge and invalidates previous code', async () => {
  await withServer(
    {
      AUTH_EMAIL_VERIFICATION_RESEND_COOLDOWN_SEC: '1'
    },
    async (baseUrl) => {
      const register = await postJson(baseUrl, '/auth/register', {
        fullName: 'Rotate User',
        email: 'rotate-user@example.com',
        password: 'pass1234'
      });

      const firstCode = register.body.emailVerification.developmentCode;
      await sleep(1100);

      const resend = await postJson(baseUrl, '/auth/email-verification/resend', {
        email: 'rotate-user@example.com'
      });

      assert.equal(resend.res.status, 200);
      const secondCode = resend.body.developmentCode;
      assert.match(secondCode, /^\d{6}$/);

      const oldCodeVerify = await postJson(baseUrl, '/auth/email-verification/verify', {
        email: 'rotate-user@example.com',
        code: firstCode
      });

      assert.equal(oldCodeVerify.res.status, 400);
      assert.equal(oldCodeVerify.body.error.code, 'verification_code_invalid');

      const currentCodeVerify = await postJson(baseUrl, '/auth/email-verification/verify', {
        email: 'rotate-user@example.com',
        code: secondCode
      });

      assert.equal(currentCodeVerify.res.status, 200);
      assert.equal(currentCodeVerify.body.verified, true);
    }
  );
});

test('resend is throttled before cooldown window ends', async () => {
  await withServer({}, async (baseUrl) => {
    await postJson(baseUrl, '/auth/register', {
      fullName: 'Throttle User',
      email: 'throttle-user@example.com',
      password: 'pass1234'
    });

    const resend = await postJson(baseUrl, '/auth/email-verification/resend', {
      email: 'throttle-user@example.com'
    });

    assert.equal(resend.res.status, 429);
    assert.equal(resend.body.error.code, 'verification_code_throttled');
  });
});

test('static verification code can be used for register and resend flows', async () => {
  await withServer(
    {
      NODE_ENV: 'production',
      AUTH_EMAIL_VERIFICATION_STATIC_CODE: '777777',
      AUTH_EMAIL_PROVIDER: 'log',
      AUTH_EMAIL_VERIFICATION_EXPOSE_CODE: 'false',
      AUTH_EMAIL_VERIFICATION_RESEND_COOLDOWN_SEC: '1'
    },
    async (baseUrl) => {
      const register = await postJson(baseUrl, '/auth/register', {
        fullName: 'Static Code User',
        email: 'static-code-user@example.com',
        password: 'pass1234'
      });

      assert.equal(register.res.status, 201);
      assert.equal(register.body.emailVerification.sent, true);
      assert.equal(register.body.emailVerification.developmentCode, undefined);

      const verifyFromRegister = await postJson(baseUrl, '/auth/email-verification/verify', {
        email: 'static-code-user@example.com',
        code: '777777'
      });

      assert.equal(verifyFromRegister.res.status, 200);
      assert.equal(verifyFromRegister.body.verified, true);

      const secondRegister = await postJson(baseUrl, '/auth/register', {
        fullName: 'Static Resend User',
        email: 'static-resend-user@example.com',
        password: 'pass1234'
      });

      assert.equal(secondRegister.res.status, 201);
      await sleep(1100);

      const resend = await postJson(baseUrl, '/auth/email-verification/resend', {
        email: 'static-resend-user@example.com'
      });

      assert.equal(resend.res.status, 200);
      assert.equal(resend.body.sent, true);

      const verifyAfterResend = await postJson(baseUrl, '/auth/email-verification/verify', {
        email: 'static-resend-user@example.com',
        code: '777777'
      });

      assert.equal(verifyAfterResend.res.status, 200);
      assert.equal(verifyAfterResend.body.verified, true);
    }
  );
});

test('verification code expires and max attempts are enforced', async () => {
  await withServer(
    {
      AUTH_EMAIL_VERIFICATION_CODE_TTL_SEC: '1',
      AUTH_EMAIL_VERIFICATION_MAX_ATTEMPTS: '2'
    },
    async (baseUrl) => {
      const expiredRegister = await postJson(baseUrl, '/auth/register', {
        fullName: 'Expire User',
        email: 'expire-user@example.com',
        password: 'pass1234'
      });

      await sleep(1100);

      const expiredVerify = await postJson(baseUrl, '/auth/email-verification/verify', {
        email: 'expire-user@example.com',
        code: expiredRegister.body.emailVerification.developmentCode
      });

      assert.equal(expiredVerify.res.status, 400);
      assert.equal(expiredVerify.body.error.code, 'verification_code_expired');

      const lockedRegister = await postJson(baseUrl, '/auth/register', {
        fullName: 'Lock User',
        email: 'lock-user@example.com',
        password: 'pass1234'
      });

      for (let index = 0; index < 2; index += 1) {
        const attempt = await postJson(baseUrl, '/auth/email-verification/verify', {
          email: 'lock-user@example.com',
          code: '000000'
        });
        assert.equal(attempt.res.status, 400);
      }

      const lockedVerify = await postJson(baseUrl, '/auth/email-verification/verify', {
        email: 'lock-user@example.com',
        code: lockedRegister.body.emailVerification.developmentCode
      });

      assert.equal(lockedVerify.res.status, 400);
      assert.equal(lockedVerify.body.error.code, 'verification_code_locked');
    }
  );
});
