import { randomUUID } from 'node:crypto';

class ProfileApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const REQUIRED_DOCUMENT_TYPES = ['PASSPORT', 'SELFIE'];
const FINAL_REQUEST_STATUS = 'REQUESTED';
const FINAL_REQUEST_SOURCE_FALLBACK = 'UNKNOWN';
const MAX_FULL_NAME_LENGTH = 120;
const MAX_AVATAR_URL_LENGTH = 500;

function normalizeUserId(userId) {
  const normalized = String(userId || '').trim();
  if (!normalized) {
    throw new ProfileApiError(400, 'invalid_user_id', 'userId is required');
  }
  return normalized;
}

function mapVerificationStatus(rawStatus) {
  const normalized = String(rawStatus || '').trim().toUpperCase();
  if (!normalized) {
    return 'NOT_STARTED';
  }
  if (normalized === 'MANUAL_REVIEW') {
    return 'MANUAL_REVIEW';
  }
  if (normalized === 'VERIFIED') {
    return 'VERIFIED';
  }
  if (normalized === 'REJECTED') {
    return 'REJECTED';
  }
  return 'IN_PROGRESS';
}

function mapTrustScoreLabel(verificationStatus) {
  if (verificationStatus === 'VERIFIED') {
    return 'TRUSTED';
  }
  if (verificationStatus === 'MANUAL_REVIEW') {
    return 'UNDER_REVIEW';
  }
  if (verificationStatus === 'REJECTED') {
    return 'ACTION_REQUIRED';
  }
  if (verificationStatus === 'IN_PROGRESS') {
    return 'BUILDING_TRUST';
  }
  return 'UNVERIFIED';
}

function normalizeDocumentType(documentType) {
  return String(documentType || '')
    .trim()
    .toUpperCase();
}

function normalizeFinalRequestSource(source) {
  if (source === undefined || source === null || String(source).trim() === '') {
    return FINAL_REQUEST_SOURCE_FALLBACK;
  }
  const normalized = String(source).trim();
  if (normalized.length > 64) {
    throw new ProfileApiError(400, 'invalid_source', 'source must be <= 64 characters');
  }
  return normalized;
}

function normalizeFinalRequestNote(note) {
  if (note === undefined || note === null) {
    return null;
  }
  const normalized = String(note).trim();
  if (!normalized) {
    return null;
  }
  if (normalized.length > 500) {
    throw new ProfileApiError(400, 'invalid_note', 'note must be <= 500 characters');
  }
  return normalized;
}

function normalizeProfileFullName(fullName) {
  if (fullName === undefined) {
    return undefined;
  }
  const normalized = String(fullName || '').trim();
  if (normalized.length < 2) {
    throw new ProfileApiError(400, 'invalid_full_name', 'fullName must be at least 2 characters');
  }
  if (normalized.length > MAX_FULL_NAME_LENGTH) {
    throw new ProfileApiError(
      400,
      'invalid_full_name',
      `fullName must be <= ${MAX_FULL_NAME_LENGTH} characters`
    );
  }
  return normalized;
}

function normalizeAvatarUrl(avatarUrl) {
  if (avatarUrl === undefined) {
    return undefined;
  }

  if (avatarUrl === null) {
    return null;
  }

  const normalized = String(avatarUrl || '').trim();
  if (!normalized) {
    return null;
  }
  if (normalized.length > MAX_AVATAR_URL_LENGTH) {
    throw new ProfileApiError(
      400,
      'invalid_avatar_url',
      `avatarUrl must be <= ${MAX_AVATAR_URL_LENGTH} characters`
    );
  }

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new ProfileApiError(400, 'invalid_avatar_url', 'avatarUrl must be a valid http(s) URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ProfileApiError(400, 'invalid_avatar_url', 'avatarUrl must use http or https');
  }

  return normalized;
}

function toSessionSummary(session) {
  if (!session) {
    return null;
  }
  return {
    id: session.id,
    status: session.status,
    trustStatus: mapVerificationStatus(session.status),
    submittedAt: session.submittedAt || null,
    reviewedAt: session.reviewedAt || null,
    updatedAt: session.updatedAt
  };
}

function normalizeDocumentsCount(documentsCount) {
  const normalized = Number(documentsCount);
  if (!Number.isFinite(normalized) || normalized < 0) {
    return null;
  }
  return Math.floor(normalized);
}

