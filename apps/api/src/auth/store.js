import { randomUUID } from 'node:crypto';

export class InMemoryAuthStore {
  constructor() {
    this.usersById = new Map();
    this.userIdByEmail = new Map();
    this.sessionsById = new Map();
    this.sessionIdByTokenHash = new Map();
    this.emailVerificationsById = new Map();
    this.emailVerificationIdsByUserPurpose = new Map();
    this.kycSessionsById = new Map();
    this.kycSessionIdsByUserId = new Map();
    this.identityDocumentsById = new Map();
    this.identityDocumentIdsBySessionId = new Map();
    this.kycStatusEventsById = new Map();
    this.kycStatusEventIdsBySessionId = new Map();
    this.organizationsById = new Map();
    this.organizationIdsByOwnerUserId = new Map();
    this.organizationVerificationsByOrgId = new Map();
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
        'lpk',
        {
          id: '00000000-0000-0000-0000-000000000002',
          code: 'lpk',
          description: 'LPK dashboard role'
        }
      ],
      [
        'tsk',
        {
          id: '00000000-0000-0000-0000-000000000003',
          code: 'tsk',
          description: 'TSK dashboard role'
        }
      ],
      [
        'kaisha',
        {
          id: '00000000-0000-0000-0000-000000000004',
          code: 'kaisha',
          description: 'Kaisha dashboard role'
        }
      ],
      [
        'super_admin',
        {
          id: '00000000-0000-0000-0000-000000000005',
          code: 'super_admin',
          description: 'Super admin dashboard role'
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

    const now = new Date().toISOString();
    const user = {
      id: randomUUID(),
      fullName: fullName.trim(),
      email: normalizedEmail,
      passwordHash,
      emailVerifiedAt: null,
      avatarUrl: null,
      createdAt: now,
      updatedAt: now
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

  updateUserProfile({ userId, fullName, avatarUrl }) {
    const user = this.usersById.get(userId);
    if (!user) {
      return null;
    }

    if (fullName !== undefined) {
      user.fullName = fullName;
    }
    if (avatarUrl !== undefined) {
      user.avatarUrl = avatarUrl;
    }
    user.updatedAt = new Date().toISOString();
    return user;
  }

  updateUserPasswordHash({ userId, passwordHash }) {
    const user = this.usersById.get(userId);
    if (!user) {
      return null;
    }

    user.passwordHash = passwordHash;
    user.updatedAt = new Date().toISOString();
    return user;
  }

  markUserEmailVerified({ userId, verifiedAt }) {
    const user = this.usersById.get(userId);
    if (!user) {
      return null;
    }

    const verifiedAtMs = Number(verifiedAt);
    const normalizedVerifiedAt = Number.isFinite(verifiedAtMs)
      ? new Date(verifiedAtMs).toISOString()
      : String(verifiedAt || '').trim() || new Date().toISOString();
    user.emailVerifiedAt = normalizedVerifiedAt;
    user.updatedAt = new Date().toISOString();
    return user;
  }

  createEmailVerification({
    userId,
    email,
    purpose,
    codeHash,
    expiresAt,
    resendAvailableAt,
    maxAttempts
  }) {
    const now = new Date().toISOString();
    const verification = {
      id: randomUUID(),
      userId,
      email: String(email || '').trim().toLowerCase(),
      purpose: String(purpose || '').trim().toUpperCase(),
      status: 'ACTIVE',
      codeHash,
      attemptCount: 0,
      maxAttempts,
      expiresAt,
      resendAvailableAt,
      verifiedAt: null,
      createdAt: now,
      updatedAt: now
    };

    this.emailVerificationsById.set(verification.id, verification);
    const key = `${verification.userId}:${verification.purpose}`;
    const ids = this.emailVerificationIdsByUserPurpose.get(key) || [];
    ids.push(verification.id);
    this.emailVerificationIdsByUserPurpose.set(key, ids);
    return verification;
  }

  findLatestEmailVerificationByUserAndPurpose({ userId, purpose }) {
    const key = `${String(userId || '').trim()}:${String(purpose || '').trim().toUpperCase()}`;
    const ids = this.emailVerificationIdsByUserPurpose.get(key) || [];
    if (ids.length === 0) {
      return null;
    }

    const latestId = ids[ids.length - 1];
    return this.emailVerificationsById.get(latestId) || null;
  }

  countEmailVerificationsSince({ userId, purpose, sinceAt }) {
    const key = `${String(userId || '').trim()}:${String(purpose || '').trim().toUpperCase()}`;
    const ids = this.emailVerificationIdsByUserPurpose.get(key) || [];
    return ids.reduce((count, id) => {
      const verification = this.emailVerificationsById.get(id);
      if (!verification) {
        return count;
      }
      return Date.parse(verification.createdAt) >= sinceAt ? count + 1 : count;
    }, 0);
  }

  markEmailVerificationExpired({ verificationId }) {
    const verification = this.emailVerificationsById.get(verificationId);
    if (!verification) {
      return null;
    }

    verification.status = 'EXPIRED';
    verification.updatedAt = new Date().toISOString();
    return verification;
  }

  incrementEmailVerificationAttempt({ verificationId }) {
    const verification = this.emailVerificationsById.get(verificationId);
    if (!verification) {
      return null;
    }

    verification.attemptCount += 1;
    if (verification.attemptCount >= verification.maxAttempts) {
      verification.status = 'LOCKED';
    }
    verification.updatedAt = new Date().toISOString();
    return verification;
  }

  markEmailVerificationVerified({ verificationId, verifiedAt }) {
    const verification = this.emailVerificationsById.get(verificationId);
    if (!verification) {
      return null;
    }

    const verifiedAtMs = Number(verifiedAt);
    const normalizedVerifiedAt = Number.isFinite(verifiedAtMs)
      ? new Date(verifiedAtMs).toISOString()
      : String(verifiedAt || '').trim() || new Date().toISOString();
    verification.status = 'VERIFIED';
    verification.verifiedAt = normalizedVerifiedAt;
    verification.updatedAt = new Date().toISOString();
    return verification;
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

  listRoles() {
    return Array.from(this.rolesByCode.keys()).sort();
  }

  replaceUserRoles({ userId, roleCodes }) {
    if (!this.usersById.has(userId)) {
      return false;
    }

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
    if (normalizedRoleCodes.some((roleCode) => !this.rolesByCode.has(roleCode))) {
      return false;
    }

    this.userRoleCodesByUserId.set(userId, new Set(normalizedRoleCodes));
    return true;
  }

  listUsers({ q, cursor = 0, limit = 25 } = {}) {
    const normalizedQuery = String(q || '')
      .trim()
      .toLowerCase();
    const normalizedCursor = Number.isFinite(Number(cursor)) ? Math.max(0, Math.floor(Number(cursor))) : 0;
    const normalizedLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.floor(Number(limit))) : 25;

    const users = Array.from(this.usersById.values())
      .filter((user) => {
        if (!normalizedQuery) {
          return true;
        }
        return (
          String(user.fullName || '')
            .toLowerCase()
            .includes(normalizedQuery) ||
          String(user.email || '')
            .toLowerCase()
            .includes(normalizedQuery)
        );
      })
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));

    return {
      items: users.slice(normalizedCursor, normalizedCursor + normalizedLimit),
      total: users.length
    };
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
      providerRef: null,
      providerMetadataJson: {},
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

  updateKycSessionProviderData({ sessionId, providerRef, providerMetadataJson }) {
    const session = this.kycSessionsById.get(sessionId);
    if (!session) {
      return null;
    }

    if (providerRef !== undefined) {
      session.providerRef = providerRef;
    }

    if (providerMetadataJson && typeof providerMetadataJson === 'object' && !Array.isArray(providerMetadataJson)) {
      session.providerMetadataJson = {
        ...(session.providerMetadataJson || {}),
        ...providerMetadataJson
      };
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

  findIdentityDocumentById(documentId) {
    const normalizedDocumentId = String(documentId || '').trim();
    if (!normalizedDocumentId) {
      return null;
    }
    return this.identityDocumentsById.get(normalizedDocumentId) || null;
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

  listKycStatusEvents({ cursor = 0, limit = 25, actorId, from, to, toStatus } = {}) {
    const normalizedCursor = Number.isFinite(Number(cursor)) ? Math.max(0, Math.floor(Number(cursor))) : 0;
    const normalizedLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.floor(Number(limit))) : 25;
    const normalizedActorId = String(actorId || '').trim();
    const fromTime = from ? Date.parse(String(from)) : NaN;
    const toTime = to ? Date.parse(String(to)) : NaN;
    const normalizedToStatus = String(toStatus || '')
      .trim()
      .toUpperCase();

    const events = Array.from(this.kycStatusEventsById.values())
      .filter((event) => {
        if (normalizedActorId && String(event.actorId || '').trim() !== normalizedActorId) {
          return false;
        }
        const createdAtTime = Date.parse(event.createdAt);
        if (Number.isFinite(fromTime) && createdAtTime < fromTime) {
          return false;
        }
        if (Number.isFinite(toTime) && createdAtTime > toTime) {
          return false;
        }
        if (normalizedToStatus && event.toStatus !== normalizedToStatus) {
          return false;
        }
        return true;
      })
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));

    return {
      items: events.slice(normalizedCursor, normalizedCursor + normalizedLimit),
      total: events.length
    };
  }

  listKycSessionsByStatuses({ statuses, cursor = 0, limit }) {
    const allowed = new Set((statuses || []).filter(Boolean));
    const sessions = Array.from(this.kycSessionsById.values())
      .filter((session) => (allowed.size === 0 ? true : allowed.has(session.status)))
      .sort((left, right) => {
        const leftTime = Date.parse(left.submittedAt || left.createdAt || 0);
        const rightTime = Date.parse(right.submittedAt || right.createdAt || 0);
        return rightTime - leftTime;
      });

    const normalizedCursor = Number.isFinite(Number(cursor)) ? Math.max(0, Math.floor(Number(cursor))) : 0;
    const normalizedLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.floor(Number(limit))) : 25;

    return {
      items: sessions.slice(normalizedCursor, normalizedCursor + normalizedLimit),
      total: sessions.length
    };
  }

  listIdentityDocumentsBySessionId(kycSessionId) {
    const ids = this.identityDocumentIdsBySessionId.get(kycSessionId) || [];
    return ids
      .map((id) => this.identityDocumentsById.get(id))
      .filter(Boolean)
      .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  }

  createOrganization({ ownerUserId, name, orgType, countryCode }) {
    const now = new Date().toISOString();
    const organization = {
      id: randomUUID(),
      ownerUserId,
      name,
      orgType,
      countryCode,
      createdAt: now,
      updatedAt: now
    };

    this.organizationsById.set(organization.id, organization);
    const ids = this.organizationIdsByOwnerUserId.get(ownerUserId) || [];
    ids.push(organization.id);
    this.organizationIdsByOwnerUserId.set(ownerUserId, ids);
    return organization;
  }

  findOrganizationById(orgId) {
    return this.organizationsById.get(orgId) || null;
  }

  listOrganizations() {
    return Array.from(this.organizationsById.values()).sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
    );
  }

