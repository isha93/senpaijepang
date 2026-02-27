import { createInMemoryObjectStorage } from './object-storage.js';

const NOOP_LOGGER = {
  info() {},
  warn() {},
  error() {},
  debug() {}
};

class KycApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const KYC_REVIEW_STATUSES = new Set(['MANUAL_REVIEW', 'VERIFIED', 'REJECTED']);
const KYC_RAW_STATUSES = new Set(['CREATED', 'SUBMITTED', 'MANUAL_REVIEW', 'VERIFIED', 'REJECTED']);

function mapTrustStatus(rawStatus) {
  switch (rawStatus) {
    case 'MANUAL_REVIEW':
      return 'MANUAL_REVIEW';
    case 'VERIFIED':
      return 'VERIFIED';
    case 'REJECTED':
      return 'REJECTED';
    case 'CREATED':
    case 'SUBMITTED':
    default:
      return 'IN_PROGRESS';
  }
}

function normalizeProvider(provider) {
  const normalizedProvider = String(provider || 'manual').trim().toLowerCase() || 'manual';
  if (normalizedProvider.length > 64) {
    throw new KycApiError(400, 'invalid_provider', 'provider must be <= 64 characters');
  }
  return normalizedProvider;
}

function normalizeDocumentType(documentType) {
  const normalized = String(documentType || '')
    .trim()
    .toUpperCase();
  if (!normalized) {
    throw new KycApiError(400, 'invalid_document_type', 'documentType is required');
  }
  if (normalized.length > 64) {
    throw new KycApiError(400, 'invalid_document_type', 'documentType must be <= 64 characters');
  }
  return normalized;
}

function normalizeFileName(fileName) {
  const normalized = String(fileName || '').trim();
  if (!normalized) {
    throw new KycApiError(400, 'invalid_file_name', 'fileName is required');
  }
  if (normalized.length > 180) {
    throw new KycApiError(400, 'invalid_file_name', 'fileName must be <= 180 characters');
  }
  return normalized;
}

function normalizeObjectKey(objectKey) {
  const normalized = String(objectKey || '').trim();
  if (!normalized) {
    throw new KycApiError(400, 'invalid_object_key', 'objectKey is required');
  }
  if (normalized.length > 1024) {
    throw new KycApiError(400, 'invalid_object_key', 'objectKey must be <= 1024 characters');
  }
  if (normalized.startsWith('/') || normalized.includes('..')) {
    throw new KycApiError(400, 'invalid_object_key', 'objectKey is invalid');
  }
  if (!/^[a-zA-Z0-9/_\-.]+$/.test(normalized)) {
    throw new KycApiError(400, 'invalid_object_key', 'objectKey contains unsupported characters');
  }
  return normalized;
}

function normalizeContentType(contentType, allowedContentTypes) {
  const normalized = String(contentType || '')
    .trim()
    .toLowerCase();
  if (!normalized) {
    throw new KycApiError(400, 'invalid_content_type', 'contentType is required');
  }
  if (!allowedContentTypes.has(normalized)) {
    throw new KycApiError(
      400,
      'invalid_content_type',
      `contentType must be one of: ${Array.from(allowedContentTypes).join(', ')}`
    );
  }
  return normalized;
}

function normalizeContentLength(contentLength, maxUploadBytes) {
  const normalized = Number(contentLength);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new KycApiError(400, 'invalid_content_length', 'contentLength must be a positive number');
  }
  if (normalized > maxUploadBytes) {
    throw new KycApiError(
      400,
      'invalid_content_length',
      `contentLength must be <= ${maxUploadBytes} bytes`
    );
  }
  return Math.floor(normalized);
}

function normalizeAllowedContentTypes(rawAllowedTypes) {
  const fallback = ['image/jpeg', 'image/png', 'application/pdf'];
  const source = String(rawAllowedTypes || fallback.join(','));
  const values = source
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return new Set(values.length > 0 ? values : fallback);
}

