import { createHash, randomInt } from 'node:crypto';
import { hashPassword, verifyPassword } from './password.js';
import { createAccessToken, createRefreshToken, verifyAccessToken } from './tokens.js';
import { InMemoryAuthStore } from './store.js';
import { createEmailDelivery } from './email-delivery.js';

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

function hashVerificationCode(code) {
  return createHash('sha256').update(`email-verification:${String(code)}`).digest('hex');
}

function generateVerificationCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function normalizeVerificationCode(code) {
  return String(code || '').replace(/\s+/g, '').trim();
}

function secondsUntil(timestampMs, nowMs = Date.now()) {
  return Math.max(0, Math.ceil((Number(timestampMs || 0) - nowMs) / 1000));
}

function normalizeCursor(cursor) {
  if (cursor === undefined || cursor === null || String(cursor).trim() === '') {
    return 0;
  }
  const normalized = Number(cursor);
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new ApiError(400, 'invalid_cursor', 'cursor must be a non-negative integer');
  }
  return Math.floor(normalized);
}

function normalizeLimit(limit) {
  const fallback = 25;
  if (limit === undefined || limit === null || String(limit).trim() === '') {
    return fallback;
  }
  const normalized = Number(limit);
  if (!Number.isFinite(normalized) || normalized < 1 || normalized > 100) {
    throw new ApiError(400, 'invalid_limit', 'limit must be between 1 and 100');
  }
  return Math.floor(normalized);
}

function normalizeAdminRoles(roles) {
  if (roles === undefined) {
    return null;
  }
  if (!Array.isArray(roles)) {
    throw new ApiError(400, 'invalid_roles', 'roles must be an array');
  }
  const normalized = Array.from(
    new Set(
      roles
        .map((role) => String(role || '').trim().toLowerCase())
        .filter(Boolean)
    )
  );
  if (normalized.length === 0) {
    throw new ApiError(400, 'invalid_roles', 'roles must include at least one role code');
  }
  return normalized;
}

export class AuthService {
  constructor({
    store,
    accessTokenSecret,
    accessTokenTtlSec,
    refreshTokenTtlSec,
    defaultRoleCode,
    emailDelivery,
    emailVerificationCodeTtlSec,
    emailVerificationResendCooldownSec,
    emailVerificationMaxAttempts,
    exposeEmailVerificationCode
  }) {
    this.store = store;
    this.accessTokenSecret = accessTokenSecret;
    this.accessTokenTtlSec = accessTokenTtlSec;
    this.refreshTokenTtlSec = refreshTokenTtlSec;
    this.defaultRoleCode = defaultRoleCode;
    this.emailDelivery = emailDelivery;
    this.emailVerificationCodeTtlSec = emailVerificationCodeTtlSec;
    this.emailVerificationResendCooldownSec = emailVerificationResendCooldownSec;
    this.emailVerificationMaxAttempts = emailVerificationMaxAttempts;
    this.exposeEmailVerificationCode = exposeEmailVerificationCode;
  }

