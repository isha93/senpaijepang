import { randomUUID } from 'node:crypto';

function mapUserRow(row) {
  if (!row) return null;
  const createdAt = row.created_at ? new Date(row.created_at).toISOString() : null;
  const updatedAt = row.updated_at ? new Date(row.updated_at).toISOString() : createdAt;
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    passwordHash: row.password_hash,
    avatarUrl: row.avatar_url || null,
    createdAt,
    updatedAt
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
    providerRef: row.provider_ref,
    providerMetadataJson: row.provider_metadata_json || {},
    submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : null,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function mapIdentityDocumentRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    kycSessionId: row.kyc_session_id,
    documentType: row.document_type,
    fileUrl: row.file_url,
    checksumSha256: row.checksum_sha256,
    metadataJson: row.metadata_json || {},
    verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString()
  };
}

function mapKycStatusEventRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    kycSessionId: row.kyc_session_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    actorType: row.actor_type,
    actorId: row.actor_id,
    reason: row.reason,
    createdAt: new Date(row.created_at).toISOString()
  };
}

function mapOrganizationRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    orgType: row.org_type,
    countryCode: row.country_code,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function mapOrganizationVerificationRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    orgId: row.org_id,
    status: row.status,
    reasonCodesJson: Array.isArray(row.reason_codes_json) ? row.reason_codes_json : [],
    registrationNumber: row.registration_number,
    legalName: row.legal_name,
    supportingObjectKeysJson: Array.isArray(row.supporting_object_keys_json)
      ? row.supporting_object_keys_json
      : [],
    lastCheckedAt: row.last_checked_at ? new Date(row.last_checked_at).toISOString() : null,
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
        RETURNING id, full_name, email, password_hash, avatar_url, created_at, updated_at
      `,
      [randomUUID(), fullName.trim(), normalizedEmail, passwordHash]
    );

    return mapUserRow(result.rows[0]);
  }

  async findUserByEmail(email) {
    const normalizedEmail = email.trim().toLowerCase();
    const result = await this.pool.query(
      'SELECT id, full_name, email, password_hash, avatar_url, created_at, updated_at FROM users WHERE email = $1 LIMIT 1',
      [normalizedEmail]
    );

    return mapUserRow(result.rows[0]);
  }

  async findUserById(id) {
    const result = await this.pool.query(
      'SELECT id, full_name, email, password_hash, avatar_url, created_at, updated_at FROM users WHERE id = $1 LIMIT 1',
      [id]
    );

    return mapUserRow(result.rows[0]);
  }

  async updateUserProfile({ userId, fullName, avatarUrl }) {
    const shouldUpdateAvatar = avatarUrl !== undefined;
    const result = await this.pool.query(
      `
        UPDATE users
        SET
          full_name = COALESCE($2::text, full_name),
          avatar_url = CASE WHEN $3::boolean THEN $4::text ELSE avatar_url END,
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, full_name, email, password_hash, avatar_url, created_at, updated_at
      `,
      [userId, fullName === undefined ? null : fullName, shouldUpdateAvatar, shouldUpdateAvatar ? avatarUrl : null]
    );

    return mapUserRow(result.rows[0]);
  }

  async updateUserPasswordHash({ userId, passwordHash }) {
    const result = await this.pool.query(
      `
        UPDATE users
        SET
          password_hash = $2,
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, full_name, email, password_hash, avatar_url, created_at, updated_at
      `,
      [userId, passwordHash]
    );

    return mapUserRow(result.rows[0]);
  }

  async ensureUserRole({ userId, roleCode }) {
    const normalizedRoleCode = String(roleCode || '')
      .trim()
      .toLowerCase();
    const roleResult = await this.pool.query('SELECT id FROM roles WHERE code = $1 LIMIT 1', [
      normalizedRoleCode
    ]);
    const role = roleResult.rows[0];
    if (!role) {
      return false;
    }

    await this.pool.query(
      `
        INSERT INTO user_roles (id, user_id, role_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, role_id) DO NOTHING
      `,
      [randomUUID(), userId, role.id]
    );

    return true;
  }

  async listUserRolesByUserId(userId) {
    const result = await this.pool.query(
      `
        SELECT r.code
        FROM roles r
        JOIN user_roles ur ON ur.role_id = r.id
        WHERE ur.user_id = $1
        ORDER BY r.code ASC
      `,
      [userId]
    );
    return result.rows.map((row) => row.code);
  }

  async listRoles() {
    const result = await this.pool.query(
      `
        SELECT code
        FROM roles
        ORDER BY code ASC
      `
    );
    return result.rows.map((row) => row.code);
  }

  async replaceUserRoles({ userId, roleCodes }) {
    const normalizedRoleCodes = Array.from(
      new Set(
        (Array.isArray(roleCodes) ? roleCodes : [])
          .map((roleCode) => String(roleCode || '').trim().toLowerCase())
          .filter(Boolean)
      )
    );
    if (normalizedRoleCodes.length === 0) {
      return false;
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [userId]);
      if (!userResult.rows[0]) {
        await client.query('ROLLBACK');
        return false;
      }

      const roleResult = await client.query('SELECT id, code FROM roles WHERE code = ANY($1::text[])', [
        normalizedRoleCodes
      ]);
      if (roleResult.rows.length !== normalizedRoleCodes.length) {
        await client.query('ROLLBACK');
        return false;
      }

      await client.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
      for (const role of roleResult.rows) {
        await client.query(
          `
            INSERT INTO user_roles (id, user_id, role_id)
            VALUES ($1, $2, $3)
          `,
          [randomUUID(), userId, role.id]
        );
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listUsers({ q, cursor = 0, limit = 25 } = {}) {
    const normalizedCursor = Number.isFinite(Number(cursor)) ? Math.max(0, Math.floor(Number(cursor))) : 0;
    const normalizedLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.floor(Number(limit))) : 25;
    const normalizedQuery = String(q || '').trim();
    const hasQuery = normalizedQuery.length > 0;
    const queryValue = hasQuery ? `%${normalizedQuery}%` : null;

    const [listResult, countResult] = await Promise.all([
      this.pool.query(
        `
          SELECT id, full_name, email, password_hash, avatar_url, created_at, updated_at
          FROM users
          WHERE ($1::text IS NULL OR full_name ILIKE $1 OR email ILIKE $1)
          ORDER BY created_at DESC
          LIMIT $2
          OFFSET $3
        `,
        [queryValue, normalizedLimit, normalizedCursor]
      ),
      this.pool.query(
        `
          SELECT COUNT(*)::int AS total
          FROM users
          WHERE ($1::text IS NULL OR full_name ILIKE $1 OR email ILIKE $1)
        `,
        [queryValue]
      )
    ]);

    return {
      items: listResult.rows.map((row) => mapUserRow(row)),
      total: Number(countResult.rows[0]?.total || 0)
    };
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
          provider_ref,
          provider_metadata_json,
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
          provider_ref,
          provider_metadata_json,
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

  async findKycSessionById(sessionId) {
    const result = await this.pool.query(
      `
        SELECT
          id,
          user_id,
          status,
          provider,
          provider_ref,
          provider_metadata_json,
          submitted_at,
          reviewed_by,
          reviewed_at,
          created_at,
          updated_at
        FROM kyc_sessions
        WHERE id = $1
        LIMIT 1
      `,
      [sessionId]
    );

    return mapKycSessionRow(result.rows[0]);
  }

  async updateKycSessionStatus({ sessionId, status, submittedAt, reviewedBy, reviewedAt }) {
    const result = await this.pool.query(
      `
        UPDATE kyc_sessions
        SET
          status = $2,
          submitted_at = COALESCE($3::timestamptz, submitted_at),
          reviewed_by = COALESCE($4::text, reviewed_by),
          reviewed_at = COALESCE($5::timestamptz, reviewed_at),
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          user_id,
          status,
          provider,
          provider_ref,
          provider_metadata_json,
          submitted_at,
          reviewed_by,
          reviewed_at,
          created_at,
          updated_at
      `,
      [sessionId, status, submittedAt || null, reviewedBy || null, reviewedAt || null]
    );

    return mapKycSessionRow(result.rows[0]);
  }

  async createIdentityDocument({ kycSessionId, documentType, fileUrl, checksumSha256, metadataJson }) {
    const result = await this.pool.query(
      `
        INSERT INTO identity_documents (
          id,
          kyc_session_id,
          document_type,
          file_url,
          checksum_sha256,
          metadata_json
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        RETURNING
          id,
          kyc_session_id,
          document_type,
          file_url,
          checksum_sha256,
          metadata_json,
          verified_at,
          created_at
      `,
      [randomUUID(), kycSessionId, documentType, fileUrl, checksumSha256, JSON.stringify(metadataJson || {})]
    );

    return mapIdentityDocumentRow(result.rows[0]);
  }

  async updateKycSessionProviderData({ sessionId, providerRef, providerMetadataJson }) {
    const result = await this.pool.query(
      `
        UPDATE kyc_sessions
        SET
          provider_ref = COALESCE($2::text, provider_ref),
          provider_metadata_json = COALESCE(provider_metadata_json, '{}'::jsonb) || COALESCE($3::jsonb, '{}'::jsonb),
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          user_id,
          status,
          provider,
          provider_ref,
          provider_metadata_json,
          submitted_at,
          reviewed_by,
          reviewed_at,
          created_at,
          updated_at
      `,
      [sessionId, providerRef || null, JSON.stringify(providerMetadataJson || {})]
    );

    return mapKycSessionRow(result.rows[0]);
  }

  async findIdentityDocumentBySessionAndChecksum({ kycSessionId, checksumSha256 }) {
    const result = await this.pool.query(
      `
        SELECT
          id,
          kyc_session_id,
          document_type,
          file_url,
          checksum_sha256,
          metadata_json,
          verified_at,
          created_at
        FROM identity_documents
        WHERE kyc_session_id = $1 AND checksum_sha256 = $2
        LIMIT 1
      `,
      [kycSessionId, checksumSha256]
    );

    return mapIdentityDocumentRow(result.rows[0]);
  }

  async createKycStatusEvent({ kycSessionId, fromStatus, toStatus, actorType, actorId, reason }) {
    const result = await this.pool.query(
      `
        INSERT INTO kyc_status_events (
          id,
          kyc_session_id,
          from_status,
          to_status,
          actor_type,
          actor_id,
          reason
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          kyc_session_id,
          from_status,
          to_status,
          actor_type,
          actor_id,
          reason,
          created_at
      `,
      [randomUUID(), kycSessionId, fromStatus || null, toStatus, actorType, actorId || null, reason || null]
    );

    return mapKycStatusEventRow(result.rows[0]);
  }

  async listKycStatusEventsBySessionId(kycSessionId) {
    const result = await this.pool.query(
      `
        SELECT
          id,
          kyc_session_id,
          from_status,
          to_status,
          actor_type,
          actor_id,
          reason,
          created_at
        FROM kyc_status_events
        WHERE kyc_session_id = $1
        ORDER BY created_at ASC
      `,
      [kycSessionId]
    );

    return result.rows.map((row) => mapKycStatusEventRow(row));
  }

  async listKycStatusEvents({ cursor = 0, limit = 25, actorId, from, to, toStatus } = {}) {
    const normalizedCursor = Number.isFinite(Number(cursor)) ? Math.max(0, Math.floor(Number(cursor))) : 0;
    const normalizedLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.floor(Number(limit))) : 25;
    const normalizedActorId = String(actorId || '').trim();
    const normalizedFrom = String(from || '').trim();
    const normalizedTo = String(to || '').trim();
    const normalizedToStatus = String(toStatus || '')
      .trim()
      .toUpperCase();

    const whereParts = [];
    const params = [];
    if (normalizedActorId) {
      params.push(normalizedActorId);
      whereParts.push(`actor_id = $${params.length}`);
    }
    if (normalizedFrom) {
      params.push(normalizedFrom);
      whereParts.push(`created_at >= $${params.length}::timestamptz`);
    }
    if (normalizedTo) {
      params.push(normalizedTo);
      whereParts.push(`created_at <= $${params.length}::timestamptz`);
    }
    if (normalizedToStatus) {
      params.push(normalizedToStatus);
      whereParts.push(`to_status = $${params.length}`);
    }
    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    const countResult = await this.pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM kyc_status_events
        ${whereClause}
      `,
      params
    );
    const total = Number(countResult.rows[0]?.total || 0);

    const listParams = [...params, normalizedLimit, normalizedCursor];
    const result = await this.pool.query(
      `
        SELECT
          id,
          kyc_session_id,
          from_status,
          to_status,
          actor_type,
          actor_id,
          reason,
          created_at
        FROM kyc_status_events
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
      `,
      listParams
    );

    return {
      items: result.rows.map((row) => mapKycStatusEventRow(row)),
      total
    };
  }

  async listKycSessionsByStatuses({ statuses, cursor = 0, limit }) {
    const normalizedStatuses = Array.isArray(statuses) ? statuses.filter(Boolean) : [];
    const normalizedCursor = Number.isFinite(Number(cursor)) ? Math.max(0, Math.floor(Number(cursor))) : 0;
    const normalizedLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.floor(Number(limit))) : 25;
    const query = `
      SELECT
        id,
        user_id,
        status,
        provider,
        provider_ref,
        provider_metadata_json,
        submitted_at,
        reviewed_by,
        reviewed_at,
        created_at,
        updated_at
      FROM kyc_sessions
      WHERE ($1::text[] IS NULL OR status = ANY($1::text[]))
      ORDER BY COALESCE(submitted_at, created_at) DESC
      LIMIT $2
      OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM kyc_sessions
      WHERE ($1::text[] IS NULL OR status = ANY($1::text[]))
    `;

    const statusParam = normalizedStatuses.length > 0 ? normalizedStatuses : null;
    const [result, countResult] = await Promise.all([
      this.pool.query(query, [statusParam, normalizedLimit, normalizedCursor]),
      this.pool.query(countQuery, [statusParam])
    ]);

    return {
      items: result.rows.map((row) => mapKycSessionRow(row)),
      total: Number(countResult.rows[0]?.total || 0)
    };
  }

  async listIdentityDocumentsBySessionId(kycSessionId) {
    const result = await this.pool.query(
      `
        SELECT
          id,
          kyc_session_id,
          document_type,
          file_url,
          checksum_sha256,
          metadata_json,
          verified_at,
          created_at
        FROM identity_documents
        WHERE kyc_session_id = $1
        ORDER BY created_at ASC
      `,
      [kycSessionId]
    );
    return result.rows.map((row) => mapIdentityDocumentRow(row));
  }

  async createOrganization({ ownerUserId, name, orgType, countryCode }) {
    const result = await this.pool.query(
      `
        INSERT INTO organizations (id, owner_user_id, name, org_type, country_code)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, owner_user_id, name, org_type, country_code, created_at, updated_at
      `,
      [randomUUID(), ownerUserId, name, orgType, countryCode]
    );
    return mapOrganizationRow(result.rows[0]);
  }

  async findOrganizationById(orgId) {
    const result = await this.pool.query(
      `
        SELECT id, owner_user_id, name, org_type, country_code, created_at, updated_at
        FROM organizations
        WHERE id = $1
        LIMIT 1
      `,
      [orgId]
    );
    return mapOrganizationRow(result.rows[0]);
  }

  async listOrganizations() {
    const result = await this.pool.query(
      `
        SELECT id, owner_user_id, name, org_type, country_code, created_at, updated_at
        FROM organizations
        ORDER BY created_at DESC
      `
    );
    return result.rows.map((row) => mapOrganizationRow(row));
  }

  async createOrUpdateOrganizationVerification({
    orgId,
    status,
    reasonCodesJson,
    registrationNumber,
    legalName,
    supportingObjectKeysJson,
    lastCheckedAt
  }) {
    const result = await this.pool.query(
      `
        INSERT INTO organization_verifications (
          id,
          org_id,
          status,
          reason_codes_json,
          registration_number,
          legal_name,
          supporting_object_keys_json,
          last_checked_at
        )
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb, $8::timestamptz)
        ON CONFLICT (org_id)
        DO UPDATE SET
          status = EXCLUDED.status,
          reason_codes_json = EXCLUDED.reason_codes_json,
          registration_number = EXCLUDED.registration_number,
          legal_name = EXCLUDED.legal_name,
          supporting_object_keys_json = EXCLUDED.supporting_object_keys_json,
          last_checked_at = EXCLUDED.last_checked_at,
          updated_at = NOW()
        RETURNING
          id,
          org_id,
          status,
          reason_codes_json,
          registration_number,
          legal_name,
          supporting_object_keys_json,
          last_checked_at,
          created_at,
          updated_at
      `,
      [
        randomUUID(),
        orgId,
        status,
        JSON.stringify(Array.isArray(reasonCodesJson) ? reasonCodesJson : []),
        registrationNumber,
        legalName,
        JSON.stringify(Array.isArray(supportingObjectKeysJson) ? supportingObjectKeysJson : []),
        lastCheckedAt || new Date().toISOString()
      ]
    );
    return mapOrganizationVerificationRow(result.rows[0]);
  }

  async findOrganizationVerificationByOrgId(orgId) {
    const result = await this.pool.query(
      `
        SELECT
          id,
          org_id,
          status,
          reason_codes_json,
          registration_number,
          legal_name,
          supporting_object_keys_json,
          last_checked_at,
          created_at,
          updated_at
        FROM organization_verifications
        WHERE org_id = $1
        LIMIT 1
      `,
      [orgId]
    );
    return mapOrganizationVerificationRow(result.rows[0]);
  }
}