  createOrUpdateOrganizationVerification({
    orgId,
    status,
    reasonCodesJson,
    registrationNumber,
    legalName,
    supportingObjectKeysJson,
    lastCheckedAt
  }) {
    const now = new Date().toISOString();
    const existing = this.organizationVerificationsByOrgId.get(orgId);
    if (existing) {
      existing.status = status;
      existing.reasonCodesJson = Array.isArray(reasonCodesJson) ? reasonCodesJson : [];
      existing.registrationNumber = registrationNumber;
      existing.legalName = legalName;
      existing.supportingObjectKeysJson = Array.isArray(supportingObjectKeysJson)
        ? supportingObjectKeysJson
        : [];
      existing.lastCheckedAt = lastCheckedAt || now;
      existing.updatedAt = now;
      return existing;
    }

    const verification = {
      id: randomUUID(),
      orgId,
      status,
      reasonCodesJson: Array.isArray(reasonCodesJson) ? reasonCodesJson : [],
      registrationNumber,
      legalName,
      supportingObjectKeysJson: Array.isArray(supportingObjectKeysJson) ? supportingObjectKeysJson : [],
      lastCheckedAt: lastCheckedAt || now,
      createdAt: now,
      updatedAt: now
    };

    this.organizationVerificationsByOrgId.set(orgId, verification);
    return verification;
  }

  findOrganizationVerificationByOrgId(orgId) {
    return this.organizationVerificationsByOrgId.get(orgId) || null;
  }
}