  async register({ fullName, email, password }) {
    const normalizedName = String(fullName || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (normalizedName.length < 2) {
      throw new ApiError(400, 'invalid_name', 'fullName must be at least 2 characters');
    }
    if (!isValidEmail(normalizedEmail)) {
      throw new ApiError(400, 'invalid_email', 'email is invalid');
    }
    if (String(password || '').length < 8) {
      throw new ApiError(400, 'invalid_password', 'password must be at least 8 characters');
    }

    const user = await this.store.createUser({
      fullName: normalizedName,
      email: normalizedEmail,
      passwordHash: hashPassword(password)
    });

    if (!user) {
      throw new ApiError(409, 'email_exists', 'email already registered');
    }

    await this.assignDefaultRole(user.id);
    const session = await this.issueSession(user);
    const verification = await this.issueEmailVerificationChallenge(user);
    return {
      ...session,
      emailVerification: this.publicEmailVerificationChallenge({
        user,
        challenge: verification.challenge,
        sent: verification.sent,
        code: verification.code
      })
    };
  }

  async login({ identifier, email, password }) {
    const normalizedIdentifier = String(identifier || email || '').trim().toLowerCase();
    const user = await this.store.findUserByEmail(normalizedIdentifier);

    if (!user || !verifyPassword(String(password || ''), user.passwordHash)) {
      throw new ApiError(401, 'invalid_credentials', 'invalid credentials');
    }

    return this.issueSession(user);
  }

  async refresh({ refreshToken }) {
    const token = String(refreshToken || '').trim();
    if (!token) {
      throw new ApiError(400, 'invalid_refresh_token', 'refresh token is required');
    }

    const tokenHash = hashToken(token);
    const session = await this.store.findSessionByTokenHash(tokenHash);
    if (!session || session.revokedAt || Date.now() >= session.expiresAt) {
      throw new ApiError(401, 'invalid_refresh_token', 'refresh token is invalid or expired');
    }

    const user = await this.store.findUserById(session.userId);
    if (!user) {
      throw new ApiError(401, 'invalid_refresh_token', 'refresh token is invalid');
    }

    await this.store.revokeSession(session.id);
    return this.issueSession(user);
  }

  async logout({ refreshToken }) {
    const token = String(refreshToken || '').trim();
    if (!token) {
      return;
    }

    const tokenHash = hashToken(token);
    const session = await this.store.findSessionByTokenHash(tokenHash);
    if (session) {
      await this.store.revokeSession(session.id);
    }
  }

  async resendEmailVerification({ email }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      throw new ApiError(400, 'invalid_email', 'email is invalid');
    }

    const user = await this.store.findUserByEmail(normalizedEmail);
    if (!user) {
      throw new ApiError(404, 'user_not_found', 'user not found');
    }
    if (user.emailVerifiedAt) {
      return {
        email: user.email,
        verified: true,
        alreadyVerified: true
      };
    }

    const latestChallenge = await this.store.findLatestEmailVerificationChallengeByEmail(normalizedEmail);
    const nowMs = Date.now();
    if (
      latestChallenge &&
      !latestChallenge.verifiedAt &&
      nowMs < latestChallenge.resendAvailableAt
    ) {
      throw new ApiError(
        429,
        'verification_code_throttled',
        `Please wait ${secondsUntil(latestChallenge.resendAvailableAt, nowMs)} seconds before requesting a new code`
      );
    }

    const verification = await this.issueEmailVerificationChallenge(user);
    return this.publicEmailVerificationChallenge({
      user,
      challenge: verification.challenge,
      sent: verification.sent,
      code: verification.code
    });
  }

  async verifyEmailVerification({ email, code }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedCode = normalizeVerificationCode(code);

    if (!isValidEmail(normalizedEmail)) {
      throw new ApiError(400, 'invalid_email', 'email is invalid');
    }
    if (!/^\d{6}$/.test(normalizedCode)) {
      throw new ApiError(400, 'verification_code_invalid', 'verification code must be 6 digits');
    }

    const user = await this.store.findUserByEmail(normalizedEmail);
    if (!user) {
      throw new ApiError(400, 'verification_code_invalid', 'verification code is invalid');
    }
    if (user.emailVerifiedAt) {
      return {
        email: user.email,
        verified: true,
        alreadyVerified: true
      };
    }

    const challenge = await this.store.findLatestEmailVerificationChallengeByEmail(normalizedEmail);
    if (!challenge || challenge.verifiedAt) {
      throw new ApiError(400, 'verification_code_invalid', 'verification code is invalid');
    }
    if (Date.now() >= challenge.expiresAt) {
      throw new ApiError(400, 'verification_code_expired', 'verification code has expired');
    }
    if (challenge.attemptCount >= challenge.maxAttempts) {
      throw new ApiError(400, 'verification_code_locked', 'verification code has exceeded the maximum number of attempts');
    }

    if (challenge.codeHash !== hashVerificationCode(normalizedCode)) {
      const updatedChallenge = await this.store.incrementEmailVerificationAttempt(challenge.id);
      if (updatedChallenge && updatedChallenge.attemptCount >= updatedChallenge.maxAttempts) {
        throw new ApiError(400, 'verification_code_locked', 'verification code has exceeded the maximum number of attempts');
      }
      throw new ApiError(400, 'verification_code_invalid', 'verification code is invalid');
    }

    const verifiedAt = new Date().toISOString();
    await this.store.markEmailVerificationChallengeVerified({
      challengeId: challenge.id,
      verifiedAt
    });
    await this.store.markUserEmailVerified({
      userId: user.id,
      verifiedAt
    });

    return {
      email: user.email,
      verified: true,
      alreadyVerified: false
    };
  }

