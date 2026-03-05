import { randomUUID } from 'node:crypto';
import { createInMemoryObjectStorage } from '../identity/object-storage.js';

export class JobsApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_BULK_ITEMS = 100;
const EMPLOYMENT_TYPES = new Set(['FULL_TIME', 'PART_TIME', 'CONTRACT']);
const JOB_LIFECYCLE_STATUSES = new Set(['DRAFT', 'PUBLISHED', 'SCHEDULED']);
const JOB_BULK_ACTIONS = new Set(['PUBLISH', 'UNPUBLISH', 'SCHEDULE', 'DELETE']);
const APPLICATION_DOCUMENT_REVIEW_STATUSES = new Set(['PENDING', 'VALID', 'INVALID']);
const APPLICATION_STATUSES = new Set(['SUBMITTED', 'IN_REVIEW', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED']);
const APPLICATION_STATUS_TRANSITIONS = {
  SUBMITTED: new Set(['IN_REVIEW', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED']),
  IN_REVIEW: new Set(['INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED']),
  INTERVIEW: new Set(['OFFERED', 'HIRED', 'REJECTED']),
  OFFERED: new Set(),
  HIRED: new Set(),
  REJECTED: new Set()
};
const APPLICATION_STATUS_EVENT_TITLES = {
  SUBMITTED: 'Application submitted',
  IN_REVIEW: 'Application in review',
  INTERVIEW: 'Interview stage',
  OFFERED: 'Offer stage',
  HIRED: 'Candidate hired',
  REJECTED: 'Application rejected'
};
const MAX_TITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_REQUIREMENTS = 20;
const MAX_REQUIREMENT_LENGTH = 300;
const MAX_CITY_LENGTH = 120;
const MAX_DISPLAY_LABEL_LENGTH = 180;
const MAX_EMPLOYER_NAME_LENGTH = 180;
const MAX_APPLICATION_DOCUMENT_TYPE_LENGTH = 64;
const MAX_APPLICATION_FILE_NAME_LENGTH = 180;
const MAX_APPLICATION_OBJECT_KEY_LENGTH = 1024;
const MAX_APPLICATION_REVIEW_REASON_LENGTH = 500;
const DEFAULT_APPLICATION_ALLOWED_CONTENT_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const DEFAULT_APPLICATION_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const APPLICATION_PREVIEW_DEFAULT_EXPIRES_SEC = 120;
const APPLICATION_PREVIEW_MAX_EXPIRES_SEC = 900;
const APPLICATION_DOCUMENT_ACTOR_TYPES = new Set(['USER', 'ADMIN', 'SYSTEM']);

export const JOB_SEED_DATA = [
  {
    id: 'job_tokyo_senior_welder_001',
    title: 'Senior Welder',
    employmentType: 'FULL_TIME',
    visaSponsorship: true,
    description:
      'We are looking for an experienced welder to join our infrastructure projects in Tokyo.',
    requirements: [
      'Minimum 3 years of professional welding experience (MIG/TIG).',
      'Basic Japanese language proficiency (N4 or conversational).',
      'Willingness to relocate to Tokyo for at least 2 years.'
    ],
    location: {
      countryCode: 'JP',
      city: 'Tokyo',
      displayLabel: 'Tokyo, JP',
      latitude: 35.6762,
      longitude: 139.6503
    },
    employer: {
      id: 'emp_tokyo_construction',
      name: 'Tokyo Construction Co.',
      logoUrl: null,
      isVerifiedEmployer: true
    }
  },
  {
    id: 'job_osaka_cnc_operator_002',
    title: 'CNC Operator',
    employmentType: 'CONTRACT',
    visaSponsorship: true,
    description: 'Operate and maintain CNC machines for high precision manufacturing.',
    requirements: [
      '2+ years CNC machining experience.',
      'Able to read technical drawings.',
      'Basic safety and quality documentation handling.'
    ],
    location: {
      countryCode: 'JP',
      city: 'Osaka',
      displayLabel: 'Osaka, JP',
      latitude: 34.6937,
      longitude: 135.5023
    },
    employer: {
      id: 'emp_kansai_precision',
      name: 'Kansai Precision Works',
      logoUrl: null,
      isVerifiedEmployer: true
    }
  },
  {
    id: 'job_nagoya_warehouse_staff_003',
    title: 'Warehouse Staff',
    employmentType: 'FULL_TIME',
    visaSponsorship: false,
    description: 'Handle receiving, sorting, and dispatch operations in Nagoya warehouse.',
    requirements: [
      'Experience in logistics or warehouse operations.',
      'Comfortable with shift scheduling.',
      'Forklift license is a plus.'
    ],
    location: {
      countryCode: 'JP',
      city: 'Nagoya',
      displayLabel: 'Nagoya, JP',
      latitude: 35.1815,
      longitude: 136.9066
    },
    employer: {
      id: 'emp_chubu_logistics',
      name: 'Chubu Logistics',
      logoUrl: null,
      isVerifiedEmployer: false
    }
  },
  {
    id: 'job_fukuoka_eldercare_assistant_004',
    title: 'Eldercare Assistant',
    employmentType: 'PART_TIME',
    visaSponsorship: true,
    description: 'Support daily eldercare routines and assist senior care staff.',
    requirements: [
      'Compassionate communication skills.',
      'Prior caregiving experience preferred.',
      'Readiness for weekend shifts.'
    ],
    location: {
      countryCode: 'JP',
      city: 'Fukuoka',
      displayLabel: 'Fukuoka, JP',
      latitude: 33.5902,
      longitude: 130.4017
    },
    employer: {
      id: 'emp_hakata_care',
      name: 'Hakata Care Home',
      logoUrl: null,
      isVerifiedEmployer: true
    }
  }
].map((job, index) => ({
  ...job,
  lifecycleStatus: 'PUBLISHED',
  publishedAt: new Date(Date.UTC(2026, 0, index + 1, 9, 0, 0)).toISOString(),
  scheduledAt: null
}));

function normalizeLimit(limit) {
  if (limit === undefined || limit === null || String(limit).trim() === '') {
    return DEFAULT_LIMIT;
  }
  const normalized = Number(limit);
  if (!Number.isInteger(normalized) || normalized < 1 || normalized > MAX_LIMIT) {
    throw new JobsApiError(400, 'invalid_limit', `limit must be integer between 1 and ${MAX_LIMIT}`);
  }
  return normalized;
}

function normalizeCursor(cursor) {
  if (cursor === undefined || cursor === null || String(cursor).trim() === '') {
    return 0;
  }
  const normalized = Number(cursor);
  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new JobsApiError(400, 'invalid_cursor', 'cursor must be a non-negative integer');
  }
  return normalized;
}

function normalizeEmploymentType(employmentType) {
  if (employmentType === undefined || employmentType === null || String(employmentType).trim() === '') {
    return null;
  }
  const normalized = String(employmentType).trim().toUpperCase();
  if (!EMPLOYMENT_TYPES.has(normalized)) {
    throw new JobsApiError(
      400,
      'invalid_employment_type',
      `employmentType must be one of ${Array.from(EMPLOYMENT_TYPES).join(', ')}`
    );
  }
  return normalized;
}

function normalizeVisaSponsored(visaSponsored) {
  if (visaSponsored === undefined || visaSponsored === null || String(visaSponsored).trim() === '') {
    return null;
  }
  const normalized = String(visaSponsored).trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  throw new JobsApiError(400, 'invalid_visa_sponsored', 'visaSponsored must be true or false');
}

function normalizeSearchQuery(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizeLocation(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizeApplicationStatus(status) {
  if (status === undefined || status === null || String(status).trim() === '') {
    return null;
  }
  const normalized = String(status).trim().toUpperCase();
  if (!APPLICATION_STATUSES.has(normalized)) {
    throw new JobsApiError(
      400,
      'invalid_application_status',
      `status must be one of ${Array.from(APPLICATION_STATUSES).join(', ')}`
    );
  }
  return normalized;
}

function normalizeApplicationNote(note) {
  if (note === undefined || note === null) {
    return null;
  }
  const normalized = String(note).trim();
  if (!normalized) {
    return null;
  }
  if (normalized.length > 1000) {
    throw new JobsApiError(400, 'invalid_note', 'note must be <= 1000 characters');
  }
  return normalized;
}

function normalizeOptionalReason(reason) {
  if (reason === undefined || reason === null) {
    return null;
  }
  const normalized = String(reason).trim();
  if (!normalized) {
    return null;
  }
  if (normalized.length > 500) {
    throw new JobsApiError(400, 'invalid_reason', 'reason must be <= 500 characters');
  }
  return normalized;
}

function normalizeApplicationId(applicationId) {
  const normalized = String(applicationId || '').trim();
  if (!normalized) {
    throw new JobsApiError(400, 'invalid_application_id', 'applicationId is required');
  }
  return normalized;
}

function normalizeApplicationDocumentId(documentId) {
  const normalized = String(documentId || '').trim();
  if (!normalized) {
    throw new JobsApiError(400, 'invalid_document_id', 'documentId is required');
  }
  return normalized;
}

function normalizeApplicationDocumentType(documentType) {
  const normalized = String(documentType || '')
    .trim()
    .toUpperCase();
  if (!normalized) {
    throw new JobsApiError(400, 'invalid_document_type', 'documentType is required');
  }
  if (normalized.length > MAX_APPLICATION_DOCUMENT_TYPE_LENGTH) {
    throw new JobsApiError(
      400,
      'invalid_document_type',
      `documentType must be <= ${MAX_APPLICATION_DOCUMENT_TYPE_LENGTH} characters`
    );
  }
  return normalized;
}

function normalizeApplicationFileName(fileName) {
  const normalized = String(fileName || '').trim();
  if (!normalized) {
    throw new JobsApiError(400, 'invalid_file_name', 'fileName is required');
  }
  if (normalized.length > MAX_APPLICATION_FILE_NAME_LENGTH) {
    throw new JobsApiError(
      400,
      'invalid_file_name',
      `fileName must be <= ${MAX_APPLICATION_FILE_NAME_LENGTH} characters`
    );
  }
  return normalized;
}

function normalizeApplicationObjectKey(objectKey) {
  const normalized = String(objectKey || '').trim();
  if (!normalized) {
    throw new JobsApiError(400, 'invalid_object_key', 'objectKey is required');
  }
  if (normalized.length > MAX_APPLICATION_OBJECT_KEY_LENGTH) {
    throw new JobsApiError(
      400,
      'invalid_object_key',
      `objectKey must be <= ${MAX_APPLICATION_OBJECT_KEY_LENGTH} characters`
    );
  }
  if (normalized.startsWith('/') || normalized.includes('..')) {
    throw new JobsApiError(400, 'invalid_object_key', 'objectKey is invalid');
  }
  if (!/^[a-zA-Z0-9/_\-.]+$/.test(normalized)) {
    throw new JobsApiError(400, 'invalid_object_key', 'objectKey contains unsupported characters');
  }
  return normalized;
}

function normalizeApplicationContentType(contentType) {
  const normalized = String(contentType || '')
    .trim()
    .toLowerCase();
  if (!normalized) {
    throw new JobsApiError(400, 'invalid_content_type', 'contentType is required');
  }
  if (!DEFAULT_APPLICATION_ALLOWED_CONTENT_TYPES.has(normalized)) {
    throw new JobsApiError(
      400,
      'invalid_content_type',
      `contentType must be one of ${Array.from(DEFAULT_APPLICATION_ALLOWED_CONTENT_TYPES).join(', ')}`
    );
  }
  return normalized;
}

function normalizeApplicationContentLength(contentLength) {
  const normalized = Number(contentLength);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new JobsApiError(400, 'invalid_content_length', 'contentLength must be a positive number');
  }
  if (normalized > DEFAULT_APPLICATION_MAX_UPLOAD_BYTES) {
    throw new JobsApiError(
      400,
      'invalid_content_length',
      `contentLength must be <= ${DEFAULT_APPLICATION_MAX_UPLOAD_BYTES} bytes`
    );
  }
  return Math.floor(normalized);
}

function normalizeApplicationChecksumSha256(checksumSha256) {
  const normalized = String(checksumSha256 || '')
    .trim()
    .toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new JobsApiError(400, 'invalid_checksum_sha256', 'checksumSha256 must be 64 hex characters');
  }
  return normalized;
}

function normalizeApplicationDocumentReviewStatus(reviewStatus) {
  const normalized = String(reviewStatus || '')
    .trim()
    .toUpperCase();
  if (!APPLICATION_DOCUMENT_REVIEW_STATUSES.has(normalized)) {
    throw new JobsApiError(
      400,
      'invalid_review_status',
      `reviewStatus must be one of ${Array.from(APPLICATION_DOCUMENT_REVIEW_STATUSES).join(', ')}`
    );
  }
  return normalized;
}

function normalizeApplicationReviewReason(reviewReason) {
  if (reviewReason === undefined || reviewReason === null) {
    return null;
  }
  const normalized = String(reviewReason).trim();
  if (!normalized) {
    return null;
  }
  if (normalized.length > MAX_APPLICATION_REVIEW_REASON_LENGTH) {
    throw new JobsApiError(
      400,
      'invalid_review_reason',
      `reviewReason must be <= ${MAX_APPLICATION_REVIEW_REASON_LENGTH} characters`
    );
  }
  return normalized;
}

function normalizeApplicationPreviewExpiresSec(expiresSec) {
  if (expiresSec === undefined || expiresSec === null || String(expiresSec).trim() === '') {
    return APPLICATION_PREVIEW_DEFAULT_EXPIRES_SEC;
  }
  const normalized = Number(expiresSec);
  if (
    !Number.isFinite(normalized) ||
    normalized < 60 ||
    normalized > APPLICATION_PREVIEW_MAX_EXPIRES_SEC
  ) {
    throw new JobsApiError(
      400,
      'invalid_expires_sec',
      `expiresSec must be between 60 and ${APPLICATION_PREVIEW_MAX_EXPIRES_SEC}`
    );
  }
  return Math.floor(normalized);
}

function normalizeApplicationActorType(actorType) {
  const normalized = String(actorType || '')
    .trim()
    .toUpperCase();
  if (!APPLICATION_DOCUMENT_ACTOR_TYPES.has(normalized)) {
    throw new JobsApiError(
      400,
      'invalid_actor_type',
      `actorType must be one of ${Array.from(APPLICATION_DOCUMENT_ACTOR_TYPES).join(', ')}`
    );
  }
  return normalized;
}

function normalizeApplicationActorId(actorId) {
  if (actorId === undefined || actorId === null) {
    return null;
  }
  const normalized = String(actorId).trim();
  if (!normalized) {
    return null;
  }
  if (normalized.length > 180) {
    throw new JobsApiError(400, 'invalid_actor_id', 'actorId must be <= 180 characters');
  }
  return normalized;
}

function sanitizeFileToken(value, fallback) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
}

function buildApplicationDocumentObjectKey({ userId, applicationId, documentType, fileName }) {
  const timestampToken = new Date().toISOString().replace(/[-:.TZ]/g, '');
  const safeFileName = sanitizeFileToken(fileName, 'document.bin');
  const safeDocumentType = sanitizeFileToken(documentType, 'document');
  return `applications/${userId}/${applicationId}/${timestampToken}-${safeDocumentType}-${randomUUID()}-${safeFileName}`;
}

function assertApplicationObjectKeyOwnership({ userId, applicationId, objectKey }) {
  const expectedPrefix = `applications/${userId}/${applicationId}/`;
  if (!String(objectKey || '').startsWith(expectedPrefix)) {
    throw new JobsApiError(
      403,
      'invalid_object_key_ownership',
      'objectKey is not allowed for this application'
    );
  }
}

function normalizeOptionalUpdatedBy(updatedBy) {
  if (updatedBy === undefined || updatedBy === null) {
    return null;
  }
  const normalized = String(updatedBy).trim();
  if (!normalized) {
    return null;
  }
  if (normalized.length > 180) {
    throw new JobsApiError(400, 'invalid_updated_by', 'updatedBy must be <= 180 characters');
  }
  return normalized;
}

function normalizeOptionalDateTime(value, fieldName) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  const normalized = String(value).trim();
  const timestamp = Date.parse(normalized);
  if (!Number.isFinite(timestamp)) {
    throw new JobsApiError(400, 'invalid_date_filter', `${fieldName} must be valid ISO date-time`);
  }
  return new Date(timestamp).toISOString();
}

function normalizeRequiredLifecycleStatus(status, fieldName = 'status') {
  const normalized = String(status || '')
    .trim()
    .toUpperCase();
  if (!JOB_LIFECYCLE_STATUSES.has(normalized)) {
    throw new JobsApiError(
      400,
      'invalid_lifecycle_status',
      `${fieldName} must be one of ${Array.from(JOB_LIFECYCLE_STATUSES).join(', ')}`
    );
  }
  return normalized;
}

function normalizeOptionalLifecycleStatus(status, fieldName = 'status') {
  if (status === undefined) {
    return undefined;
  }
  return normalizeRequiredLifecycleStatus(status, fieldName);
}

function normalizeRequiredLifecycleDate(value, fieldName) {
  const normalized = String(value || '').trim();
  const timestamp = Date.parse(normalized);
  if (!Number.isFinite(timestamp)) {
    throw new JobsApiError(400, 'invalid_lifecycle_date', `${fieldName} must be valid ISO date-time`);
  }
  return new Date(timestamp).toISOString();
}

function normalizeOptionalLifecycleDate(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || String(value).trim() === '') {
    return null;
  }
  return normalizeRequiredLifecycleDate(value, fieldName);
}

