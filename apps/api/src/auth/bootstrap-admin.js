import { hashPassword } from './password.js';

const DEFAULT_FULL_NAME = 'Admin Senpai';
const DEFAULT_ROLE_CODES = ['super_admin', 'sdm', 'lpk', 'tsk', 'kaisha'];

function normalizeRoleCodes(rawValue) {
  const fromEnv = String(rawValue || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (fromEnv.length > 0) {
    return Array.from(new Set(fromEnv));
  }

  return DEFAULT_ROLE_CODES;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

export async function bootstrapAdminAccount({ env = process.env, store, logger }) {
  if (!store || typeof store.findUserByEmail !== 'function' || typeof store.createUser !== 'function') {
    throw new Error('auth store does not support bootstrap admin flow');
  }

  const email = String(env.BOOTSTRAP_ADMIN_EMAIL || '')
    .trim()
    .toLowerCase();
  const password = String(env.BOOTSTRAP_ADMIN_PASSWORD || '').trim();
  const fullName = String(env.BOOTSTRAP_ADMIN_FULL_NAME || DEFAULT_FULL_NAME).trim() || DEFAULT_FULL_NAME;
  const roleCodes = normalizeRoleCodes(env.BOOTSTRAP_ADMIN_ROLE_CODES);
  const shouldResetPassword = parseBoolean(env.BOOTSTRAP_ADMIN_RESET_PASSWORD, false);

  if (!email || !password) {
    logger?.info?.('auth.bootstrap_admin.skipped', {
      reason: 'missing_credentials_env'
    });
    return {
      skipped: true,
      reason: 'missing_credentials_env'
    };
  }

  let user = await store.findUserByEmail(email);
  let created = false;

  if (!user) {
    user = await store.createUser({
      fullName,
      email,
      passwordHash: hashPassword(password)
    });
    created = true;
  }

  if (!user) {
    throw new Error('bootstrap admin account creation failed');
  }

  if (shouldResetPassword && typeof store.updateUserPasswordHash === 'function') {
    await store.updateUserPasswordHash({
      userId: user.id,
      passwordHash: hashPassword(password)
    });
  }

  if (typeof store.ensureUserRole === 'function') {
    for (const roleCode of roleCodes) {
      await store.ensureUserRole({
        userId: user.id,
        roleCode
      });
    }
  }

  const roles =
    typeof store.listUserRolesByUserId === 'function' ? await store.listUserRolesByUserId(user.id) : [];

  logger?.info?.('auth.bootstrap_admin.ready', {
    email,
    created,
    roles
  });

  return {
    skipped: false,
    created,
    email,
    roles
  };
}
