import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryAuthStore } from '../src/auth/store.js';
import { bootstrapAdminAccount } from '../src/auth/bootstrap-admin.js';
import { verifyPassword } from '../src/auth/password.js';

test('bootstrap admin creates account and assigns configured roles', async () => {
  const store = new InMemoryAuthStore();

  const result = await bootstrapAdminAccount({
    env: {
      BOOTSTRAP_ADMIN_EMAIL: 'admin@senpaijepang.com',
      BOOTSTRAP_ADMIN_PASSWORD: 'Admin12345',
      BOOTSTRAP_ADMIN_FULL_NAME: 'Admin Senpai',
      BOOTSTRAP_ADMIN_ROLE_CODES: 'super_admin,lpk,tsk'
    },
    store
  });

  assert.equal(result.skipped, false);
  assert.equal(result.created, true);
  assert.equal(result.email, 'admin@senpaijepang.com');
  assert.deepEqual(result.roles, ['lpk', 'super_admin', 'tsk']);

  const user = store.findUserByEmail('admin@senpaijepang.com');
  assert.ok(user);
  assert.equal(user.fullName, 'Admin Senpai');
  assert.equal(verifyPassword('Admin12345', user.passwordHash), true);
});

test('bootstrap admin resets password when BOOTSTRAP_ADMIN_RESET_PASSWORD=true', async () => {
  const store = new InMemoryAuthStore();

  const initial = await bootstrapAdminAccount({
    env: {
      BOOTSTRAP_ADMIN_EMAIL: 'admin@senpaijepang.com',
      BOOTSTRAP_ADMIN_PASSWORD: 'OldPass123',
      BOOTSTRAP_ADMIN_FULL_NAME: 'Admin Senpai'
    },
    store
  });

  assert.equal(initial.created, true);

  const updated = await bootstrapAdminAccount({
    env: {
      BOOTSTRAP_ADMIN_EMAIL: 'admin@senpaijepang.com',
      BOOTSTRAP_ADMIN_PASSWORD: 'NewPass456',
      BOOTSTRAP_ADMIN_RESET_PASSWORD: 'true'
    },
    store
  });

  assert.equal(updated.skipped, false);
  assert.equal(updated.created, false);

  const user = store.findUserByEmail('admin@senpaijepang.com');
  assert.ok(user);
  assert.equal(verifyPassword('NewPass456', user.passwordHash), true);
});

test('bootstrap admin skips when credential env is missing', async () => {
  const store = new InMemoryAuthStore();
  const result = await bootstrapAdminAccount({
    env: {},
    store
  });

  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'missing_credentials_env');
});
