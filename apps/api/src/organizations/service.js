class OrganizationsApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const ALLOWED_ORG_TYPES = new Set(['TSK', 'LPK', 'EMPLOYER']);
const ALLOWED_VERIFICATION_STATUSES = new Set(['PENDING', 'VERIFIED', 'MISMATCH', 'NOT_FOUND', 'REJECTED']);
const MAX_ORG_NAME_LENGTH = 180;
const MAX_REGISTRATION_NUMBER_LENGTH = 128;
const MAX_LEGAL_NAME_LENGTH = 180;
const MAX_SUPPORTING_OBJECT_KEYS = 20;
const MAX_OBJECT_KEY_LENGTH = 1024;
const MAX_REASON_CODES = 20;
const MAX_REASON_CODE_LENGTH = 64;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function normalizeUserId(userId) {
  const normalized = String(userId || '').trim();
  if (!normalized) {
    throw new OrganizationsApiError(400, 'invalid_user_id', 'userId is required');
  }
  return normalized;
}

function normalizeOrganizationId(orgId) {
  const normalized = String(orgId || '').trim();
  if (!normalized) {
    throw new OrganizationsApiError(400, 'invalid_org_id', 'orgId is required');
  }
  return normalized;
}

function normalizeOrganizationName(name) {
  const normalized = String(name || '').trim();
  if (normalized.length < 2 || normalized.length > MAX_ORG_NAME_LENGTH) {
    throw new OrganizationsApiError(
      400,
      'invalid_org_name',
      `name must be between 2 and ${MAX_ORG_NAME_LENGTH} characters`
    );
  }
  return normalized;
}

function normalizeOrganizationType(orgType) {
  const normalized = String(orgType || '')
    .trim()
    .toUpperCase();
  if (!ALLOWED_ORG_TYPES.has(normalized)) {
    throw new OrganizationsApiError(
      400,
      'invalid_org_type',
      `orgType must be one of ${Array.from(ALLOWED_ORG_TYPES).join(', ')}`
    );
  }
  return normalized;
}

function normalizeOptionalOrganizationType(orgType) {
  if (orgType === undefined || orgType === null || String(orgType).trim() === '') {
    return null;
  }
  return normalizeOrganizationType(orgType);
}

function normalizeCountryCode(countryCode) {
  const normalized = String(countryCode || '')
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    throw new OrganizationsApiError(400, 'invalid_country_code', 'countryCode must be 2 uppercase letters');
  }
  return normalized;
}

function normalizeRegistrationNumber(registrationNumber) {
  const normalized = String(registrationNumber || '').trim();
  if (!normalized) {
    throw new OrganizationsApiError(400, 'invalid_registration_number', 'registrationNumber is required');
  }
  if (normalized.length > MAX_REGISTRATION_NUMBER_LENGTH) {
    throw new OrganizationsApiError(
      400,
      'invalid_registration_number',
      `registrationNumber must be <= ${MAX_REGISTRATION_NUMBER_LENGTH} characters`
    );
  }
  return normalized;
}

function normalizeLegalName(legalName) {
  const normalized = String(legalName || '').trim();
  if (normalized.length < 2 || normalized.length > MAX_LEGAL_NAME_LENGTH) {
    throw new OrganizationsApiError(
      400,
      'invalid_legal_name',
      `legalName must be between 2 and ${MAX_LEGAL_NAME_LENGTH} characters`
    );
  }
  return normalized;
}

function normalizeSupportingObjectKeys(supportingObjectKeys) {
  if (supportingObjectKeys === undefined || supportingObjectKeys === null) {
    return [];
  }
  if (!Array.isArray(supportingObjectKeys)) {
    throw new OrganizationsApiError(
      400,
      'invalid_supporting_object_keys',
      'supportingObjectKeys must be an array'
    );
  }
  if (supportingObjectKeys.length > MAX_SUPPORTING_OBJECT_KEYS) {
    throw new OrganizationsApiError(
      400,
      'invalid_supporting_object_keys',
      `supportingObjectKeys must contain <= ${MAX_SUPPORTING_OBJECT_KEYS} items`
    );
  }

  return supportingObjectKeys.map((value) => {
    const normalized = String(value || '').trim();
    if (!normalized) {
      throw new OrganizationsApiError(
        400,
        'invalid_supporting_object_key',
        'supporting object key must be non-empty string'
      );
    }
    if (normalized.length > MAX_OBJECT_KEY_LENGTH) {
      throw new OrganizationsApiError(
        400,
        'invalid_supporting_object_key',
        `supporting object key must be <= ${MAX_OBJECT_KEY_LENGTH} characters`
      );
    }
    if (normalized.startsWith('/') || normalized.includes('..')) {
      throw new OrganizationsApiError(
        400,
        'invalid_supporting_object_key',
        'supporting object key is invalid'
      );
    }
    return normalized;
  });
}

