import { randomUUID } from 'node:crypto';

export class InMemoryAuthStore {
  constructor() {
    this.usersById = new Map();
    this.userIdByEmail = new Map();
    this.sessionsById = new Map();
    this.sessionIdByTokenHash = new Map();
    this.kycSessionsById = new Map();
    this.kycSessionIdsByUserId = new Map();
    this.identityDocumentsById = new Map();
    this.identityDocumentIdsBySessionId = new Map();
    this.kycStatusEventsById = new Map();
    this.kycStatusEventIdsBySessionId = new Map();
    this.rolesByCode = new Map([
      [
        'sdm',
        {
          id: '00000000-0000-0000-0000-000000000001',
          code: 'sdm',
          description: 'Default SDM candidate role'
        }
      ],
      [
        'tsk_operator',
        {
          id: '00000000-0000-0000-0000-000000000002',
          code: 'tsk_operator',
          description: 'TSK/LPK operator role'
        }
      ],
      [
        'admin_ops',
        {
          id: '00000000-0000-0000-0000-000000000003',
          code: 'admin_ops',
          description: 'Internal operations admin role'
        }
      ],
      [
        'compliance_officer',
        {
          id: '00000000-0000-0000-0000-000000000004',
          code: 'compliance_officer',
          description: 'Compliance/audit role'
        }
      ]
    ]);
    this.userRoleCodesByUserId = new Map();
  }

  createUser({ fullName, email, passwordHash }) {
    const normalizedEmail = email.trim().toLowerCase();
    if (this.userIdByEmail.has(normalizedEmail)) {
      return null;
    }

    const user = {
      id: randomUUID(),
      fullName: fullName.trim(),
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date().toISOString()
    };

    this.usersById.set(user.id, user);
    this.userIdByEmail.set(normalizedEmail, user.id);
    return user;
  }

  findUserByEmail(email) {
    const normalizedEmail = email.trim().toLowerCase();
    const id = this.userIdByEmail.get(normalizedEmail);
    return id ? this.usersById.get(id) || null : null;
  }

  findUserById(id) {
    return this.usersById.get(id) || null;
  }

  ensureUserRole({ userId, roleCode }) {
    if (!this.usersById.has(userId)) {
      return false;
    }
    const normalizedRoleCode = String(roleCode || '')
      .trim()
      .toLowerCase();
    if (!this.rolesByCode.has(normalizedRoleCode)) {
      return false;
    }

    const roleCodes = this.userRoleCodesByUserId.get(userId) || new Set();
    roleCodes.add(normalizedRoleCode);
    this.userRoleCodesByUserId.set(userId, roleCodes);
    return true;
  }

  listUserRolesByUserId(userId) {
    const roleCodes = this.userRoleCodesByUserId.get(userId) || new Set();
    return Array.from(roleCodes).sort();
  }

  createSession({ userId, tokenHash, expiresAt }) {
    const session = {
      id: randomUUID(),
      userId,
      tokenHash,
      expiresAt,
      revokedAt: null,
      createdAt: new Date().toISOString()
    };

    this.sessionsById.set(session.id, session);
    this.sessionIdByTokenHash.set(tokenHash, session.id);
    return session;
  }

  findSessionByTokenHash(tokenHash) {
    const id = this.sessionIdByTokenHash.get(tokenHash);
    return id ? this.sessionsById.get(id) || null : null;
  }

  revokeSession(sessionId) {
    const session = this.sessionsById.get(sessionId);
    if (!session || session.revokedAt) {
      return;
    }
    session.revokedAt = new Date().toISOString();
  }

  createKycSession({ userId, provider = 'manual' }) {
    const now = new Date().toISOString();
    const session = {
      id: randomUUID(),
      userId,
      status: 'CREATED',
      provider,
      submittedAt: null,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now
    };

    this.kycSessionsById.set(session.id, session);
    const userSessionIds = this.kycSessionIdsByUserId.get(userId) || [];
    userSessionIds.push(session.id);
    this.kycSessionIdsByUserId.set(userId, userSessionIds);
    return session;
  }

  findLatestKycSessionByUserId(userId) {
    const ids = this.kycSessionIdsByUserId.get(userId) || [];
    if (ids.length === 0) {
      return null;
    }

    const latestId = ids[ids.length - 1];
    return this.kycSessionsById.get(latestId) || null;
  }

  findKycSessionById(sessionId) {
    return this.kycSessionsById.get(sessionId) || null;
  }

  updateKycSessionStatus({ sessionId, status, submittedAt, reviewedBy, reviewedAt }) {
    const session = this.kycSessionsById.get(sessionId);
    if (!session) {
      return null;
    }

    session.status = status;
    if (submittedAt) {
      session.submittedAt = submittedAt;
    }
    if (reviewedBy) {
      session.reviewedBy = reviewedBy;
    }
    if (reviewedAt) {
      session.reviewedAt = reviewedAt;
    }
    session.updatedAt = new Date().toISOString();
    return session;
  }

  createIdentityDocument({ kycSessionId, documentType, fileUrl, checksumSha256, metadataJson }) {
    const document = {
      id: randomUUID(),
      kycSessionId,
      documentType,
      fileUrl,
      checksumSha256,
      metadataJson,
      verifiedAt: null,
      createdAt: new Date().toISOString()
    };

    this.identityDocumentsById.set(document.id, document);
    const ids = this.identityDocumentIdsBySessionId.get(kycSessionId) || [];
    ids.push(document.id);
    this.identityDocumentIdsBySessionId.set(kycSessionId, ids);
    return document;
  }

  findIdentityDocumentBySessionAndChecksum({ kycSessionId, checksumSha256 }) {
    const ids = this.identityDocumentIdsBySessionId.get(kycSessionId) || [];
    for (const id of ids) {
      const document = this.identityDocumentsById.get(id);
      if (document && document.checksumSha256 === checksumSha256) {
        return document;
      }
    }
    return null;
  }

  createKycStatusEvent({ kycSessionId, fromStatus, toStatus, actorType, actorId, reason }) {
    const event = {
      id: randomUUID(),
      kycSessionId,
      fromStatus: fromStatus || null,
      toStatus,
      actorType,
      actorId: actorId || null,
      reason: reason || null,
      createdAt: new Date().toISOString()
    };

    this.kycStatusEventsById.set(event.id, event);
    const ids = this.kycStatusEventIdsBySessionId.get(kycSessionId) || [];
    ids.push(event.id);
    this.kycStatusEventIdsBySessionId.set(kycSessionId, ids);
    return event;
  }

  listKycStatusEventsBySessionId(kycSessionId) {
    const ids = this.kycStatusEventIdsBySessionId.get(kycSessionId) || [];
    return ids
      .map((id) => this.kycStatusEventsById.get(id))
      .filter(Boolean);
  }

  listKycSessionsByStatuses({ statuses, limit }) {
    const allowed = new Set((statuses || []).filter(Boolean));
    const sessions = Array.from(this.kycSessionsById.values())
      .filter((session) => (allowed.size === 0 ? true : allowed.has(session.status)))
      .sort((left, right) => {
        const leftTime = Date.parse(left.submittedAt || left.createdAt || 0);
        const rightTime = Date.parse(right.submittedAt || right.createdAt || 0);
        return rightTime - leftTime;
      });

    return sessions.slice(0, limit);
  }

  listIdentityDocumentsBySessionId(kycSessionId) {
    const ids = this.identityDocumentIdsBySessionId.get(kycSessionId) || [];
    return ids
      .map((id) => this.identityDocumentsById.get(id))
      .filter(Boolean)
      .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  }
}
