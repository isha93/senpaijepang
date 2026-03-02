import { createHash } from 'node:crypto';
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

export class AuthService {
  constructor({ store, accessTokenSecret, accessTokenTtlSec, refreshTokenTtlSec, defaultRoleCode }) {
    this.store = store;
    this.accessTokenSecret = accessTokenSecret;
    this.accessTokenTtlSec = accessTokenTtlSec;
    this.refreshTokenTtlSec = refreshTokenTtlSec;
    this.defaultRoleCode = defaultRoleCode;
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
      createdAt: user.createdAt,
      roles
    };
  }

  async listRolesForUser(userId) {
    if (typeof this.store.listUserRolesByUserId !== 'function') {
      return [];
    }
    const roles = await this.store.listUserRolesByUserId(userId);
    return Array.isArray(roles) ? roles : [];
  }
}

export function createAuthService({ store, env = process.env } = {}) {
  return new AuthService({
    store: store || new InMemoryAuthStore(),
    accessTokenSecret: env.AUTH_TOKEN_SECRET || 'dev-insecure-token-secret-change-me',
    accessTokenTtlSec: Number(env.AUTH_ACCESS_TOKEN_TTL_SEC || 900),
    refreshTokenTtlSec: Number(env.AUTH_REFRESH_TOKEN_TTL_SEC || 604800),
    defaultRoleCode: String(env.AUTH_DEFAULT_ROLE_CODE || 'sdm')
      .trim()
      .toLowerCase()
  });
}

export function isApiError(error) {
  return error instanceof ApiError;
}