function normalizeVerificationStatus(status) {
  const normalized = String(status || '')
    .trim()
    .toUpperCase();
  if (!ALLOWED_VERIFICATION_STATUSES.has(normalized)) {
    throw new OrganizationsApiError(
      400,
      'invalid_verification_status',
      `status must be one of ${Array.from(ALLOWED_VERIFICATION_STATUSES).join(', ')}`
    );
  }
  return normalized;
}

function normalizeOptionalVerificationStatus(status) {
  if (status === undefined || status === null || String(status).trim() === '') {
    return null;
  }
  return normalizeVerificationStatus(status);
}

function normalizeReasonCodes(reasonCodes) {
  if (reasonCodes === undefined || reasonCodes === null) {
    return [];
  }
  if (!Array.isArray(reasonCodes)) {
    throw new OrganizationsApiError(400, 'invalid_reason_codes', 'reasonCodes must be an array');
  }
  if (reasonCodes.length > MAX_REASON_CODES) {
    throw new OrganizationsApiError(
      400,
      'invalid_reason_codes',
      `reasonCodes must contain <= ${MAX_REASON_CODES} items`
    );
  }
  return reasonCodes.map((value) => {
    const normalized = String(value || '').trim();
    if (!normalized) {
      throw new OrganizationsApiError(400, 'invalid_reason_code', 'reason code must be non-empty string');
    }
    if (normalized.length > MAX_REASON_CODE_LENGTH) {
      throw new OrganizationsApiError(
        400,
        'invalid_reason_code',
        `reason code must be <= ${MAX_REASON_CODE_LENGTH} characters`
      );
    }
    return normalized;
  });
}

function normalizeLimit(limit) {
  if (limit === undefined || limit === null || String(limit).trim() === '') {
    return DEFAULT_LIMIT;
  }
  const normalized = Number(limit);
  if (!Number.isInteger(normalized) || normalized < 1 || normalized > MAX_LIMIT) {
    throw new OrganizationsApiError(400, 'invalid_limit', `limit must be integer between 1 and ${MAX_LIMIT}`);
  }
  return normalized;
}

function normalizeCursor(cursor) {
  if (cursor === undefined || cursor === null || String(cursor).trim() === '') {
    return 0;
  }
  const normalized = Number(cursor);
  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new OrganizationsApiError(400, 'invalid_cursor', 'cursor must be a non-negative integer');
  }
  return normalized;
}

function toPublicOrganization(organization) {
  return {
    id: organization.id,
    name: organization.name,
    orgType: organization.orgType,
    countryCode: organization.countryCode
  };
}

function toPublicVerification(verification) {
  return {
    id: verification.id,
    orgId: verification.orgId,
    status: verification.status,
    reasonCodes: Array.isArray(verification.reasonCodesJson) ? verification.reasonCodesJson : [],
    lastCheckedAt: verification.lastCheckedAt
  };
}

export class OrganizationsService {
  constructor({ store }) {
    this.store = store;
  }

  async assertOwnerOrganizationOrThrow({ userId, orgId }) {
    const normalizedUserId = normalizeUserId(userId);
    const normalizedOrgId = normalizeOrganizationId(orgId);
    const organization = await this.store.findOrganizationById(normalizedOrgId);
    if (!organization || organization.ownerUserId !== normalizedUserId) {
      throw new OrganizationsApiError(404, 'org_not_found', 'organization not found');
    }
    return organization;
  }

  async createOrganization({ userId, name, orgType, countryCode }) {
    const normalizedUserId = normalizeUserId(userId);
    const organization = await this.store.createOrganization({
      ownerUserId: normalizedUserId,
      name: normalizeOrganizationName(name),
      orgType: normalizeOrganizationType(orgType),
      countryCode: normalizeCountryCode(countryCode)
    });
    return toPublicOrganization(organization);
  }