  async authenticateAccessToken(accessToken) {
    const payload = verifyAccessToken({ token: accessToken, secret: this.accessTokenSecret });
    if (!payload || payload.typ !== 'access' || !payload.sub || !payload.exp) {
      throw new ApiError(401, 'invalid_access_token', 'access token is invalid');
    }
    if (Date.now() >= payload.exp * 1000) {
      throw new ApiError(401, 'expired_access_token', 'access token has expired');
    }

    const user = await this.store.findUserById(payload.sub);
    if (!user) {
      throw new ApiError(401, 'invalid_access_token', 'access token is invalid');
    }

    return this.publicUser(user);
  }

  async issueSession(user) {
    const nowSec = Math.floor(Date.now() / 1000);
    const accessPayload = {
      typ: 'access',
      sub: user.id,
      email: user.email,
      exp: nowSec + this.accessTokenTtlSec,
      iat: nowSec
    };
    const accessToken = createAccessToken({ payload: accessPayload, secret: this.accessTokenSecret });

    const refreshToken = createRefreshToken();
    const expiresAt = Date.now() + this.refreshTokenTtlSec * 1000;
    await this.store.createSession({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt
    });

    return {
      user: await this.publicUser(user),
      accessToken,
      refreshToken
    };
  }

  async assignDefaultRole(userId) {
    if (typeof this.store.ensureUserRole !== 'function') {
      return;
    }
    const ok = await this.store.ensureUserRole({
      userId,
      roleCode: this.defaultRoleCode
    });
    if (!ok) {
      throw new ApiError(500, 'role_assignment_failed', `unable to assign default role '${this.defaultRoleCode}'`);
    }
  }

