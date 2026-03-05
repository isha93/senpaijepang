import { createHash, randomInt } from 'node:crypto';
import { hashPassword, verifyPassword } from './password.js';
import { createAccessToken, createRefreshToken, verifyAccessToken } from './tokens.js';
import { InMemoryAuthStore } from './store.js';

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
  return createHash('sha256')
    .update(String(code || '').trim())
    .digest('hex');
}

function normalizeVerificationPurpose(purpose) {
  const normalized = String(purpose || 'REGISTER')
    .trim()
    .toUpperCase();
  if (normalized !== 'REGISTER') {
    throw new ApiError(400, 'invalid_verification_purpose', 'purpose must be REGISTER');
  }
  return normalized;
}

function normalizeVerificationCode(code) {
  const normalized = String(code || '').trim();
  if (!/^\d{6}$/.test(normalized)) {
    throw new ApiError(400, 'invalid_verification_code', 'code must be a 6-digit numeric string');
  }
  return normalized;
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
    emailVerificationCodeTtlSec,
    emailVerificationResendCooldownSec,
    emailVerificationMaxAttempts,
    emailVerificationMaxSendPerHour,
    emailVerificationStaticCode
  }) {
    this.store = store;
    this.accessTokenSecret = accessTokenSecret;
    this.accessTokenTtlSec = accessTokenTtlSec;
    this.refreshTokenTtlSec = refreshTokenTtlSec;
    this.defaultRoleCode = defaultRoleCode;
    this.emailVerificationCodeTtlSec = emailVerificationCodeTtlSec;
    this.emailVerificationResendCooldownSec = emailVerificationResendCooldownSec;
    this.emailVerificationMaxAttempts = emailVerificationMaxAttempts;
    this.emailVerificationMaxSendPerHour = emailVerificationMaxSendPerHour;
    this.emailVerificationStaticCode = emailVerificationStaticCode;
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
    return this.issueSession(user);
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

  async sendEmailVerification({ userId, email, purpose }) {
    const targetUser = await this.validateEmailVerificationTarget({ userId, email });
    const normalizedPurpose = normalizeVerificationPurpose(purpose);

    if (targetUser.emailVerifiedAt) {
      throw new ApiError(409, 'email_already_verified', 'email already verified');
    }

    const nowMs = Date.now();
    const latest = await this.store.findLatestEmailVerificationByUserAndPurpose({
      userId,
      purpose: normalizedPurpose
    });

    if (
      latest &&
      Number.isFinite(Number(latest.resendAvailableAt)) &&
      Number(latest.resendAvailableAt) > nowMs
    ) {
      const retryAfterSec = Math.ceil((Number(latest.resendAvailableAt) - nowMs) / 1000);
      throw new ApiError(
        429,
        'verification_resend_cooldown',
        `resend available in ${Math.max(1, retryAfterSec)} second(s)`
      );
    }

    const sentInLastHour = await this.store.countEmailVerificationsSince({
      userId,
      purpose: normalizedPurpose,
      sinceAt: nowMs - 60 * 60 * 1000
    });
    if (sentInLastHour >= this.emailVerificationMaxSendPerHour) {
      throw new ApiError(
        429,
        'verification_send_rate_limited',
        'verification send limit reached, please try again later'
      );
    }

    const verificationCode = this.generateVerificationCode();
    const created = await this.store.createEmailVerification({
      userId,
      email: targetUser.email,
      purpose: normalizedPurpose,
      codeHash: hashVerificationCode(verificationCode),
      expiresAt: nowMs + this.emailVerificationCodeTtlSec * 1000,
      resendAvailableAt: nowMs + this.emailVerificationResendCooldownSec * 1000,
      maxAttempts: this.emailVerificationMaxAttempts
    });

    // TODO(email-provider): dispatch verification code to SMTP/provider.
    return this.buildEmailVerificationChallengeResponse(created, verificationCode);
  }

  async resendEmailVerification({ userId, email, purpose }) {
    return this.sendEmailVerification({ userId, email, purpose });
  }

  async verifyEmailVerification({ userId, email, code, purpose }) {
    const targetUser = await this.validateEmailVerificationTarget({ userId, email });
    const normalizedPurpose = normalizeVerificationPurpose(purpose);
    const normalizedCode = normalizeVerificationCode(code);

    if (targetUser.emailVerifiedAt) {
      return {
        verified: true,
        verifiedAt: targetUser.emailVerifiedAt
      };
    }

    const latest = await this.store.findLatestEmailVerificationByUserAndPurpose({
      userId,
      purpose: normalizedPurpose
    });
    if (!latest || String(latest.email || '').trim().toLowerCase() !== targetUser.email) {
      throw new ApiError(404, 'verification_not_found', 'verification challenge not found');
    }

    if (latest.status === 'LOCKED') {
      throw new ApiError(
        429,
        'verification_attempts_exceeded',
        'verification attempts exceeded, request a new code'
      );
    }

    if (latest.status === 'VERIFIED') {
      return {
        verified: true,
        verifiedAt: latest.verifiedAt || targetUser.emailVerifiedAt || new Date().toISOString()
      };
    }

    if (Number.isFinite(Number(latest.expiresAt)) && Date.now() >= Number(latest.expiresAt)) {
      await this.store.markEmailVerificationExpired({ verificationId: latest.id });
      throw new ApiError(400, 'verification_code_expired', 'verification code has expired');
    }

    const codeHash = hashVerificationCode(normalizedCode);
    if (codeHash !== latest.codeHash) {
      const updatedAttempt = await this.store.incrementEmailVerificationAttempt({
        verificationId: latest.id
      });
      if (updatedAttempt?.status === 'LOCKED') {
        throw new ApiError(
          429,
          'verification_attempts_exceeded',
          'verification attempts exceeded, request a new code'
        );
      }
      throw new ApiError(400, 'invalid_verification_code', 'verification code is invalid');
    }

    const verifiedAtMs = Date.now();
    const verifiedAtIso = new Date(verifiedAtMs).toISOString();
    await this.store.markEmailVerificationVerified({
      verificationId: latest.id,
      verifiedAt: verifiedAtMs
    });
    await this.store.markUserEmailVerified({
      userId,
      verifiedAt: verifiedAtMs
    });

    return {
      verified: true,
      verifiedAt: verifiedAtIso
    };
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
      emailVerifiedAt: user.emailVerifiedAt || null,
      createdAt: user.createdAt,
      roles
    };
  }

  async validateEmailVerificationTarget({ userId, email }) {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) {
      throw new ApiError(400, 'invalid_user_id', 'userId is required');
    }
    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      throw new ApiError(400, 'invalid_email', 'email is invalid');
    }

    const targetUser = await this.store.findUserById(normalizedUserId);
    if (!targetUser) {
      throw new ApiError(404, 'user_not_found', 'user not found');
    }
    if (targetUser.email !== normalizedEmail) {
      throw new ApiError(400, 'email_mismatch', 'email does not match authenticated user');
    }
    return targetUser;
  }

  buildEmailVerificationChallengeResponse(verification, verificationCode) {
    const nowMs = Date.now();
    const resendAvailableAt = Number(verification.resendAvailableAt || nowMs);
    const nextResendInSec = Math.max(0, Math.ceil((resendAvailableAt - nowMs) / 1000));
    return {
      verificationId: verification.id,
      expiresAt: Number.isFinite(Number(verification.expiresAt))
        ? new Date(Number(verification.expiresAt)).toISOString()
        : null,
      resendAvailableAt: Number.isFinite(Number(verification.resendAvailableAt))
        ? new Date(Number(verification.resendAvailableAt)).toISOString()
        : null,
      nextResendInSec,
      ...(this.emailVerificationStaticCode
        ? { developmentCode: verificationCode }
        : {})
    };
  }

  generateVerificationCode() {
    if (this.emailVerificationStaticCode) {
      return this.emailVerificationStaticCode;
    }
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
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

export function createAuthService({ store, env = process.env } = {}) {
  const normalizedStaticCode = String(
    env.AUTH_EMAIL_VERIFICATION_STATIC_CODE ??
      (String(env.NODE_ENV || '').trim().toLowerCase() === 'production' ? '' : '123456')
  ).trim();
  return new AuthService({
    store: store || new InMemoryAuthStore(),
    accessTokenSecret: env.AUTH_TOKEN_SECRET || 'dev-insecure-token-secret-change-me',
    accessTokenTtlSec: Number(env.AUTH_ACCESS_TOKEN_TTL_SEC || 900),
    refreshTokenTtlSec: Number(env.AUTH_REFRESH_TOKEN_TTL_SEC || 604800),
    defaultRoleCode: String(env.AUTH_DEFAULT_ROLE_CODE || 'sdm')
      .trim()
      .toLowerCase(),
    emailVerificationCodeTtlSec: Number(env.AUTH_EMAIL_VERIFICATION_TTL_SEC || 300),
    emailVerificationResendCooldownSec: Number(env.AUTH_EMAIL_VERIFICATION_RESEND_COOLDOWN_SEC || 60),
    emailVerificationMaxAttempts: Number(env.AUTH_EMAIL_VERIFICATION_MAX_ATTEMPTS || 5),
    emailVerificationMaxSendPerHour: Number(env.AUTH_EMAIL_VERIFICATION_MAX_SEND_PER_HOUR || 5),
    emailVerificationStaticCode: normalizedStaticCode
  });
}

export function isApiError(error) {
  return error instanceof ApiError;
}