  async submitVerification({ userId, orgId, registrationNumber, legalName, supportingObjectKeys }) {
    const organization = await this.assertOwnerOrganizationOrThrow({
      userId,
      orgId
    });
    const verification = await this.store.createOrUpdateOrganizationVerification({
      orgId: organization.id,
      status: 'PENDING',
      reasonCodesJson: [],
      registrationNumber: normalizeRegistrationNumber(registrationNumber),
      legalName: normalizeLegalName(legalName),
      supportingObjectKeysJson: normalizeSupportingObjectKeys(supportingObjectKeys),
      lastCheckedAt: new Date().toISOString()
    });
    return toPublicVerification(verification);
  }

  async getVerificationStatus({ userId, orgId }) {
    const organization = await this.assertOwnerOrganizationOrThrow({
      userId,
      orgId
    });
    const verification = await this.store.findOrganizationVerificationByOrgId(organization.id);
    if (!verification) {
      throw new OrganizationsApiError(
        404,
        'org_verification_not_found',
        'organization verification not found'
      );
    }
    return toPublicVerification(verification);
  }

  async listOrganizationsForAdmin({ cursor, limit, orgType, verificationStatus }) {
    const normalizedCursor = normalizeCursor(cursor);
    const normalizedLimit = normalizeLimit(limit);
    const normalizedOrgType = normalizeOptionalOrganizationType(orgType);
    const normalizedVerificationStatus = normalizeOptionalVerificationStatus(verificationStatus);

    const organizations = await this.store.listOrganizations();
    const filtered = [];

    for (const organization of organizations) {
      if (normalizedOrgType && organization.orgType !== normalizedOrgType) {
        continue;
      }
      const verification = await this.store.findOrganizationVerificationByOrgId(organization.id);
      if (normalizedVerificationStatus && (!verification || verification.status !== normalizedVerificationStatus)) {
        continue;
      }

      const owner = await this.store.findUserById(organization.ownerUserId);
      filtered.push({
        organization: toPublicOrganization(organization),
        verification: verification ? toPublicVerification(verification) : null,
        owner: owner
          ? {
              id: owner.id,
              fullName: owner.fullName,
              email: owner.email
            }
          : null
      });
    }

    const paged = filtered.slice(normalizedCursor, normalizedCursor + normalizedLimit);
    const nextOffset = normalizedCursor + paged.length;
    const nextCursor = nextOffset < filtered.length ? String(nextOffset) : null;

    return {
      items: paged,
      pageInfo: {
        cursor: String(normalizedCursor),
        nextCursor,
        limit: normalizedLimit,
        total: filtered.length
      }
    };
  }

  async adminUpdateVerification({ orgId, status, reasonCodes }) {
    const normalizedOrgId = normalizeOrganizationId(orgId);
    const normalizedStatus = normalizeVerificationStatus(status);
    const normalizedReasonCodes = normalizeReasonCodes(reasonCodes);

    const organization = await this.store.findOrganizationById(normalizedOrgId);
    if (!organization) {
      throw new OrganizationsApiError(404, 'org_not_found', 'organization not found');
    }

    const existingVerification = await this.store.findOrganizationVerificationByOrgId(normalizedOrgId);
    if (!existingVerification) {
      throw new OrganizationsApiError(
        404,
        'org_verification_not_found',
        'organization verification not found'
      );
    }

    const verification = await this.store.createOrUpdateOrganizationVerification({
      orgId: normalizedOrgId,
      status: normalizedStatus,
      reasonCodesJson: normalizedReasonCodes,
      registrationNumber: existingVerification.registrationNumber,
      legalName: existingVerification.legalName,
      supportingObjectKeysJson: existingVerification.supportingObjectKeysJson || [],
      lastCheckedAt: new Date().toISOString()
    });

    return toPublicVerification(verification);
  }
}

export function createOrganizationsService({ store } = {}) {
  if (
    !store ||
    typeof store.findUserById !== 'function' ||
    typeof store.createOrganization !== 'function' ||
    typeof store.findOrganizationById !== 'function' ||
    typeof store.listOrganizations !== 'function' ||
    typeof store.createOrUpdateOrganizationVerification !== 'function' ||
    typeof store.findOrganizationVerificationByOrgId !== 'function'
  ) {
    throw new Error('Organizations store is missing required methods');
  }
  return new OrganizationsService({ store });
}

export function isOrganizationsApiError(error) {
  return error instanceof OrganizationsApiError;
}