function normalizeBulkAction(action) {
  const normalized = String(action || '')
    .trim()
    .toUpperCase();
  if (!JOB_BULK_ACTIONS.has(normalized)) {
    throw new JobsApiError(
      400,
      'invalid_bulk_action',
      `action must be one of ${Array.from(JOB_BULK_ACTIONS).join(', ')}`
    );
  }
  return normalized;
}

function normalizeBulkJobIds(jobIds) {
  if (!Array.isArray(jobIds) || jobIds.length === 0) {
    throw new JobsApiError(400, 'invalid_job_ids', 'jobIds must be a non-empty array');
  }
  if (jobIds.length > MAX_BULK_ITEMS) {
    throw new JobsApiError(400, 'invalid_job_ids', `jobIds must not exceed ${MAX_BULK_ITEMS} items`);
  }
  const normalized = [];
  const seen = new Set();
  for (const value of jobIds) {
    const id = String(value || '').trim();
    if (!id) {
      throw new JobsApiError(400, 'invalid_job_ids', 'jobIds must contain non-empty ids');
    }
    if (!seen.has(id)) {
      seen.add(id);
      normalized.push(id);
    }
  }
  return normalized;
}

function ensureJobLifecycle(job) {
  const lifecycleStatus = normalizeRequiredLifecycleStatus(
    job.lifecycleStatus || 'PUBLISHED',
    'lifecycle.status'
  );
  const publishedAt = job.publishedAt ? normalizeRequiredLifecycleDate(job.publishedAt, 'lifecycle.publishedAt') : null;
  const scheduledAt = job.scheduledAt ? normalizeRequiredLifecycleDate(job.scheduledAt, 'lifecycle.scheduledAt') : null;
  return {
    ...job,
    lifecycleStatus,
    publishedAt,
    scheduledAt
  };
}