function toFinalRequest(metadata, fallbackSessionId) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const candidate = metadata.finalVerification;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return null;
  }

  const id = String(candidate.id || '').trim();
  const requestedAt = String(candidate.requestedAt || '').trim();
  if (!id || !requestedAt) {
    return null;
  }

  return {
    id,
    sessionId: String(candidate.sessionId || fallbackSessionId || '').trim() || null,
    status: String(candidate.status || FINAL_REQUEST_STATUS).trim() || FINAL_REQUEST_STATUS,
    source: String(candidate.source || FINAL_REQUEST_SOURCE_FALLBACK).trim() || FINAL_REQUEST_SOURCE_FALLBACK,
    note: candidate.note === null ? null : String(candidate.note || '').trim() || null,
    documentsCount: normalizeDocumentsCount(candidate.documentsCount)
  };
}

function toDocumentStatus({ sessionStatus, document }) {
  if (!document) {
    return 'MISSING';
  }
  if (document.verifiedAt || sessionStatus === 'VERIFIED') {
    return 'VERIFIED';
  }
  if (sessionStatus === 'REJECTED') {
    return 'REJECTED';
  }
  return 'PENDING';
}

function toChecklistItem({ documentType, required, sessionStatus, document }) {
  const metadata = document?.metadataJson || {};
  return {
    documentType,
    status: toDocumentStatus({ sessionStatus, document }),
    required,
    documentId: document?.id || null,
    objectKey: metadata.objectKey || null,
    uploadedAt: document?.createdAt || null,
    reviewedAt: document?.verifiedAt || null
  };
}

function toSummary(documents) {
  const requiredItems = documents.filter((item) => item.required);
  const requiredTotal = requiredItems.length;
  const uploadedRequired = requiredItems.filter((item) => item.status !== 'MISSING').length;
  const verifiedRequired = requiredItems.filter((item) => item.status === 'VERIFIED').length;
  const missingRequired = requiredItems.filter((item) => item.status === 'MISSING').length;

  return {
    requiredTotal,
    uploadedRequired,
    verifiedRequired,
    missingRequired,
    allRequiredUploaded: requiredTotal > 0 && missingRequired === 0
  };
}

function calculateCompletion({ user, session, documents, requiredUploadedCount }) {
  let score = 0;
  if (String(user?.fullName || '').trim()) score += 25;
  if (String(user?.email || '').trim()) score += 15;
  if (session) score += 20;
  if (documents.length > 0) score += 20;
  if (requiredUploadedCount >= REQUIRED_DOCUMENT_TYPES.length) score += 10;
  if (session && session.status !== 'CREATED') score += 10;
  return Math.min(score, 100);
}

export class ProfileService {
  constructor({ store } = {}) {
    this.store = store;
  }