function normalizeFileUrl(fileUrl) {
  const normalized = String(fileUrl || '').trim();
  if (!normalized) {
    throw new KycApiError(400, 'invalid_file_url', 'fileUrl is required');
  }

  if (normalized.startsWith('s3://')) {
    return normalized;
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return normalized;
    }
  } catch {}

  throw new KycApiError(400, 'invalid_file_url', 'fileUrl must be http(s):// or s3://');
}

function normalizeChecksumSha256(checksumSha256) {
  const normalized = String(checksumSha256 || '')
    .trim()
    .toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new KycApiError(400, 'invalid_checksum_sha256', 'checksumSha256 must be 64 hex characters');
  }
  return normalized;
}

function normalizeMetadata(metadata) {
  if (metadata === null || metadata === undefined) {
    return {};
  }
  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new KycApiError(400, 'invalid_metadata', 'metadata must be a JSON object');
  }
  return metadata;
}

function normalizeDecision(decision) {
  const normalized = String(decision || '')
    .trim()
    .toUpperCase();
  if (!KYC_REVIEW_STATUSES.has(normalized)) {
    throw new KycApiError(
      400,
      'invalid_decision',
      'decision must be one of MANUAL_REVIEW, VERIFIED, REJECTED'
    );
  }
  return normalized;
}

function normalizeReviewQueueStatus(status) {
  const normalized = String(status || '')
    .trim()
    .toUpperCase();
  if (!normalized || normalized === 'DEFAULT') {
    return ['SUBMITTED', 'MANUAL_REVIEW'];
  }
  if (normalized === 'ALL') {
    return [];
  }
  if (!KYC_RAW_STATUSES.has(normalized)) {
    throw new KycApiError(
      400,
      'invalid_status_filter',
      'status filter must be one of ALL, SUBMITTED, MANUAL_REVIEW, VERIFIED, REJECTED, CREATED'
    );
  }
  return [normalized];
}

function normalizeQueueLimit(limit) {
  const fallback = 25;
  if (limit === undefined || limit === null || String(limit).trim() === '') {
    return fallback;
  }
  const normalized = Number(limit);
  if (!Number.isFinite(normalized) || normalized < 1 || normalized > 100) {
    throw new KycApiError(400, 'invalid_limit', 'limit must be between 1 and 100');
  }
  return Math.floor(normalized);
}

function normalizeReviewedBy(reviewedBy) {
  const normalized = String(reviewedBy || '')
    .trim();
  if (!normalized) {
    throw new KycApiError(400, 'invalid_reviewed_by', 'reviewedBy is required');
  }
  if (normalized.length > 128) {
    throw new KycApiError(400, 'invalid_reviewed_by', 'reviewedBy must be <= 128 characters');
  }
  return normalized;
}

export class KycService {
  constructor({ store, objectStorage, maxUploadBytes, allowedContentTypes, logger }) {
    this.store = store;
    this.objectStorage = objectStorage;
    this.maxUploadBytes = maxUploadBytes;
    this.allowedContentTypes = allowedContentTypes;
    this.logger = logger || NOOP_LOGGER;
  }

  async startSession({ userId, provider }) {
    const normalizedProvider = normalizeProvider(provider);

    const session = await this.store.createKycSession({
      userId,
      provider: normalizedProvider
    });
    const event = await this.store.createKycStatusEvent({
      kycSessionId: session.id,
      fromStatus: null,
      toStatus: session.status,
      actorType: 'USER',
      actorId: userId,
      reason: 'session_created'
    });
    this.logKycStatusTransition(event);

    return {
      status: mapTrustStatus(session.status),
      session: this.publicSession(session)
    };
  }

  async getStatus({ userId }) {
    const session = await this.store.findLatestKycSessionByUserId(userId);
    if (!session) {
      return {
        status: 'NOT_STARTED',
        session: null
      };
    }

    return {
      status: mapTrustStatus(session.status),
      session: this.publicSession(session)
    };
  }