function resolveEffectiveLifecycleStatus({ lifecycleStatus, scheduledAt }) {
  if (lifecycleStatus === 'SCHEDULED') {
    if (!scheduledAt) {
      return 'DRAFT';
    }
    return Date.parse(scheduledAt) <= Date.now() ? 'PUBLISHED' : 'SCHEDULED';
  }
  return lifecycleStatus;
}

function isJobPubliclyVisible(job) {
  return resolveEffectiveLifecycleStatus(job) === 'PUBLISHED';
}

function toLifecycleState(job) {
  return {
    status: job.lifecycleStatus,
    effectiveStatus: resolveEffectiveLifecycleStatus(job),
    publishedAt: job.publishedAt || null,
    scheduledAt: job.scheduledAt || null
  };
}

function ensureTransitionAllowed(fromStatus, toStatus) {
  if (fromStatus === toStatus) {
    return false;
  }
  const allowed = APPLICATION_STATUS_TRANSITIONS[fromStatus] || new Set();
  if (!allowed.has(toStatus)) {
    throw new JobsApiError(
      409,
      'invalid_application_transition',
      `cannot transition application from ${fromStatus} to ${toStatus}`
    );
  }
  return true;
}

function buildStatusJourneyEvent({
  status,
  reason,
  updatedBy,
  createdAt,
  actorType = 'ADMIN',
  actorId = null,
  title,
  description
}) {
  const resolvedTitle = title || APPLICATION_STATUS_EVENT_TITLES[status] || `Application status ${status}`;
  const reasonSuffix = reason ? ` Reason: ${reason}` : '';
  const actor = updatedBy ? ` by ${updatedBy}` : '';
  const resolvedDescription = (description || `Application status updated to ${status}${actor}.${reasonSuffix}`).trim();
  return {
    id: randomUUID(),
    status,
    title: resolvedTitle,
    description: resolvedDescription,
    actorType: normalizeApplicationActorType(actorType),
    actorId: normalizeApplicationActorId(actorId),
    createdAt
  };
}

function normalizeRequiredTitle(title) {
  const normalized = String(title || '').trim();
  if (normalized.length < 2 || normalized.length > MAX_TITLE_LENGTH) {
    throw new JobsApiError(400, 'invalid_job_title', `title must be between 2 and ${MAX_TITLE_LENGTH} characters`);
  }
  return normalized;
}

function normalizeRequiredEmploymentType(employmentType) {
  const normalized = normalizeEmploymentType(employmentType);
  if (!normalized) {
    throw new JobsApiError(400, 'invalid_employment_type', 'employmentType is required');
  }
  return normalized;
}

function normalizeOptionalEmploymentType(employmentType) {
  if (employmentType === undefined) {
    return undefined;
  }
  return normalizeRequiredEmploymentType(employmentType);
}

function normalizeRequiredVisaSponsorship(visaSponsorship) {
  if (typeof visaSponsorship === 'boolean') {
    return visaSponsorship;
  }
  throw new JobsApiError(400, 'invalid_visa_sponsorship', 'visaSponsorship must be boolean');
}

function normalizeOptionalVisaSponsorship(visaSponsorship) {
  if (visaSponsorship === undefined) {
    return undefined;
  }
  return normalizeRequiredVisaSponsorship(visaSponsorship);
}

function normalizeRequiredDescription(description) {
  const normalized = String(description || '').trim();
  if (normalized.length < 8 || normalized.length > MAX_DESCRIPTION_LENGTH) {
    throw new JobsApiError(
      400,
      'invalid_job_description',
      `description must be between 8 and ${MAX_DESCRIPTION_LENGTH} characters`
    );
  }
  return normalized;
}

function normalizeOptionalDescription(description) {
  if (description === undefined) {
    return undefined;
  }
  return normalizeRequiredDescription(description);
}

function normalizeRequiredRequirements(requirements) {
  if (!Array.isArray(requirements) || requirements.length < 1 || requirements.length > MAX_REQUIREMENTS) {
    throw new JobsApiError(
      400,
      'invalid_job_requirements',
      `requirements must contain between 1 and ${MAX_REQUIREMENTS} items`
    );
  }
  return requirements.map((value) => {
    const normalized = String(value || '').trim();
    if (normalized.length < 2 || normalized.length > MAX_REQUIREMENT_LENGTH) {
      throw new JobsApiError(
        400,
        'invalid_job_requirement',
        `each requirement must be between 2 and ${MAX_REQUIREMENT_LENGTH} characters`
      );
    }
    return normalized;
  });
}

function normalizeOptionalRequirements(requirements) {
  if (requirements === undefined) {
    return undefined;
  }
  return normalizeRequiredRequirements(requirements);
}

function normalizeCountryCode(countryCode) {
  const normalized = String(countryCode || '')
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    throw new JobsApiError(400, 'invalid_country_code', 'countryCode must be 2 uppercase letters');
  }
  return normalized;
}