  async publicUser(user) {
    const roles = await this.listRolesForUser(user.id);
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
      emailVerifiedAt: user.emailVerifiedAt || null,
      createdAt: user.createdAt,
      roles
    };
  }

  publicEmailVerificationChallenge({ user, challenge, sent, code }) {
    return {
      required: !user.emailVerifiedAt,
      verified: Boolean(user.emailVerifiedAt),
      email: user.email,
      sent: Boolean(sent),
      expiresInSec: challenge ? secondsUntil(challenge.expiresAt) : 0,
      resendAvailableInSec: challenge ? secondsUntil(challenge.resendAvailableAt) : 0,
      ...(this.exposeEmailVerificationCode && code ? { developmentCode: code } : {})
    };
  }

  async issueEmailVerificationChallenge(user) {
    const code = generateVerificationCode();
    const nowMs = Date.now();
    const challenge = await this.store.createEmailVerificationChallenge({
      userId: user.id,
      email: user.email,
      codeHash: hashVerificationCode(code),
      expiresAt: nowMs + this.emailVerificationCodeTtlSec * 1000,
      resendAvailableAt: nowMs + this.emailVerificationResendCooldownSec * 1000,
      maxAttempts: this.emailVerificationMaxAttempts
    });

    let sent = false;
    try {
      await this.emailDelivery.sendVerificationCode({
        to: user.email,
        fullName: user.fullName,
        code,
        expiresInSec: this.emailVerificationCodeTtlSec
      });
      sent = true;
    } catch {
      sent = false;
    }

    return {
      challenge,
      code,
      sent
    };
  }

  async listRolesForUser(userId) {
    if (typeof this.store.listUserRolesByUserId !== 'function') {
      return [];
    }
    const roles = await this.store.listUserRolesByUserId(userId);
    return Array.isArray(roles) ? roles : [];
  }

  async listAvailableRoles() {
    if (typeof this.store.listRoles !== 'function') {
      return ['super_admin', 'sdm', 'lpk', 'tsk', 'kaisha'];
    }
    const roles = await this.store.listRoles();
    return Array.isArray(roles) ? roles : [];
  }

  async assignRoles(userId, roleCodes, { replace = false } = {}) {
    if (replace && typeof this.store.replaceUserRoles === 'function') {
      const updated = await this.store.replaceUserRoles({ userId, roleCodes });
      if (!updated) {
        throw new ApiError(500, 'role_assignment_failed', 'unable to update user roles');
      }
      return;
    }

    for (const roleCode of roleCodes) {
      const assigned = await this.store.ensureUserRole({ userId, roleCode });
      if (!assigned) {
        throw new ApiError(500, 'role_assignment_failed', `unable to assign role '${roleCode}'`);
      }
    }
  }

  async listAdminUsers({ q, cursor, limit } = {}) {
    if (typeof this.store.listUsers !== 'function') {
      throw new ApiError(500, 'unsupported_store', 'auth store does not support admin user listing');
    }

    const normalizedCursor = normalizeCursor(cursor);
    const normalizedLimit = normalizeLimit(limit);
    const normalizedQuery = String(q || '').trim();

    const page = await this.store.listUsers({
      q: normalizedQuery || undefined,
      cursor: normalizedCursor,
      limit: normalizedLimit
    });

    const itemsRaw = Array.isArray(page) ? page : Array.isArray(page?.items) ? page.items : [];
    const total = Array.isArray(page)
      ? itemsRaw.length
      : Number.isFinite(Number(page?.total))
        ? Math.max(0, Math.floor(Number(page.total)))
        : itemsRaw.length;

    const items = await Promise.all(itemsRaw.map((user) => this.publicUser(user)));
    return {
      items,
      pageInfo: {
        cursor: String(normalizedCursor),
        nextCursor:
          normalizedCursor + items.length < total ? String(normalizedCursor + items.length) : null,
        limit: normalizedLimit,
        total
      }
    };
  }

  async getAdminUser({ userId }) {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) {
      throw new ApiError(400, 'invalid_user_id', 'userId is required');
    }

    const user = await this.store.findUserById(normalizedUserId);
    if (!user) {
      throw new ApiError(404, 'user_not_found', 'user not found');
    }

    return {
      user: await this.publicUser(user)
    };
  }

  async createAdminUser({ fullName, email, password, roles }) {
    const normalizedName = String(fullName || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPassword = String(password || '');

    if (normalizedName.length < 2) {
      throw new ApiError(400, 'invalid_name', 'fullName must be at least 2 characters');
    }
    if (!isValidEmail(normalizedEmail)) {
      throw new ApiError(400, 'invalid_email', 'email is invalid');
    }
    if (normalizedPassword.length < 8) {
      throw new ApiError(400, 'invalid_password', 'password must be at least 8 characters');
    }

    const requestedRoles = normalizeAdminRoles(roles) || ['super_admin'];
    const availableRoles = await this.listAvailableRoles();
    const unknownRoles = requestedRoles.filter((roleCode) => !availableRoles.includes(roleCode));
    if (unknownRoles.length > 0) {
      throw new ApiError(
        400,
        'invalid_roles',
        `unknown role codes: ${unknownRoles.join(', ')}`
      );
    }

    const user = await this.store.createUser({
      fullName: normalizedName,
      email: normalizedEmail,
      passwordHash: hashPassword(normalizedPassword)
    });
    if (!user) {
      throw new ApiError(409, 'email_exists', 'email already registered');
    }

    await this.assignRoles(user.id, requestedRoles, { replace: true });
    return {
      user: await this.publicUser(user)
    };
  }

  async updateAdminUser({ userId, fullName, password, roles }) {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) {
      throw new ApiError(400, 'invalid_user_id', 'userId is required');
    }

    const targetUser = await this.store.findUserById(normalizedUserId);
    if (!targetUser) {
      throw new ApiError(404, 'user_not_found', 'user not found');
    }

    const shouldUpdateName = fullName !== undefined;
    const shouldUpdatePassword = password !== undefined;
    const normalizedRoles = normalizeAdminRoles(roles);
    const shouldUpdateRoles = normalizedRoles !== null;
    if (!shouldUpdateName && !shouldUpdatePassword && !shouldUpdateRoles) {
      throw new ApiError(
        400,
        'invalid_request',
        'at least one of fullName, password, or roles is required'
      );
    }

    if (shouldUpdateName) {
      const normalizedName = String(fullName || '').trim();
      if (normalizedName.length < 2) {
        throw new ApiError(400, 'invalid_name', 'fullName must be at least 2 characters');
      }
      const updated = await this.store.updateUserProfile({
        userId: normalizedUserId,
        fullName: normalizedName
      });
      if (!updated) {
        throw new ApiError(404, 'user_not_found', 'user not found');
      }
    }

    if (shouldUpdatePassword) {
      const normalizedPassword = String(password || '');
      if (normalizedPassword.length < 8) {
        throw new ApiError(400, 'invalid_password', 'password must be at least 8 characters');
      }
      const updated = await this.store.updateUserPasswordHash({
        userId: normalizedUserId,
        passwordHash: hashPassword(normalizedPassword)
      });
      if (!updated) {
        throw new ApiError(404, 'user_not_found', 'user not found');
      }
    }

    if (shouldUpdateRoles) {
      const availableRoles = await this.listAvailableRoles();
      const unknownRoles = normalizedRoles.filter((roleCode) => !availableRoles.includes(roleCode));
      if (unknownRoles.length > 0) {
        throw new ApiError(
          400,
          'invalid_roles',
          `unknown role codes: ${unknownRoles.join(', ')}`
        );
      }
      await this.assignRoles(normalizedUserId, normalizedRoles, { replace: true });
    }

    const refreshedUser = await this.store.findUserById(normalizedUserId);
    return {
      user: await this.publicUser(refreshedUser)
    };
  }
}