  async createUploadUrl({
    userId,
    sessionId,
    documentType,
    fileName,
    contentType,
    contentLength,
    checksumSha256
  }) {
    const targetSession = await this.resolveUserSession({ userId, sessionId });
    if (!targetSession) {
      throw new KycApiError(404, 'kyc_session_not_found', 'kyc session not found');
    }
    this.assertSessionWritable(targetSession);

    const normalizedDocumentType = normalizeDocumentType(documentType);
    const normalizedFileName = normalizeFileName(fileName);
    const normalizedContentType = normalizeContentType(contentType, this.allowedContentTypes);
    const normalizedContentLength = normalizeContentLength(contentLength, this.maxUploadBytes);
    const normalizedChecksumSha256 = normalizeChecksumSha256(checksumSha256);

    const objectKey = this.objectStorage.buildObjectKey({
      userId,
      sessionId: targetSession.id,
      documentType: normalizedDocumentType,
      fileName: normalizedFileName
    });

    const upload = await this.objectStorage.createUploadUrl({
      objectKey,
      contentType: normalizedContentType,
      contentLength: normalizedContentLength,
      checksumSha256: normalizedChecksumSha256
    });

    return {
      status: mapTrustStatus(targetSession.status),
      session: this.publicSession(targetSession),
      upload: {
        objectKey,
        uploadUrl: upload.uploadUrl,
        method: upload.method,
        headers: upload.headers,
        expiresAt: upload.expiresAt
      }
    };
  }

  async uploadDocument({ userId, sessionId, documentType, objectKey, checksumSha256, metadata }) {
    const targetSession = await this.resolveUserSession({ userId, sessionId });
    if (!targetSession) {
      throw new KycApiError(404, 'kyc_session_not_found', 'kyc session not found');
    }
    this.assertSessionWritable(targetSession);

    const normalizedDocumentType = normalizeDocumentType(documentType);
    const normalizedObjectKey = normalizeObjectKey(objectKey);
    const normalizedChecksumSha256 = normalizeChecksumSha256(checksumSha256);
    const normalizedMetadata = normalizeMetadata(metadata);

    this.assertObjectKeyOwnership({
      userId,
      sessionId: targetSession.id,
      objectKey: normalizedObjectKey
    });

    const duplicateDocument = await this.store.findIdentityDocumentBySessionAndChecksum({
      kycSessionId: targetSession.id,
      checksumSha256: normalizedChecksumSha256
    });
    if (duplicateDocument) {
      throw new KycApiError(409, 'duplicate_document', 'document with same checksum already exists');
    }

    let document;
    try {
      document = await this.store.createIdentityDocument({
        kycSessionId: targetSession.id,
        documentType: normalizedDocumentType,
        fileUrl: normalizeFileUrl(this.objectStorage.toFileUrl(normalizedObjectKey)),
        checksumSha256: normalizedChecksumSha256,
        metadataJson: {
          ...normalizedMetadata,
          objectKey: normalizedObjectKey
        }
      });
    } catch (error) {
      if (String(error?.code || '') === '23505') {
        throw new KycApiError(409, 'duplicate_document', 'document with same checksum already exists');
      }
      throw error;
    }

    let updatedSession = targetSession;
    const previousStatus = targetSession.status;
    if (previousStatus === 'CREATED') {
      updatedSession = await this.store.updateKycSessionStatus({
        sessionId: targetSession.id,
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString()
      });

      const event = await this.store.createKycStatusEvent({
        kycSessionId: targetSession.id,
        fromStatus: previousStatus,
        toStatus: updatedSession.status,
        actorType: 'USER',
        actorId: userId,
        reason: 'document_uploaded'
      });
      this.logKycStatusTransition(event);
    }

    return {
      status: mapTrustStatus(updatedSession.status),
      session: this.publicSession(updatedSession),
      document: this.publicDocument(document)
    };
  }

  assertSessionWritable(session) {
    if (session.status === 'VERIFIED' || session.status === 'REJECTED') {
      throw new KycApiError(
        409,
        'kyc_session_locked',
        'cannot upload documents for verified or rejected session'
      );
    }
  }