  async getProfile({ userId }) {
    const normalizedUserId = normalizeUserId(userId);
    const user = await this.store.findUserById(normalizedUserId);
    if (!user) {
      throw new ProfileApiError(404, 'user_not_found', 'user not found');
    }

    const session = await this.store.findLatestKycSessionByUserId(normalizedUserId);
    const documents = session ? await this.store.listIdentityDocumentsBySessionId(session.id) : [];
    const finalRequest = toFinalRequest(session?.providerMetadataJson || {}, session?.id || null);
    const uploadedTypes = new Set(documents.map((document) => normalizeDocumentType(document.documentType)));
    const requiredUploadedCount = REQUIRED_DOCUMENT_TYPES.filter((documentType) =>
      uploadedTypes.has(documentType)
    ).length;
    const verificationStatus = mapVerificationStatus(session?.status || null);

    return {
      profile: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        avatarUrl: user.avatarUrl || null,
        profileCompletionPercent: calculateCompletion({
          user,
          session,
          documents,
          requiredUploadedCount
        }),
        trustScoreLabel: mapTrustScoreLabel(verificationStatus),
        verificationStatus,
        verification: {
          sessionId: session?.id || null,
          sessionStatus: session?.status || null,
          trustStatus: verificationStatus,
          documentsUploaded: documents.length,
          requiredDocuments: REQUIRED_DOCUMENT_TYPES.length,
          requiredDocumentsUploaded: requiredUploadedCount,
          finalRequest
        }
      }
    };
  }

  async updateProfile({ userId, fullName, avatarUrl }) {
    const normalizedUserId = normalizeUserId(userId);
    const normalizedFullName = normalizeProfileFullName(fullName);
    const normalizedAvatarUrl = normalizeAvatarUrl(avatarUrl);
    const shouldUpdateName = normalizedFullName !== undefined;
    const shouldUpdateAvatar = normalizedAvatarUrl !== undefined;

    if (!shouldUpdateName && !shouldUpdateAvatar) {
      throw new ProfileApiError(
        400,
        'invalid_profile_update',
        'at least one profile field is required (fullName, avatarUrl)'
      );
    }

    const updatedUser = await this.store.updateUserProfile({
      userId: normalizedUserId,
      fullName: shouldUpdateName ? normalizedFullName : undefined,
      avatarUrl: shouldUpdateAvatar ? normalizedAvatarUrl : undefined
    });

    if (!updatedUser) {
      throw new ProfileApiError(404, 'user_not_found', 'user not found');
    }

    return this.getProfile({ userId: normalizedUserId });
  }

  async listVerificationDocuments({ userId }) {
    const normalizedUserId = normalizeUserId(userId);
    const session = await this.store.findLatestKycSessionByUserId(normalizedUserId);
    if (!session) {
      const items = REQUIRED_DOCUMENT_TYPES.map((documentType) =>
        toChecklistItem({
          documentType,
          required: true,
          sessionStatus: null,
          document: null
        })
      );
      return {
        session: null,
        documents: items,
        summary: toSummary(items)
      };
    }

    const documents = await this.store.listIdentityDocumentsBySessionId(session.id);
    const latestByType = new Map();
    for (const document of documents) {
      const documentType = normalizeDocumentType(document.documentType);
      if (!documentType) {
        continue;
      }
      latestByType.set(documentType, document);
    }

    const requiredItems = REQUIRED_DOCUMENT_TYPES.map((documentType) =>
      toChecklistItem({
        documentType,
        required: true,
        sessionStatus: session.status,
        document: latestByType.get(documentType) || null
      })
    );

    const optionalItems = Array.from(latestByType.entries())
      .filter(([documentType]) => !REQUIRED_DOCUMENT_TYPES.includes(documentType))
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([documentType, document]) =>
        toChecklistItem({
          documentType,
          required: false,
          sessionStatus: session.status,
          document
        })
      );

    const items = [...requiredItems, ...optionalItems];
    return {
      session: toSessionSummary(session),
      documents: items,
      summary: toSummary(items)
    };
  }

  async requestFinalVerification({ userId, source, note }) {
    const normalizedUserId = normalizeUserId(userId);
    const session = await this.store.findLatestKycSessionByUserId(normalizedUserId);
    if (!session) {
      throw new ProfileApiError(
        409,
        'verification_session_required',
        'cannot request final verification before starting a KYC session'
      );
    }

    if (session.status === 'CREATED') {
      throw new ProfileApiError(
        409,
        'kyc_session_not_submitted',
        'submit KYC session before requesting final verification'
      );
    }

    const documents = await this.store.listIdentityDocumentsBySessionId(session.id);
    if (documents.length === 0) {
      throw new ProfileApiError(
        409,
        'verification_documents_missing',
        'cannot request final verification without uploaded documents'
      );
    }

    const existingRequest = toFinalRequest(session.providerMetadataJson || {}, session.id);
    if (existingRequest) {
      return {
        created: false,
        request: existingRequest,
        session: toSessionSummary(session)
      };
    }

    const requestRecord = {
      id: randomUUID(),
      sessionId: session.id,
      status: FINAL_REQUEST_STATUS,
      source: normalizeFinalRequestSource(source),
      note: normalizeFinalRequestNote(note),
      requestedAt: new Date().toISOString(),
      documentsCount: documents.length
    };

    const updatedSession = await this.store.updateKycSessionProviderData({
      sessionId: session.id,
      providerRef: session.providerRef || null,
      providerMetadataJson: {
        finalVerification: requestRecord
      }
    });

    return {
      created: true,
      request: requestRecord,
      session: toSessionSummary(updatedSession || session)
    };
  }
}

export function createProfileService({ store } = {}) {
  if (
    !store ||
    typeof store.findUserById !== 'function' ||
    typeof store.updateUserProfile !== 'function' ||
    typeof store.findLatestKycSessionByUserId !== 'function' ||
    typeof store.listIdentityDocumentsBySessionId !== 'function' ||
    typeof store.updateKycSessionProviderData !== 'function'
  ) {
    throw new Error('Profile store is missing required methods');
  }
  return new ProfileService({ store });
}

export function isProfileApiError(error) {
  return error instanceof ProfileApiError;
}
