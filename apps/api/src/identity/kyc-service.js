class KycApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

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

export class KycService {
  constructor({ store }) {
    this.store = store;
  }

  async startSession({ userId, provider }) {
    const normalizedProvider = String(provider || 'manual').trim().toLowerCase() || 'manual';
    if (normalizedProvider.length > 64) {
      throw new KycApiError(400, 'invalid_provider', 'provider must be <= 64 characters');
    }

    const session = await this.store.createKycSession({
      userId,
      provider: normalizedProvider
    });

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
}

export function createKycService({ store }) {
  if (!store || typeof store.createKycSession !== 'function' || typeof store.findLatestKycSessionByUserId !== 'function') {
    throw new Error('KYC store is missing required methods');
  }
  return new KycService({ store });
}

export function isKycApiError(error) {
  return error instanceof KycApiError;
}