  assertObjectKeyOwnership({ userId, sessionId, objectKey }) {
    const prefix = `kyc/${userId}/${sessionId}/`;
    if (!objectKey.startsWith(prefix)) {
      throw new KycApiError(
        400,
        'invalid_object_key',
        `objectKey must start with '${prefix}' for this session`
      );
    }
  }

  async reviewSession({ sessionId, decision, reviewedBy, reason }) {
    const normalizedSessionId = String(sessionId || '').trim();
    if (!normalizedSessionId) {
      throw new KycApiError(400, 'invalid_session_id', 'sessionId is required');
    }

    const session = await this.store.findKycSessionById(normalizedSessionId);
    if (!session) {
      throw new KycApiError(404, 'kyc_session_not_found', 'kyc session not found');
    }

    const normalizedDecision = normalizeDecision(decision);
    const normalizedReviewedBy = normalizeReviewedBy(reviewedBy);

    const previousStatus = session.status;
    const updatedSession = await this.store.updateKycSessionStatus({
      sessionId: normalizedSessionId,
      status: normalizedDecision,
      reviewedBy: normalizedReviewedBy,
      reviewedAt: new Date().toISOString()
    });

    if (previousStatus !== normalizedDecision) {
      const event = await this.store.createKycStatusEvent({
        kycSessionId: session.id,
        fromStatus: previousStatus,
        toStatus: normalizedDecision,
        actorType: 'ADMIN',
        actorId: normalizedReviewedBy,
        reason: String(reason || '').trim() || null
      });
      this.logKycStatusTransition(event);
    }

    return {
      status: mapTrustStatus(updatedSession.status),
      session: this.publicSession(updatedSession)
    };
  }

  async getHistory({ userId, sessionId }) {
    const targetSession = await this.resolveUserSession({ userId, sessionId });
    if (!targetSession) {
      if (sessionId) {
        throw new KycApiError(404, 'kyc_session_not_found', 'kyc session not found');
      }
      return { session: null, events: [] };
    }

    const events = await this.store.listKycStatusEventsBySessionId(targetSession.id);
    return {
      session: this.publicSession(targetSession),
      events: events.map((event) => this.publicEvent(event))
    };
  }

  async listReviewQueue({ status, limit }) {
    const statuses = normalizeReviewQueueStatus(status);
    const queueLimit = normalizeQueueLimit(limit);
    const sessions = await this.store.listKycSessionsByStatuses({
      statuses,
      limit: queueLimit
    });

    const items = await Promise.all(
      sessions.map(async (session) => {
        const [user, documents, events] = await Promise.all([
          this.store.findUserById(session.userId),
          this.store.listIdentityDocumentsBySessionId(session.id),
          this.store.listKycStatusEventsBySessionId(session.id)
        ]);

        const lastEvent = events.length > 0 ? events[events.length - 1] : null;
        return {
          session: this.publicSession(session),
          trustStatus: mapTrustStatus(session.status),
          user: user
            ? {
                id: user.id,
                fullName: user.fullName,
                email: user.email
              }
            : null,
          documents: documents.map((document) => this.publicDocument(document)),
          documentCount: documents.length,
          events: events.map((event) => this.publicEvent(event)),
          lastEvent: lastEvent ? this.publicEvent(lastEvent) : null,
          riskFlags: this.buildRiskFlags({ session, documents })
        };
      })
    );

    return {
      count: items.length,
      filters: {
        status: statuses
      },
      items
    };
  }