function normalizeRequiredLocation(location) {
  if (!location || typeof location !== 'object' || Array.isArray(location)) {
    throw new JobsApiError(400, 'invalid_job_location', 'location is required');
  }
  const city = String(location.city || '').trim();
  const displayLabel = String(location.displayLabel || '').trim();
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  if (city.length < 2 || city.length > MAX_CITY_LENGTH) {
    throw new JobsApiError(400, 'invalid_job_location', `location.city must be between 2 and ${MAX_CITY_LENGTH}`);
  }
  if (displayLabel.length < 2 || displayLabel.length > MAX_DISPLAY_LABEL_LENGTH) {
    throw new JobsApiError(
      400,
      'invalid_job_location',
      `location.displayLabel must be between 2 and ${MAX_DISPLAY_LABEL_LENGTH}`
    );
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new JobsApiError(400, 'invalid_job_location', 'location.latitude must be between -90 and 90');
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new JobsApiError(400, 'invalid_job_location', 'location.longitude must be between -180 and 180');
  }

  return {
    countryCode: normalizeCountryCode(location.countryCode),
    city,
    displayLabel,
    latitude,
    longitude
  };
}

function normalizeOptionalLocation(location) {
  if (location === undefined) {
    return undefined;
  }
  return normalizeRequiredLocation(location);
}

function normalizeOptionalLogoUrl(logoUrl) {
  if (logoUrl === undefined) {
    return undefined;
  }
  if (logoUrl === null) {
    return null;
  }
  const normalized = String(logoUrl || '').trim();
  if (!normalized) {
    return null;
  }
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('invalid');
    }
  } catch {
    throw new JobsApiError(400, 'invalid_employer_logo_url', 'employer.logoUrl must be valid http(s) URL');
  }
  return normalized;
}

function normalizeRequiredEmployer(employer) {
  if (!employer || typeof employer !== 'object' || Array.isArray(employer)) {
    throw new JobsApiError(400, 'invalid_job_employer', 'employer is required');
  }
  const id = String(employer.id || '').trim();
  const name = String(employer.name || '').trim();
  if (!id) {
    throw new JobsApiError(400, 'invalid_job_employer', 'employer.id is required');
  }
  if (name.length < 2 || name.length > MAX_EMPLOYER_NAME_LENGTH) {
    throw new JobsApiError(
      400,
      'invalid_job_employer',
      `employer.name must be between 2 and ${MAX_EMPLOYER_NAME_LENGTH} characters`
    );
  }
  if (typeof employer.isVerifiedEmployer !== 'boolean') {
    throw new JobsApiError(400, 'invalid_job_employer', 'employer.isVerifiedEmployer must be boolean');
  }
  return {
    id,
    name,
    logoUrl: normalizeOptionalLogoUrl(employer.logoUrl),
    isVerifiedEmployer: employer.isVerifiedEmployer
  };
}

function normalizeOptionalEmployer(employer) {
  if (employer === undefined) {
    return undefined;
  }
  return normalizeRequiredEmployer(employer);
}

function makeUserJobKey(userId, jobId) {
  return `${userId}:${jobId}`;
}

function buildViewerState({ authenticated, saved }) {
  return {
    authenticated,
    saved,
    canApply: authenticated,
    applyCta: authenticated ? 'APPLY' : 'LOGIN_TO_APPLY'
  };
}

function toJobSummary(job, viewerState) {
  return {
    id: job.id,
    title: job.title,
    employmentType: job.employmentType,
    visaSponsorship: job.visaSponsorship,
    location: {
      countryCode: job.location.countryCode,
      city: job.location.city,
      displayLabel: job.location.displayLabel
    },
    employer: {
      id: job.employer.id,
      name: job.employer.name,
      logoUrl: job.employer.logoUrl,
      isVerifiedEmployer: job.employer.isVerifiedEmployer
    },
    lifecycle: toLifecycleState(job),
    viewerState
  };
}

function toJobDetail(job, viewerState) {
  return {
    job: {
      id: job.id,
      title: job.title,
      employmentType: job.employmentType,
      visaSponsorship: job.visaSponsorship,
      description: job.description,
      requirements: job.requirements,
      location: {
        countryCode: job.location.countryCode,
        city: job.location.city,
        displayLabel: job.location.displayLabel,
        latitude: job.location.latitude,
        longitude: job.location.longitude
      },
      employer: {
        id: job.employer.id,
        name: job.employer.name,
        logoUrl: job.employer.logoUrl,
        isVerifiedEmployer: job.employer.isVerifiedEmployer
      },
      lifecycle: toLifecycleState(job)
    },
    viewerState
  };
}

function toApplicationSummary(application, job) {
  return {
    id: application.id,
    jobId: application.jobId,
    status: application.status,
    note: application.note,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    job: {
      id: job.id,
      title: job.title,
      employmentType: job.employmentType,
      visaSponsorship: job.visaSponsorship,
      location: {
        countryCode: job.location.countryCode,
        city: job.location.city,
        displayLabel: job.location.displayLabel
      },
      employer: {
        id: job.employer.id,
        name: job.employer.name,
        logoUrl: job.employer.logoUrl,
        isVerifiedEmployer: job.employer.isVerifiedEmployer
      }
    }
  };
}

function toApplicationDocument(document) {
  return {
    id: document.id,
    applicationId: document.applicationId,
    userId: document.userId,
    documentType: document.documentType,
    fileName: document.fileName,
    contentType: document.contentType,
    contentLength: document.contentLength,
    checksumSha256: document.checksumSha256,
    reviewStatus: document.reviewStatus,
    reviewReason: document.reviewReason,
    reviewedAt: document.reviewedAt,
    reviewedBy: document.reviewedBy,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt
  };
}

function toAdminJob(job) {
  return {
    id: job.id,
    title: job.title,
    employmentType: job.employmentType,
    visaSponsorship: job.visaSponsorship,
    description: job.description,
    requirements: Array.from(job.requirements),
    location: {
      countryCode: job.location.countryCode,
      city: job.location.city,
      displayLabel: job.location.displayLabel,
      latitude: job.location.latitude,
      longitude: job.location.longitude
    },
    employer: {
      id: job.employer.id,
      name: job.employer.name,
      logoUrl: job.employer.logoUrl,
      isVerifiedEmployer: job.employer.isVerifiedEmployer
    },
    lifecycle: toLifecycleState(job)
  };
}

export class JobsService {
  constructor({ jobs = JOB_SEED_DATA, userDirectory = null, objectStorage = null } = {}) {
    this.jobs = Array.from(jobs).map((job) => ensureJobLifecycle(job));
    this.jobById = new Map(this.jobs.map((job) => [job.id, job]));
    this.savedByUserId = new Map();
    this.applicationsById = new Map();
    this.applicationIdsByUserId = new Map();
    this.applicationIdByUserJob = new Map();
    this.applicationDocumentsById = new Map();
    this.applicationDocumentIdsByApplicationId = new Map();
    this.userDirectory = userDirectory;
    this.objectStorage = objectStorage || createInMemoryObjectStorage();
  }

  getSavedMapForUser(userId) {
    if (!this.savedByUserId.has(userId)) {
      this.savedByUserId.set(userId, new Map());
    }
    return this.savedByUserId.get(userId);
  }

  isSavedByUser(userId, jobId) {
    if (!userId) return false;
    const savedMap = this.savedByUserId.get(userId);
    return Boolean(savedMap && savedMap.has(jobId));
  }

  getApplicationIdsForUser(userId) {
    if (!this.applicationIdsByUserId.has(userId)) {
      this.applicationIdsByUserId.set(userId, []);
    }
    return this.applicationIdsByUserId.get(userId);
  }

  getApplicationByIdOrThrow(applicationId) {
    const normalizedApplicationId = normalizeApplicationId(applicationId);
    const application = this.applicationsById.get(normalizedApplicationId);
    if (!application) {
      throw new JobsApiError(404, 'application_not_found', 'application not found');
    }
    return application;
  }

  getUserApplicationByIdOrThrow({ userId, applicationId }) {
    const application = this.getApplicationByIdOrThrow(applicationId);
    if (application.userId !== userId) {
      throw new JobsApiError(404, 'application_not_found', 'application not found');
    }
    return application;
  }

  getApplicationDocumentIds(applicationId) {
    if (!this.applicationDocumentIdsByApplicationId.has(applicationId)) {
      this.applicationDocumentIdsByApplicationId.set(applicationId, []);
    }
    return this.applicationDocumentIdsByApplicationId.get(applicationId);
  }

