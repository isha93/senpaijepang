import { randomUUID } from 'node:crypto';

class OrganizationsApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const ALLOWED_ORG_TYPES = new Set(['TSK', 'LPK', 'EMPLOYER']);
const MAX_ORG_NAME_LENGTH = 180;
const MAX_REGISTRATION_NUMBER_LENGTH = 128;
const MAX_LEGAL_NAME_LENGTH = 180;
const MAX_SUPPORTING_OBJECT_KEYS = 20;
const MAX_OBJECT_KEY_LENGTH = 1024;

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
    throw new OrganizationsApiError(
      400,
      'invalid_registration_number',
      'registrationNumber is required'
    );
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
    reasonCodes: verification.reasonCodes,
    lastCheckedAt: verification.lastCheckedAt
  };
}

export class OrganizationsService {
  constructor() {
    this.organizationsById = new Map();
    this.verificationByOrgId = new Map();
  }

  getOrganizationForOwnerOrThrow({ orgId, ownerUserId }) {
    const normalizedOrgId = normalizeOrganizationId(orgId);
    const organization = this.organizationsById.get(normalizedOrgId);
    if (!organization || organization.ownerUserId !== ownerUserId) {
      throw new OrganizationsApiError(404, 'org_not_found', 'organization not found');
    }
    return organization;
  }

  createOrganization({ userId, name, orgType, countryCode }) {
    const ownerUserId = normalizeUserId(userId);
    const organization = {
      id: randomUUID(),
      ownerUserId,
      name: normalizeOrganizationName(name),
      orgType: normalizeOrganizationType(orgType),
      countryCode: normalizeCountryCode(countryCode),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.organizationsById.set(organization.id, organization);
    return toPublicOrganization(organization);
  }

  submitVerification({ userId, orgId, registrationNumber, legalName, supportingObjectKeys }) {
    const ownerUserId = normalizeUserId(userId);
    const organization = this.getOrganizationForOwnerOrThrow({
      orgId,
      ownerUserId
    });
    const now = new Date().toISOString();
    const payload = {
      registrationNumber: normalizeRegistrationNumber(registrationNumber),
      legalName: normalizeLegalName(legalName),
      supportingObjectKeys: normalizeSupportingObjectKeys(supportingObjectKeys)
    };

    const existing = this.verificationByOrgId.get(organization.id);
    if (existing) {
      existing.registrationNumber = payload.registrationNumber;
      existing.legalName = payload.legalName;
      existing.supportingObjectKeys = payload.supportingObjectKeys;
      existing.status = 'PENDING';
      existing.reasonCodes = [];
      existing.lastCheckedAt = now;
      existing.updatedAt = now;
      return toPublicVerification(existing);
    }

    const verification = {
      id: randomUUID(),
      orgId: organization.id,
      status: 'PENDING',
      reasonCodes: [],
      lastCheckedAt: now,
      registrationNumber: payload.registrationNumber,
      legalName: payload.legalName,
      supportingObjectKeys: payload.supportingObjectKeys,
      createdAt: now,
      updatedAt: now
    };

    this.verificationByOrgId.set(organization.id, verification);
    return toPublicVerification(verification);
  }

  getVerificationStatus({ userId, orgId }) {
    const ownerUserId = normalizeUserId(userId);
    const organization = this.getOrganizationForOwnerOrThrow({
      orgId,
      ownerUserId
    });
    const verification = this.verificationByOrgId.get(organization.id);
    if (!verification) {
      throw new OrganizationsApiError(
        404,
        'org_verification_not_found',
        'organization verification not found'
      );
    }
    return toPublicVerification(verification);
  }
}

export function createOrganizationsService(options = {}) {
  return new OrganizationsService(options);
}

export function isOrganizationsApiError(error) {
  return error instanceof OrganizationsApiError;
}