  buildRiskFlags({ session, documents }) {
    const flags = [];
    if (documents.length === 0) {
      flags.push('NO_DOCUMENTS');
    }
    if (documents.length > 5) {
      flags.push('HIGH_DOCUMENT_COUNT');
    }
    const duplicateObjectKeys = new Set();
    for (const document of documents) {
      const objectKey = document?.metadataJson?.objectKey;
      if (!objectKey) {
        flags.push('MISSING_OBJECT_KEY');
        continue;
      }
      if (duplicateObjectKeys.has(objectKey)) {
        flags.push('DUPLICATE_OBJECT_KEY');
      }
      duplicateObjectKeys.add(objectKey);
    }
    if (session.status === 'CREATED' && documents.length > 0) {
      flags.push('INCONSISTENT_SESSION_STATUS');
    }
    return Array.from(new Set(flags));
  }

  logKycStatusTransition(event) {
    this.logger.info('audit.kyc.status_transition', {
      kycSessionId: event.kycSessionId,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      actorType: event.actorType,
      actorId: event.actorId,
      reason: event.reason,
      createdAt: event.createdAt
    });
  }

  async resolveUserSession({ userId, sessionId }) {
    const normalizedSessionId = String(sessionId || '').trim();
    if (normalizedSessionId) {
      const session = await this.store.findKycSessionById(normalizedSessionId);
      if (!session || session.userId !== userId) {
        return null;
      }
      return session;
    }
    return this.store.findLatestKycSessionByUserId(userId);
  }

  publicSession(session) {
    return {
      id: session.id,
      status: session.status,
      provider: session.provider,
      submittedAt: session.submittedAt,
      reviewedBy: session.reviewedBy,
      reviewedAt: session.reviewedAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };
  }

  publicDocument(document) {
    const metadata = document.metadataJson || {};
    return {
      id: document.id,
      kycSessionId: document.kycSessionId,
      documentType: document.documentType,
      objectKey: metadata.objectKey || null,
      fileUrl: document.fileUrl,
      checksumSha256: document.checksumSha256,
      metadata,
      verifiedAt: document.verifiedAt,
      createdAt: document.createdAt
    };
  }

  publicEvent(event) {
    return {
      id: event.id,
      kycSessionId: event.kycSessionId,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      actorType: event.actorType,
      actorId: event.actorId,
      reason: event.reason,
      createdAt: event.createdAt
    };
  }
}

export function createKycService({ store, objectStorage, env = process.env, logger } = {}) {
  if (
    !store ||
    typeof store.findUserById !== 'function' ||
    typeof store.createKycSession !== 'function' ||
    typeof store.findLatestKycSessionByUserId !== 'function' ||
    typeof store.findKycSessionById !== 'function' ||
    typeof store.updateKycSessionStatus !== 'function' ||
    typeof store.listKycSessionsByStatuses !== 'function' ||
    typeof store.createIdentityDocument !== 'function' ||
    typeof store.findIdentityDocumentBySessionAndChecksum !== 'function' ||
    typeof store.listIdentityDocumentsBySessionId !== 'function' ||
    typeof store.createKycStatusEvent !== 'function' ||
    typeof store.listKycStatusEventsBySessionId !== 'function'
  ) {
    throw new Error('KYC store is missing required methods');
  }
  const resolvedObjectStorage = objectStorage || createInMemoryObjectStorage({ env });
  if (
    typeof resolvedObjectStorage.buildObjectKey !== 'function' ||
    typeof resolvedObjectStorage.createUploadUrl !== 'function' ||
    typeof resolvedObjectStorage.toFileUrl !== 'function'
  ) {
    throw new Error('KYC object storage is missing required methods');
  }

  const maxUploadBytesRaw = Number(env.OBJECT_STORAGE_MAX_FILE_BYTES || 10 * 1024 * 1024);
  const maxUploadBytes =
    Number.isFinite(maxUploadBytesRaw) && maxUploadBytesRaw > 0
      ? Math.floor(maxUploadBytesRaw)
      : 10 * 1024 * 1024;

  return new KycService({
    store,
    objectStorage: resolvedObjectStorage,
    maxUploadBytes,
    allowedContentTypes: normalizeAllowedContentTypes(env.OBJECT_STORAGE_ALLOWED_CONTENT_TYPES),
    logger
  });
}

export function isKycApiError(error) {
  return error instanceof KycApiError;
}