  async getApplicantById(userId) {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) {
      return null;
    }
    if (!this.userDirectory || typeof this.userDirectory.findUserById !== 'function') {
      return {
        id: normalizedUserId,
        fullName: null,
        email: null
      };
    }
    const user = await this.userDirectory.findUserById(normalizedUserId);
    if (!user) {
      return {
        id: normalizedUserId,
        fullName: null,
        email: null
      };
    }
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email
    };
  }

  getJobByIdOrThrow(jobId) {
    const normalizedJobId = String(jobId || '').trim();
    if (!normalizedJobId) {
      throw new JobsApiError(400, 'invalid_job_id', 'jobId is required');
    }

    const job = this.jobById.get(normalizedJobId);
    if (!job) {
      throw new JobsApiError(404, 'job_not_found', 'job not found');
    }
    return job;
  }

  listJobs({ q, employmentType, visaSponsored, location, cursor, limit, userId }) {
    const normalizedQuery = normalizeSearchQuery(q);
    const normalizedEmploymentType = normalizeEmploymentType(employmentType);
    const normalizedVisaSponsored = normalizeVisaSponsored(visaSponsored);
    const normalizedLocation = normalizeLocation(location);
    const normalizedCursor = normalizeCursor(cursor);
    const normalizedLimit = normalizeLimit(limit);

    const filtered = this.jobs.filter((job) => {
      if (!isJobPubliclyVisible(job)) {
        return false;
      }
      if (normalizedEmploymentType && job.employmentType !== normalizedEmploymentType) {
        return false;
      }
      if (normalizedVisaSponsored !== null && job.visaSponsorship !== normalizedVisaSponsored) {
        return false;
      }
      if (normalizedLocation && !job.location.displayLabel.toLowerCase().includes(normalizedLocation)) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const haystack = [
        job.title,
        job.description,
        job.employer.name,
        job.location.displayLabel
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    const paged = filtered.slice(normalizedCursor, normalizedCursor + normalizedLimit);
    const nextOffset = normalizedCursor + paged.length;
    const nextCursor = nextOffset < filtered.length ? String(nextOffset) : null;
    const authenticated = Boolean(userId);

    return {
      items: paged.map((job) =>
        toJobSummary(job, buildViewerState({ authenticated, saved: this.isSavedByUser(userId, job.id) }))
      ),
      pageInfo: {
        cursor: String(normalizedCursor),
        nextCursor,
        limit: normalizedLimit,
        total: filtered.length
      }
    };
  }

  getJobDetail({ jobId, userId }) {
    const job = this.getJobByIdOrThrow(jobId);
    if (!isJobPubliclyVisible(job)) {
      throw new JobsApiError(404, 'job_not_found', 'job not found');
    }

    return toJobDetail(
      job,
      buildViewerState({
        authenticated: Boolean(userId),
        saved: this.isSavedByUser(userId, job.id)
      })
    );
  }

  listSavedJobs({ userId, cursor, limit }) {
    const normalizedCursor = normalizeCursor(cursor);
    const normalizedLimit = normalizeLimit(limit);
    const savedMap = this.getSavedMapForUser(userId);
    const ids = Array.from(savedMap.entries())
      .sort((left, right) => right[1] - left[1])
      .map(([jobId]) => jobId)
      .filter((jobId) => this.jobById.has(jobId));

    const pagedIds = ids.slice(normalizedCursor, normalizedCursor + normalizedLimit);
    const nextOffset = normalizedCursor + pagedIds.length;
    const nextCursor = nextOffset < ids.length ? String(nextOffset) : null;

    return {
      items: pagedIds.map((jobId) =>
        toJobSummary(
          this.jobById.get(jobId),
          buildViewerState({
            authenticated: true,
            saved: true
          })
        )
      ),
      pageInfo: {
        cursor: String(normalizedCursor),
        nextCursor,
        limit: normalizedLimit,
        total: ids.length
      }
    };
  }

  saveJob({ userId, jobId }) {
    const job = this.getJobByIdOrThrow(jobId);
    if (!isJobPubliclyVisible(job)) {
      throw new JobsApiError(404, 'job_not_found', 'job not found');
    }

    const savedMap = this.getSavedMapForUser(userId);
    const isNew = !savedMap.has(job.id);
    if (isNew) {
      savedMap.set(job.id, Date.now());
    }

    return {
      saved: true,
      created: isNew,
      jobId: job.id
    };
  }

  unsaveJob({ userId, jobId }) {
    const job = this.getJobByIdOrThrow(jobId);

    const savedMap = this.getSavedMapForUser(userId);
    const removed = savedMap.delete(job.id);
    return {
      saved: false,
      removed,
      jobId: job.id
    };
  }

  applyToJob({ userId, jobId, note }) {
    const job = this.getJobByIdOrThrow(jobId);
    if (!isJobPubliclyVisible(job)) {
      throw new JobsApiError(404, 'job_not_found', 'job not found');
    }
    const normalizedNote = normalizeApplicationNote(note);
    const userJobKey = makeUserJobKey(userId, job.id);

    const existingId = this.applicationIdByUserJob.get(userJobKey);
    if (existingId) {
      const existing = this.applicationsById.get(existingId);
      return {
        created: false,
        application: toApplicationSummary(existing, job)
      };
    }

    const now = new Date().toISOString();
    const application = {
      id: randomUUID(),
      userId,
      jobId: job.id,
      status: 'SUBMITTED',
      note: normalizedNote,
      createdAt: now,
      updatedAt: now,
      journey: [
        {
          id: randomUUID(),
          status: 'SUBMITTED',
          title: 'Application submitted',
          description: normalizedNote || 'Application was submitted by candidate',
          actorType: 'USER',
          actorId: userId,
          createdAt: now
        }
      ]
    };

    this.applicationsById.set(application.id, application);
    this.applicationIdByUserJob.set(userJobKey, application.id);
    const userApplicationIds = this.getApplicationIdsForUser(userId);
    userApplicationIds.push(application.id);

    return {
      created: true,
      application: toApplicationSummary(application, job)
    };
  }

  listUserApplications({ userId, cursor, limit, status }) {
    const normalizedCursor = normalizeCursor(cursor);
    const normalizedLimit = normalizeLimit(limit);
    const normalizedStatus = normalizeApplicationStatus(status);
    const ids = this.getApplicationIdsForUser(userId)
      .map((applicationId) => this.applicationsById.get(applicationId))
      .filter(Boolean)
      .filter((application) => (normalizedStatus ? application.status === normalizedStatus : true))
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
      .map((application) => application.id);

    const pagedIds = ids.slice(normalizedCursor, normalizedCursor + normalizedLimit);
    const nextOffset = normalizedCursor + pagedIds.length;
    const nextCursor = nextOffset < ids.length ? String(nextOffset) : null;

    return {
      items: pagedIds.map((applicationId) => {
        const application = this.applicationsById.get(applicationId);
        return toApplicationSummary(application, this.getJobByIdOrThrow(application.jobId));
      }),
      pageInfo: {
        cursor: String(normalizedCursor),
        nextCursor,
        limit: normalizedLimit,
        total: ids.length
      }
    };
  }

  getApplicationJourney({ userId, applicationId }) {
    const application = this.getUserApplicationByIdOrThrow({ userId, applicationId });

    const job = this.getJobByIdOrThrow(application.jobId);
    return {
      application: toApplicationSummary(application, job),
      journey: Array.from(application.journey)
    };
  }

  async createUserApplicationDocumentUploadUrl({
    userId,
    applicationId,
    documentType,
    fileName,
    contentType,
    contentLength,
    checksumSha256
  }) {
    const application = this.getUserApplicationByIdOrThrow({ userId, applicationId });
    const normalizedDocumentType = normalizeApplicationDocumentType(documentType);
    const normalizedFileName = normalizeApplicationFileName(fileName);
    const normalizedContentType = normalizeApplicationContentType(contentType);
    const normalizedContentLength = normalizeApplicationContentLength(contentLength);
    const normalizedChecksumSha256 = normalizeApplicationChecksumSha256(checksumSha256);
    const objectKey = buildApplicationDocumentObjectKey({
      userId,
      applicationId: application.id,
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
      applicationId: application.id,
      upload: {
        objectKey,
        uploadUrl: upload.uploadUrl,
        method: upload.method || 'PUT',
        headers: upload.headers || {},
        expiresAt: upload.expiresAt
      }
    };
  }

  registerUserApplicationDocument({
    userId,
    applicationId,
    documentType,
    fileName,
    contentType,
    contentLength,
    objectKey,
    checksumSha256
  }) {
    const application = this.getUserApplicationByIdOrThrow({ userId, applicationId });
    const normalizedDocumentType = normalizeApplicationDocumentType(documentType);
    const normalizedFileName = normalizeApplicationFileName(fileName);
    const normalizedContentType = normalizeApplicationContentType(contentType);
    const normalizedContentLength = normalizeApplicationContentLength(contentLength);
    const normalizedObjectKey = normalizeApplicationObjectKey(objectKey);
    const normalizedChecksumSha256 = normalizeApplicationChecksumSha256(checksumSha256);
    assertApplicationObjectKeyOwnership({
      userId,
      applicationId: application.id,
      objectKey: normalizedObjectKey
    });

    const existingForApplication = this.getApplicationDocumentIds(application.id)
      .map((documentId) => this.applicationDocumentsById.get(documentId))
      .filter(Boolean);
    if (existingForApplication.some((document) => document.checksumSha256 === normalizedChecksumSha256)) {
      throw new JobsApiError(409, 'duplicate_application_document', 'document with same checksum already exists');
    }

    const now = new Date().toISOString();
    const document = {
      id: randomUUID(),
      applicationId: application.id,
      userId,
      documentType: normalizedDocumentType,
      fileName: normalizedFileName,
      contentType: normalizedContentType,
      contentLength: normalizedContentLength,
      objectKey: normalizedObjectKey,
      checksumSha256: normalizedChecksumSha256,
      reviewStatus: 'PENDING',
      reviewReason: null,
      reviewedAt: null,
      reviewedBy: null,
      createdAt: now,
      updatedAt: now
    };
    this.applicationDocumentsById.set(document.id, document);
    this.getApplicationDocumentIds(application.id).push(document.id);

    return {
      applicationId: application.id,
      document: toApplicationDocument(document)
    };
  }

  listUserApplicationDocuments({ userId, applicationId }) {
    const application = this.getUserApplicationByIdOrThrow({ userId, applicationId });
    const job = this.getJobByIdOrThrow(application.jobId);
    const documents = this.getApplicationDocumentIds(application.id)
      .map((documentId) => this.applicationDocumentsById.get(documentId))
      .filter(Boolean)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
    return {
      application: toApplicationSummary(application, job),
      items: documents.map((document) => toApplicationDocument(document)),
      total: documents.length
    };
  }

  async listAdminApplicationDocuments({ applicationId }) {
    const application = this.getApplicationByIdOrThrow(applicationId);
    const job = this.getJobByIdOrThrow(application.jobId);
    const applicant = await this.getApplicantById(application.userId);
    const documents = this.getApplicationDocumentIds(application.id)
      .map((documentId) => this.applicationDocumentsById.get(documentId))
      .filter(Boolean)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
    return {
      application: toApplicationSummary(application, job),
      applicant,
      items: documents.map((document) => toApplicationDocument(document)),
      total: documents.length
    };
  }

  async reviewAdminApplicationDocument({ applicationId, documentId, reviewStatus, reviewReason, reviewedBy }) {
    const application = this.getApplicationByIdOrThrow(applicationId);
    const normalizedDocumentId = normalizeApplicationDocumentId(documentId);
    const normalizedReviewStatus = normalizeApplicationDocumentReviewStatus(reviewStatus);
    const normalizedReviewReason = normalizeApplicationReviewReason(reviewReason);
    const normalizedReviewedBy = normalizeOptionalUpdatedBy(reviewedBy);
    const document = this.applicationDocumentsById.get(normalizedDocumentId);
    if (!document || document.applicationId !== application.id) {
      throw new JobsApiError(404, 'application_document_not_found', 'application document not found');
    }

    const changed =
      document.reviewStatus !== normalizedReviewStatus ||
      document.reviewReason !== normalizedReviewReason ||
      document.reviewedBy !== normalizedReviewedBy;
    if (changed) {
      document.reviewStatus = normalizedReviewStatus;
      document.reviewReason = normalizedReviewReason;
      document.reviewedBy = normalizedReviewedBy;
      document.reviewedAt = new Date().toISOString();
      document.updatedAt = document.reviewedAt;
    }

    const job = this.getJobByIdOrThrow(application.jobId);
    const applicant = await this.getApplicantById(application.userId);
    return {
      updated: changed,
      application: toApplicationSummary(application, job),
      applicant,
      document: toApplicationDocument(document)
    };
  }

  async issueAdminApplicationDocumentPreviewUrl({ documentId, expiresSec }) {
    const normalizedDocumentId = normalizeApplicationDocumentId(documentId);
    const normalizedExpiresSec = normalizeApplicationPreviewExpiresSec(expiresSec);
    const document = this.applicationDocumentsById.get(normalizedDocumentId);
    if (!document) {
      throw new JobsApiError(404, 'application_document_not_found', 'application document not found');
    }
    const preview = await this.objectStorage.createDownloadUrl({
      objectKey: document.objectKey,
      expiresSec: normalizedExpiresSec
    });
    return {
      documentId: document.id,
      applicationId: document.applicationId,
      url: preview.downloadUrl,
      method: preview.method || 'GET',
      expiresAt: preview.expiresAt
    };
  }

  decideOfferForUser({ userId, applicationId, decision, reason }) {
    const application = this.getUserApplicationByIdOrThrow({ userId, applicationId });
    if (application.status !== 'OFFERED') {
      throw new JobsApiError(
        409,
        'offer_not_available',
        'offer decision is only allowed when application status is OFFERED'
      );
    }

    const normalizedDecision = String(decision || '')
      .trim()
      .toUpperCase();
    if (!['ACCEPT', 'DECLINE'].includes(normalizedDecision)) {
      throw new JobsApiError(400, 'invalid_offer_decision', 'decision must be ACCEPT or DECLINE');
    }
    const normalizedReason = normalizeOptionalReason(reason);
    const now = new Date().toISOString();
    const nextStatus = normalizedDecision === 'ACCEPT' ? 'HIRED' : 'REJECTED';
    const journeyEvent = buildStatusJourneyEvent({
      status: nextStatus,
      reason: normalizedReason,
      updatedBy: userId,
      createdAt: now,
      actorType: 'USER',
      actorId: userId,
      title: normalizedDecision === 'ACCEPT' ? 'Candidate accepted offer' : 'Candidate declined offer',
      description:
        normalizedDecision === 'ACCEPT'
          ? normalizedReason
            ? `Candidate accepted offer. Reason: ${normalizedReason}`
            : 'Candidate accepted offer.'
          : normalizedReason
            ? `Candidate declined offer. Reason: ${normalizedReason}`
            : 'Candidate declined offer.'
    });

    application.status = nextStatus;
    application.updatedAt = now;
    application.journey.push(journeyEvent);

    const job = this.getJobByIdOrThrow(application.jobId);
    return {
      updated: true,
      decision: normalizedDecision,
      application: toApplicationSummary(application, job),
      journeyEvent
    };
  }

  acceptOfferForUser({ userId, applicationId, reason }) {
    return this.decideOfferForUser({
      userId,
      applicationId,
      decision: 'ACCEPT',
      reason
    });
  }

  declineOfferForUser({ userId, applicationId, reason }) {
    return this.decideOfferForUser({
      userId,
      applicationId,
      decision: 'DECLINE',
      reason
    });
  }

  async listAdminApplications({ cursor, limit, status, q, jobId, orgId }) {
    const normalizedCursor = normalizeCursor(cursor);
    const normalizedLimit = normalizeLimit(limit);
    const normalizedStatus = normalizeApplicationStatus(status);
    const normalizedQuery = normalizeSearchQuery(q);
    const normalizedJobId = jobId === undefined ? null : String(jobId || '').trim();
    const normalizedOrgId = orgId === undefined ? null : String(orgId || '').trim();
    if (normalizedJobId === '') {
      throw new JobsApiError(400, 'invalid_job_id', 'jobId must not be empty');
    }
    if (normalizedOrgId === '') {
      throw new JobsApiError(400, 'invalid_org_id', 'orgId must not be empty');
    }

    const enriched = await Promise.all(
      Array.from(this.applicationsById.values()).map(async (application) => {
        const job = this.getJobByIdOrThrow(application.jobId);
        const applicant = await this.getApplicantById(application.userId);
        return {
          application,
          job,
          applicant,
          lastEvent: application.journey[application.journey.length - 1] || null
        };
      })
    );

    const filtered = enriched
      .filter((item) => (normalizedStatus ? item.application.status === normalizedStatus : true))
      .filter((item) => (normalizedJobId ? item.application.jobId === normalizedJobId : true))
      .filter((item) => (normalizedOrgId ? item.job.employer.id === normalizedOrgId : true))
      .filter((item) => {
        if (!normalizedQuery) {
          return true;
        }
        const haystack = [
          item.job.title,
          item.job.employer.name,
          item.applicant?.fullName || '',
          item.applicant?.email || ''
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => Date.parse(right.application.updatedAt) - Date.parse(left.application.updatedAt));

    const paged = filtered.slice(normalizedCursor, normalizedCursor + normalizedLimit);
    const nextOffset = normalizedCursor + paged.length;
    const nextCursor = nextOffset < filtered.length ? String(nextOffset) : null;

    return {
      items: paged.map((item) => ({
        application: toApplicationSummary(item.application, item.job),
        applicant: item.applicant,
        lastEvent: item.lastEvent
      })),
      pageInfo: {
        cursor: String(normalizedCursor),
        nextCursor,
        limit: normalizedLimit,
        total: filtered.length
      }
    };
  }

  async getAdminApplication({ applicationId }) {
    const application = this.getApplicationByIdOrThrow(applicationId);
    const job = this.getJobByIdOrThrow(application.jobId);
    const applicant = await this.getApplicantById(application.userId);
    return {
      application: toApplicationSummary(application, job),
      applicant,
      lastEvent: application.journey[application.journey.length - 1] || null
    };
  }

  async getAdminApplicationJourney({ applicationId }) {
    const application = this.getApplicationByIdOrThrow(applicationId);
    const job = this.getJobByIdOrThrow(application.jobId);
    const applicant = await this.getApplicantById(application.userId);
    return {
      application: toApplicationSummary(application, job),
      applicant,
      journey: Array.from(application.journey)
    };
  }

  async updateAdminApplicationStatus({ applicationId, status, reason, updatedBy }) {
    const normalizedApplicationId = normalizeApplicationId(applicationId);
    const normalizedStatus = normalizeApplicationStatus(status);
    if (!normalizedStatus) {
      throw new JobsApiError(400, 'invalid_application_status', 'status is required');
    }
    const normalizedReason = normalizeOptionalReason(reason);
    const normalizedUpdatedBy = normalizeOptionalUpdatedBy(updatedBy);

    const application = this.getApplicationByIdOrThrow(normalizedApplicationId);
    if (
      application.status === 'OFFERED' &&
      (normalizedStatus === 'HIRED' || normalizedStatus === 'REJECTED')
    ) {
      throw new JobsApiError(
        409,
        'offer_decision_required',
        'candidate must accept or decline the offer before final status is set'
      );
    }
    const changed = ensureTransitionAllowed(application.status, normalizedStatus);
    let journeyEvent = null;
    if (changed) {
      const now = new Date().toISOString();
      application.status = normalizedStatus;
      application.updatedAt = now;
      journeyEvent = buildStatusJourneyEvent({
        status: normalizedStatus,
        reason: normalizedReason,
        updatedBy: normalizedUpdatedBy,
        createdAt: now,
        actorType: 'ADMIN',
        actorId: normalizedUpdatedBy
      });
      application.journey.push(journeyEvent);
    }

    const job = this.getJobByIdOrThrow(application.jobId);
    const applicant = await this.getApplicantById(application.userId);
    return {
      updated: changed,
      application: toApplicationSummary(application, job),
      applicant,
      journeyEvent
    };
  }

  async listAdminActivityEvents({ cursor, limit, actorId, from, to, toStatus } = {}) {
    const normalizedCursor = normalizeCursor(cursor);
    const normalizedLimit = normalizeLimit(limit);
    const normalizedActorId = String(actorId || '').trim() || null;
    const normalizedFrom = normalizeOptionalDateTime(from, 'from');
    const normalizedTo = normalizeOptionalDateTime(to, 'to');
    const normalizedToStatus = toStatus
      ? String(toStatus)
          .trim()
          .toUpperCase()
      : null;
    if (normalizedToStatus && !APPLICATION_STATUSES.has(normalizedToStatus)) {
      throw new JobsApiError(
        400,
        'invalid_application_status',
        `status must be one of ${Array.from(APPLICATION_STATUSES).join(', ')}`
      );
    }

    const flattened = [];
    for (const application of this.applicationsById.values()) {
      const applicant = await this.getApplicantById(application.userId);
      const job = this.getJobByIdOrThrow(application.jobId);
      for (let index = 0; index < application.journey.length; index += 1) {
        const event = application.journey[index];
        const previous = index > 0 ? application.journey[index - 1] : null;
        const resolvedActorId = event.actorId || application.userId;
        const resolvedActorType = event.actorType || (event.status === 'SUBMITTED' ? 'USER' : 'ADMIN');
        if (normalizedActorId && resolvedActorId !== normalizedActorId) {
          continue;
        }
        if (normalizedToStatus && event.status !== normalizedToStatus) {
          continue;
        }
        const createdAtTime = Date.parse(event.createdAt);
        if (normalizedFrom && createdAtTime < Date.parse(normalizedFrom)) {
          continue;
        }
        if (normalizedTo && createdAtTime > Date.parse(normalizedTo)) {
          continue;
        }
        flattened.push({
          id: event.id,
          type: 'APPLICATION',
          action: 'APPLICATION_STATUS_TRANSITION',
          entityType: 'JOB_APPLICATION',
          entityId: application.id,
          actorType: resolvedActorType,
          actorId: resolvedActorId,
          statusFrom: previous ? previous.status : null,
          statusTo: event.status,
          title: event.title,
          description: event.description,
          createdAt: event.createdAt,
          applicant,
          job: {
            id: job.id,
            title: job.title
          }
        });
      }
    }

    flattened.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
    const paged = flattened.slice(normalizedCursor, normalizedCursor + normalizedLimit);
    const nextOffset = normalizedCursor + paged.length;
    const nextCursor = nextOffset < flattened.length ? String(nextOffset) : null;

    return {
      items: paged,
      pageInfo: {
        cursor: String(normalizedCursor),
        nextCursor,
        limit: normalizedLimit,
        total: flattened.length
      }
    };
  }

  listAdminJobs({ q, cursor, limit }) {
    const normalizedQuery = normalizeSearchQuery(q);
    const normalizedCursor = normalizeCursor(cursor);
    const normalizedLimit = normalizeLimit(limit);

    const filtered = this.jobs.filter((job) => {
      if (!normalizedQuery) {
        return true;
      }
      const haystack = [
        job.title,
        job.description,
        job.employer.name,
        job.location.displayLabel
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    const paged = filtered.slice(normalizedCursor, normalizedCursor + normalizedLimit);
    const nextOffset = normalizedCursor + paged.length;
    const nextCursor = nextOffset < filtered.length ? String(nextOffset) : null;

    return {
      items: paged.map((job) => toAdminJob(job)),
      pageInfo: {
        cursor: String(normalizedCursor),
        nextCursor,
        limit: normalizedLimit,
        total: filtered.length
      }
    };
  }

  createJob({ title, employmentType, visaSponsorship, description, requirements, location, employer, lifecycle }) {
    if (lifecycle !== undefined && (typeof lifecycle !== 'object' || Array.isArray(lifecycle))) {
      throw new JobsApiError(400, 'invalid_lifecycle', 'lifecycle must be an object');
    }
    const lifecycleStatus = normalizeOptionalLifecycleStatus(lifecycle?.status, 'lifecycle.status') || 'PUBLISHED';
    let publishedAt = normalizeOptionalLifecycleDate(lifecycle?.publishedAt, 'lifecycle.publishedAt');
    let scheduledAt = normalizeOptionalLifecycleDate(lifecycle?.scheduledAt, 'lifecycle.scheduledAt');
    if (lifecycleStatus === 'PUBLISHED') {
      publishedAt = publishedAt || new Date().toISOString();
      scheduledAt = null;
    } else if (lifecycleStatus === 'DRAFT') {
      publishedAt = null;
      scheduledAt = null;
    } else {
      if (!scheduledAt) {
        throw new JobsApiError(
          400,
          'invalid_lifecycle_date',
          'lifecycle.scheduledAt is required when lifecycle.status is SCHEDULED'
        );
      }
      publishedAt = null;
    }

    const job = {
      id: randomUUID(),
      title: normalizeRequiredTitle(title),
      employmentType: normalizeRequiredEmploymentType(employmentType),
      visaSponsorship: normalizeRequiredVisaSponsorship(visaSponsorship),
      description: normalizeRequiredDescription(description),
      requirements: normalizeRequiredRequirements(requirements),
      location: normalizeRequiredLocation(location),
      employer: normalizeRequiredEmployer(employer),
      lifecycleStatus,
      publishedAt,
      scheduledAt
    };

    this.jobs.push(job);
    this.jobById.set(job.id, job);
    return { job: toAdminJob(job) };
  }

  updateJob({
    jobId,
    title,
    employmentType,
    visaSponsorship,
    description,
    requirements,
    location,
    employer,
    lifecycle
  }) {
    const job = this.getJobByIdOrThrow(jobId);
    if (lifecycle !== undefined && (typeof lifecycle !== 'object' || Array.isArray(lifecycle))) {
      throw new JobsApiError(400, 'invalid_lifecycle', 'lifecycle must be an object');
    }
    const patch = {
      title: title === undefined ? undefined : normalizeRequiredTitle(title),
      employmentType: normalizeOptionalEmploymentType(employmentType),
      visaSponsorship: normalizeOptionalVisaSponsorship(visaSponsorship),
      description: normalizeOptionalDescription(description),
      requirements: normalizeOptionalRequirements(requirements),
      location: normalizeOptionalLocation(location),
      employer: normalizeOptionalEmployer(employer),
      lifecycleStatus: normalizeOptionalLifecycleStatus(lifecycle?.status, 'lifecycle.status'),
      publishedAt: normalizeOptionalLifecycleDate(lifecycle?.publishedAt, 'lifecycle.publishedAt'),
      scheduledAt: normalizeOptionalLifecycleDate(lifecycle?.scheduledAt, 'lifecycle.scheduledAt')
    };

    if (title !== undefined) {
      job.title = patch.title;
    }
    if (patch.employmentType !== undefined) {
      job.employmentType = patch.employmentType;
    }
    if (patch.visaSponsorship !== undefined) {
      job.visaSponsorship = patch.visaSponsorship;
    }
    if (patch.description !== undefined) {
      job.description = patch.description;
    }
    if (patch.requirements !== undefined) {
      job.requirements = patch.requirements;
    }
    if (patch.location !== undefined) {
      job.location = patch.location;
    }
    if (patch.employer !== undefined) {
      job.employer = patch.employer;
    }
    if (lifecycle !== undefined) {
      let nextStatus = patch.lifecycleStatus === undefined ? job.lifecycleStatus : patch.lifecycleStatus;
      let nextPublishedAt = patch.publishedAt === undefined ? job.publishedAt : patch.publishedAt;
      let nextScheduledAt = patch.scheduledAt === undefined ? job.scheduledAt : patch.scheduledAt;

      if (nextStatus === 'PUBLISHED') {
        nextPublishedAt = nextPublishedAt || new Date().toISOString();
        nextScheduledAt = null;
      } else if (nextStatus === 'DRAFT') {
        nextPublishedAt = null;
        nextScheduledAt = null;
      } else {
        if (!nextScheduledAt) {
          throw new JobsApiError(
            400,
            'invalid_lifecycle_date',
            'lifecycle.scheduledAt is required when lifecycle.status is SCHEDULED'
          );
        }
        nextPublishedAt = null;
      }

      job.lifecycleStatus = nextStatus;
      job.publishedAt = nextPublishedAt;
      job.scheduledAt = nextScheduledAt;
    }

    return { job: toAdminJob(job) };
  }

  publishJob({ jobId, publishedAt }) {
    const job = this.getJobByIdOrThrow(jobId);
    const normalizedPublishedAt = normalizeOptionalLifecycleDate(publishedAt, 'publishedAt');
    job.lifecycleStatus = 'PUBLISHED';
    job.publishedAt = normalizedPublishedAt || new Date().toISOString();
    job.scheduledAt = null;
    return { job: toAdminJob(job) };
  }

  unpublishJob({ jobId }) {
    const job = this.getJobByIdOrThrow(jobId);
    job.lifecycleStatus = 'DRAFT';
    job.publishedAt = null;
    job.scheduledAt = null;
    return { job: toAdminJob(job) };
  }

  scheduleJob({ jobId, scheduledAt }) {
    const job = this.getJobByIdOrThrow(jobId);
    const normalizedScheduledAt = normalizeRequiredLifecycleDate(scheduledAt, 'scheduledAt');
    job.lifecycleStatus = 'SCHEDULED';
    job.publishedAt = null;
    job.scheduledAt = normalizedScheduledAt;
    return { job: toAdminJob(job) };
  }

  async bulkUpdateJobs({ action, jobIds, scheduledAt, publishedAt }) {
    const normalizedAction = normalizeBulkAction(action);
    const normalizedJobIds = normalizeBulkJobIds(jobIds);
    const results = [];

    for (const jobId of normalizedJobIds) {
      try {
        if (normalizedAction === 'PUBLISH') {
          const result = this.publishJob({ jobId, publishedAt });
          results.push({ jobId, success: true, lifecycle: result.job.lifecycle });
          continue;
        }
        if (normalizedAction === 'UNPUBLISH') {
          const result = this.unpublishJob({ jobId });
          results.push({ jobId, success: true, lifecycle: result.job.lifecycle });
          continue;
        }
        if (normalizedAction === 'SCHEDULE') {
          const result = this.scheduleJob({ jobId, scheduledAt });
          results.push({ jobId, success: true, lifecycle: result.job.lifecycle });
          continue;
        }
        const result = this.deleteJob({ jobId });
        results.push({ jobId, success: true, removed: result.removed });
      } catch (error) {
        if (isJobsApiError(error)) {
          results.push({
            jobId,
            success: false,
            error: {
              code: error.code,
              message: error.message
            }
          });
          continue;
        }
        throw error;
      }
    }

    const successCount = results.filter((item) => item.success).length;
    return {
      action: normalizedAction,
      total: normalizedJobIds.length,
      successCount,
      failureCount: normalizedJobIds.length - successCount,
      results
    };
  }

  deleteJob({ jobId }) {
    const job = this.getJobByIdOrThrow(jobId);
    this.jobById.delete(job.id);
    this.jobs = this.jobs.filter((item) => item.id !== job.id);

    for (const savedMap of this.savedByUserId.values()) {
      savedMap.delete(job.id);
    }

    const toDeleteApplicationIds = [];
    for (const application of this.applicationsById.values()) {
      if (application.jobId === job.id) {
        toDeleteApplicationIds.push(application.id);
      }
    }

    for (const applicationId of toDeleteApplicationIds) {
      const application = this.applicationsById.get(applicationId);
      if (!application) {
        continue;
      }
      const documentIds = this.getApplicationDocumentIds(application.id);
      for (const documentId of documentIds) {
        this.applicationDocumentsById.delete(documentId);
      }
      this.applicationDocumentIdsByApplicationId.delete(application.id);
      const userJobKey = makeUserJobKey(application.userId, application.jobId);
      this.applicationIdByUserJob.delete(userJobKey);
      this.applicationsById.delete(applicationId);
      const userApplications = this.applicationIdsByUserId.get(application.userId) || [];
      this.applicationIdsByUserId.set(
        application.userId,
        userApplications.filter((id) => id !== applicationId)
      );
    }

    return {
      removed: true,
      jobId: job.id
    };
  }
}

export function createJobsService(options = {}) {
  return new JobsService(options);
}

export function isJobsApiError(error) {
  return error instanceof JobsApiError;
}
