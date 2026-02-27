import { randomUUID } from 'node:crypto';

function mapUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: new Date(row.created_at).toISOString()
  };
}

function mapSessionRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: new Date(row.expires_at).getTime(),
    revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString()
  };
}

function mapKycSessionRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    provider: row.provider,
    submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : null,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

export class PostgresAuthStore {
  constructor({ pool }) {
    this.pool = pool;
  }

  async createUser({ fullName, email, passwordHash }) {
    const normalizedEmail = email.trim().toLowerCase();
    const result = await this.pool.query(
      `
        INSERT INTO users (id, full_name, email, password_hash)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO NOTHING
        RETURNING id, full_name, email, password_hash, created_at
      `,
      [randomUUID(), fullName.trim(), normalizedEmail, passwordHash]
    );

    return mapUserRow(result.rows[0]);
  }

  async findUserByEmail(email) {
    const normalizedEmail = email.trim().toLowerCase();
    const result = await this.pool.query(
      'SELECT id, full_name, email, password_hash, created_at FROM users WHERE email = $1 LIMIT 1',
      [normalizedEmail]
    );

    return mapUserRow(result.rows[0]);
  }

  async findUserById(id) {
    const result = await this.pool.query(
      'SELECT id, full_name, email, password_hash, created_at FROM users WHERE id = $1 LIMIT 1',
      [id]
    );

    return mapUserRow(result.rows[0]);
  }

  async createSession({ userId, tokenHash, expiresAt }) {
    const result = await this.pool.query(
      `
        INSERT INTO sessions (id, user_id, token_hash, expires_at)
        VALUES ($1, $2, $3, TO_TIMESTAMP($4 / 1000.0))
        RETURNING id, user_id, token_hash, expires_at, revoked_at, created_at
      `,
      [randomUUID(), userId, tokenHash, expiresAt]
    );

    return mapSessionRow(result.rows[0]);
  }

  async findSessionByTokenHash(tokenHash) {
    const result = await this.pool.query(
      `
        SELECT id, user_id, token_hash, expires_at, revoked_at, created_at
        FROM sessions
        WHERE token_hash = $1
        LIMIT 1
      `,
      [tokenHash]
    );

    return mapSessionRow(result.rows[0]);
  }

  async revokeSession(sessionId) {
    await this.pool.query(
      `
        UPDATE sessions
        SET revoked_at = NOW()
        WHERE id = $1 AND revoked_at IS NULL
      `,
      [sessionId]
    );
  }

  async createKycSession({ userId, provider = 'manual' }) {
    const normalizedProvider = String(provider || 'manual').trim().toLowerCase() || 'manual';
    const result = await this.pool.query(
      `
        INSERT INTO kyc_sessions (id, user_id, status, provider)
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          user_id,
          status,
          provider,
          submitted_at,
          reviewed_by,
          reviewed_at,
          created_at,
          updated_at
      `,
      [randomUUID(), userId, 'CREATED', normalizedProvider]
    );

    return mapKycSessionRow(result.rows[0]);
  }

  async findLatestKycSessionByUserId(userId) {
    const result = await this.pool.query(
      `
        SELECT
          id,
          user_id,
          status,
          provider,
          submitted_at,
          reviewed_by,
          reviewed_at,
          created_at,
          updated_at
        FROM kyc_sessions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [userId]
    );

    return mapKycSessionRow(result.rows[0]);
  }
}