export function createAuthService({ store, env = process.env, logger } = {}) {
  return new AuthService({
    store: store || new InMemoryAuthStore(),
    accessTokenSecret: env.AUTH_TOKEN_SECRET || 'dev-insecure-token-secret-change-me',
    accessTokenTtlSec: Number(env.AUTH_ACCESS_TOKEN_TTL_SEC || 900),
    refreshTokenTtlSec: Number(env.AUTH_REFRESH_TOKEN_TTL_SEC || 604800),
    defaultRoleCode: String(env.AUTH_DEFAULT_ROLE_CODE || 'sdm')
      .trim()
      .toLowerCase(),
    emailDelivery: createEmailDelivery({ env, logger }),
    emailVerificationCodeTtlSec: Number(env.AUTH_EMAIL_VERIFICATION_CODE_TTL_SEC || 600),
    emailVerificationResendCooldownSec: Number(env.AUTH_EMAIL_VERIFICATION_RESEND_COOLDOWN_SEC || 60),
    emailVerificationMaxAttempts: Number(env.AUTH_EMAIL_VERIFICATION_MAX_ATTEMPTS || 5),
    exposeEmailVerificationCode:
      String(env.AUTH_EMAIL_VERIFICATION_EXPOSE_CODE || '').trim().toLowerCase() === 'true' ||
      String(env.NODE_ENV || '').trim().toLowerCase() !== 'production'
  });
}

export function isApiError(error) {
  return error instanceof ApiError;
}
