import { randomUUID } from 'node:crypto';
import { JOB_SEED_DATA, JobsApiError, createJobsService } from './service.js';
import { createInMemoryObjectStorage } from '../identity/object-storage.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_BULK_ITEMS = 100;
const EMPLOYMENT_TYPES = new Set(['FULL_TIME', 'PART_TIME', 'CONTRACT']);
const JOB_LIFECYCLE_STATUSES = new Set(['DRAFT', 'PUBLISHED', 'SCHEDULED']);
const JOB_BULK_ACTIONS = new Set(['PUBLISH', 'UNPUBLISH', 'SCHEDULE', 'DELETE']);
const APPLICATION_STATUSES = new Set(['SUBMITTED', 'IN_REVIEW', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED']);
const APPLICATION_DOCUMENT_REVIEW_STATUSES = new Set(['PENDING', 'VALID', 'INVALID']);
const APPLICATION_STATUS_TRANSITIONS = {
  SUBMITTED: new Set(['IN_REVIEW', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED']),
  IN_REVIEW: new Set(['INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED']),
  INTERVIEW: new Set(['OFFERED', 'HIRED', 'REJECTED']),
  OFFERED: new Set(),
  HIRED: new Set(),
  REJECTED: new Set()
};
const MAX_APPLICATION_DOCUMENT_TYPE_LENGTH = 64;
const MAX_APPLICATION_FILE_NAME_LENGTH = 180;
const MAX_APPLICATION_OBJECT_KEY_LENGTH = 1024;
const MAX_APPLICATION_REVIEW_REASON_LENGTH = 500;
const DEFAULT_APPLICATION_ALLOWED_CONTENT_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const DEFAULT_APPLICATION_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const APPLICATION_PREVIEW_DEFAULT_EXPIRES_SEC = 120;
const APPLICATION_PREVIEW_MAX_EXPIRES_SEC = 900;
const APPLICATION_STATUS_EVENT_TITLES = {
  SUBMITTED: 'Application submitted',
  IN_REVIEW: 'Application in review',
  INTERVIEW: 'Interview stage',
  OFFERED: 'Offer stage',
  HIRED: 'Candidate hired',
  REJECTED: 'Application rejected'
};

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
  if (!Number.isFinite(normalized) || normalized < 60 || normalized > APPLICATION_PREVIEW_MAX_EXPIRES_SEC) {
    throw new JobsApiError(
      400,
      'invalid_expires_sec',
      `expiresSec must be between 60 and ${APPLICATION_PREVIEW_MAX_EXPIRES_SEC}`
    );
  }
  return Math.floor(normalized);
}

function normalizeJourneyActorType(actorType) {
  const normalized = String(actorType || '')
    .trim()
    .toUpperCase();
  if (!['USER', 'ADMIN', 'SYSTEM'].includes(normalized)) {
    throw new JobsApiError(400, 'invalid_actor_type', 'actorType must be USER, ADMIN, or SYSTEM');
  }
  return normalized;
}

function normalizeJourneyActorId(actorId) {
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

function normalizeJobId(jobId) {
  const normalized = String(jobId || '').trim();
  if (!normalized) {
    throw new JobsApiError(400, 'invalid_job_id', 'jobId is required');
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
    actorType: normalizeJourneyActorType(actorType),
    actorId: normalizeJourneyActorId(actorId),
    createdAt
  };
}

function mapJobRow(row) {
  if (!row) return null;
  const lifecycleStatus = String(row.lifecycle_status || 'PUBLISHED')
    .trim()
    .toUpperCase();
  const normalizedLifecycleStatus = JOB_LIFECYCLE_STATUSES.has(lifecycleStatus) ? lifecycleStatus : 'PUBLISHED';
  const publishedAt = row.published_at ? new Date(row.published_at).toISOString() : null;
  const scheduledAt = row.scheduled_publish_at ? new Date(row.scheduled_publish_at).toISOString() : null;
  return {
    id: row.id,
    title: row.title,
    employmentType: row.employment_type,
    visaSponsorship: Boolean(row.visa_sponsorship),
    description: row.description,
    requirements: Array.isArray(row.requirements_json) ? row.requirements_json : [],
    location: row.location_json || {},
    employer: row.employer_json || {},
    lifecycleStatus: normalizedLifecycleStatus,
    publishedAt,
    scheduledAt
  };
}

function mapApplicationRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    jobId: row.job_id,
    status: row.status,
    note: row.note,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function mapJourneyRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    title: row.title,
    description: row.description,
    actorType: row.actor_type || null,
    actorId: row.actor_id || null,
    createdAt: new Date(row.created_at).toISOString()
  };
}

function mapApplicationDocumentRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    applicationId: row.application_id,
    userId: row.user_id,
    documentType: row.document_type,
    fileName: row.file_name,
    contentType: row.content_type,
    contentLength: Number(row.content_length),
    objectKey: row.object_key,
    checksumSha256: row.checksum_sha256,
    reviewStatus: row.review_status,
    reviewReason: row.review_reason,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function mapApplicantRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email
  };
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
    requirements: Array.from(job.requirements || []),
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

async function upsertJobToDb(pool, job) {
  await pool.query(
    `
      INSERT INTO jobs (
        id,
        title,
        employment_type,
        visa_sponsorship,
        description,
        requirements_json,
        location_json,
        employer_json,
        lifecycle_status,
        published_at,
        scheduled_publish_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10::timestamptz, $11::timestamptz)
      ON CONFLICT (id)
      DO UPDATE SET
        title = EXCLUDED.title,
        employment_type = EXCLUDED.employment_type,
        visa_sponsorship = EXCLUDED.visa_sponsorship,
        description = EXCLUDED.description,
        requirements_json = EXCLUDED.requirements_json,
        location_json = EXCLUDED.location_json,
        employer_json = EXCLUDED.employer_json,
        lifecycle_status = EXCLUDED.lifecycle_status,
        published_at = EXCLUDED.published_at,
        scheduled_publish_at = EXCLUDED.scheduled_publish_at,
        updated_at = NOW()
    `,
    [
      job.id,
      job.title,
      job.employmentType,
      job.visaSponsorship,
      job.description,
      JSON.stringify(Array.isArray(job.requirements) ? job.requirements : []),
      JSON.stringify(job.location || {}),
      JSON.stringify(job.employer || {}),
      JOB_LIFECYCLE_STATUSES.has(String(job.lifecycleStatus || '').toUpperCase())
        ? String(job.lifecycleStatus).toUpperCase()
        : 'PUBLISHED',
      job.publishedAt || null,
      job.scheduledAt || null
    ]
  );
}

async function seedJobsIfEmpty(pool) {
  const countResult = await pool.query('SELECT COUNT(*)::int AS count FROM jobs');
  const count = Number(countResult.rows[0]?.count || 0);
  if (count > 0) {
    return;
  }

  for (const job of JOB_SEED_DATA) {
    await upsertJobToDb(pool, job);
  }
}

async function withTransaction(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export class PostgresJobsService {
  constructor({ pool, objectStorage = null }) {
    this.pool = pool;
    this.objectStorage = objectStorage || createInMemoryObjectStorage();
    this.adminCreateValidator = createJobsService({ jobs: [], objectStorage: this.objectStorage });
  }

  async getJobByIdOrThrow(jobId, { queryable = this.pool, lockClause = '' } = {}) {
    const normalizedJobId = normalizeJobId(jobId);
    const normalizedLockClause = String(lockClause || '').trim();
    const result = await queryable.query(
      `
        SELECT
          id,
          title,
          employment_type,
          visa_sponsorship,
          description,
          requirements_json,
          location_json,
          employer_json,
          lifecycle_status,
          published_at,
          scheduled_publish_at
        FROM jobs
        WHERE id = $1
        LIMIT 1
        ${normalizedLockClause}
      `,
      [normalizedJobId]
    );
    const job = mapJobRow(result.rows[0]);
    if (!job) {
      throw new JobsApiError(404, 'job_not_found', 'job not found');
    }
    return job;
  }

  async getApplicationByIdOrThrow(applicationId, { queryable = this.pool, lockClause = '' } = {}) {
    const normalizedApplicationId = normalizeApplicationId(applicationId);
    const normalizedLockClause = String(lockClause || '').trim();
    const result = await queryable.query(
      `
        SELECT id, user_id, job_id, status, note, created_at, updated_at
        FROM job_applications
        WHERE id = $1
        LIMIT 1
        ${normalizedLockClause}
      `,
      [normalizedApplicationId]
    );
    const application = mapApplicationRow(result.rows[0]);
    if (!application) {
      throw new JobsApiError(404, 'application_not_found', 'application not found');
    }
    return application;
  }

  async getUserApplicationByIdOrThrow({ userId, applicationId, queryable = this.pool, lockClause = '' } = {}) {
    const application = await this.getApplicationByIdOrThrow(applicationId, {
      queryable,
      lockClause
    });
    if (application.userId !== userId) {
      throw new JobsApiError(404, 'application_not_found', 'application not found');
    }
    return application;
  }

  async listJobs({ q, employmentType, visaSponsored, location, cursor, limit, userId }) {
    const normalizedQuery = normalizeSearchQuery(q);
    const normalizedEmploymentType = normalizeEmploymentType(employmentType);
    const normalizedVisaSponsored = normalizeVisaSponsored(visaSponsored);
    const normalizedLocation = normalizeLocation(location);
    const normalizedCursor = normalizeCursor(cursor);
    const normalizedLimit = normalizeLimit(limit);
    const authenticated = Boolean(userId);

    const whereParts = [
      `(lifecycle_status = 'PUBLISHED' OR (lifecycle_status = 'SCHEDULED' AND scheduled_publish_at IS NOT NULL AND scheduled_publish_at <= NOW()))`
    ];
    const params = [];
    if (normalizedEmploymentType) {
      params.push(normalizedEmploymentType);
      whereParts.push(`employment_type = $${params.length}`);
    }
    if (normalizedVisaSponsored !== null) {
      params.push(normalizedVisaSponsored);
      whereParts.push(`visa_sponsorship = $${params.length}`);
    }
    if (normalizedLocation) {
      params.push(`%${normalizedLocation}%`);
      whereParts.push(`LOWER(COALESCE(location_json->>'displayLabel', '')) LIKE $${params.length}`);
    }
    if (normalizedQuery) {
      params.push(`%${normalizedQuery}%`);
      whereParts.push(`
        LOWER(
          CONCAT_WS(
            ' ',
            title,
            description,
            COALESCE(employer_json->>'name', ''),
            COALESCE(location_json->>'displayLabel', '')
          )
        ) LIKE $${params.length}
      `);
    }
    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    const countResult = await this.pool.query(
      `
        SELECT COUNT(*)::int AS count
        FROM jobs
        ${whereClause}
      `,
      params
    );
    const total = Number(countResult.rows[0]?.count || 0);

    const listParams = [...params, normalizedLimit, normalizedCursor];
    const listResult = await this.pool.query(
      `
        SELECT
          id,
          title,
          employment_type,
          visa_sponsorship,
          description,
          requirements_json,
          location_json,
          employer_json,
          lifecycle_status,
          published_at,
          scheduled_publish_at
        FROM jobs
        ${whereClause}
        ORDER BY created_at ASC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
      `,
      listParams
    );

    const jobs = listResult.rows.map((row) => mapJobRow(row));
    const nextOffset = normalizedCursor + jobs.length;
    const nextCursor = nextOffset < total ? String(nextOffset) : null;

    let savedJobIds = new Set();
    if (authenticated && jobs.length > 0) {
      const ids = jobs.map((job) => job.id);
      const savedResult = await this.pool.query(
        `
          SELECT job_id
          FROM user_saved_jobs
          WHERE user_id = $1 AND job_id = ANY($2::text[])
        `,
        [userId, ids]
      );
      savedJobIds = new Set(savedResult.rows.map((row) => row.job_id));
    }

    return {
      items: jobs.map((job) =>
        toJobSummary(
          job,
          buildViewerState({
            authenticated,
            saved: authenticated && savedJobIds.has(job.id)
          })
        )
      ),
      pageInfo: {
        cursor: String(normalizedCursor),
        nextCursor,
        limit: normalizedLimit,
        total
      }
    };
  }

  async getJobDetail({ jobId, userId }) {
    const job = await this.getJobByIdOrThrow(jobId);
    if (!isJobPubliclyVisible(job)) {
      throw new JobsApiError(404, 'job_not_found', 'job not found');
    }
    const authenticated = Boolean(userId);
    let saved = false;

    if (authenticated) {
      const savedResult = await this.pool.query(
        `
          SELECT 1
          FROM user_saved_jobs
          WHERE user_id = $1 AND job_id = $2
          LIMIT 1
        `,
        [userId, job.id]
      );
      saved = savedResult.rowCount > 0;
    }

    return toJobDetail(job, buildViewerState({ authenticated, saved }));
  }

  async listSavedJobs({ userId, cursor, limit }) {
    const normalizedCursor = normalizeCursor(cursor);
    const normalizedLimit = normalizeLimit(limit);

    const countResult = await this.pool.query(
      `
        SELECT COUNT(*)::int AS count
        FROM user_saved_jobs usj
        JOIN jobs j ON j.id = usj.job_id
        WHERE usj.user_id = $1
      `,
      [userId]
    );
    const total = Number(countResult.rows[0]?.count || 0);

    const listResult = await this.pool.query(
      `
        SELECT
          j.id,
          j.title,
          j.employment_type,
          j.visa_sponsorship,
          j.description,
          j.requirements_json,
          j.location_json,
          j.employer_json,
          j.lifecycle_status,
          j.published_at,
          j.scheduled_publish_at
        FROM user_saved_jobs usj
        JOIN jobs j ON j.id = usj.job_id
        WHERE usj.user_id = $1
        ORDER BY usj.created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [userId, normalizedLimit, normalizedCursor]
    );

    const jobs = listResult.rows.map((row) => mapJobRow(row));
    const nextOffset = normalizedCursor + jobs.length;
    const nextCursor = nextOffset < total ? String(nextOffset) : null;

    return {
      items: jobs.map((job) =>
        toJobSummary(
          job,
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
        total
      }
    };
  }

  async saveJob({ userId, jobId }) {
    return withTransaction(this.pool, async (client) => {
      const job = await this.getJobByIdOrThrow(jobId, {
        queryable: client,
        lockClause: 'FOR UPDATE'
      });
      if (!isJobPubliclyVisible(job)) {
        throw new JobsApiError(404, 'job_not_found', 'job not found');
      }
      const result = await client.query(
        `
          INSERT INTO user_saved_jobs (id, user_id, job_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, job_id) DO NOTHING
        `,
        [randomUUID(), userId, job.id]
      );

      return {
        saved: true,
        created: result.rowCount > 0,
        jobId: job.id
      };
    });
  }

  async unsaveJob({ userId, jobId }) {
    const job = await this.getJobByIdOrThrow(jobId);
    const result = await this.pool.query(
      `
        DELETE FROM user_saved_jobs
        WHERE user_id = $1 AND job_id = $2
      `,
      [userId, job.id]
    );
    return {
      saved: false,
      removed: result.rowCount > 0,
      jobId: job.id
    };
  }

  async applyToJob({ userId, jobId, note }) {
    const normalizedNote = normalizeApplicationNote(note);
    return withTransaction(this.pool, async (client) => {
      const job = await this.getJobByIdOrThrow(jobId, {
        queryable: client,
        lockClause: 'FOR UPDATE'
      });
      if (!isJobPubliclyVisible(job)) {
        throw new JobsApiError(404, 'job_not_found', 'job not found');
      }
      const now = new Date().toISOString();

      const insertResult = await client.query(
        `
          INSERT INTO job_applications (id, user_id, job_id, status, note, created_at, updated_at)
          VALUES ($1, $2, $3, 'SUBMITTED', $4, $5::timestamptz, $6::timestamptz)
          ON CONFLICT (user_id, job_id) DO NOTHING
          RETURNING id, user_id, job_id, status, note, created_at, updated_at
        `,
        [randomUUID(), userId, job.id, normalizedNote, now, now]
      );

      if (insertResult.rowCount > 0) {
        const application = mapApplicationRow(insertResult.rows[0]);
        const event = {
          id: randomUUID(),
          status: 'SUBMITTED',
          title: 'Application submitted',
          description: normalizedNote || 'Application was submitted by candidate',
          actorType: 'USER',
          actorId: userId,
          createdAt: now
        };
        await client.query(
          `
            INSERT INTO job_application_journey_events (
              id,
              application_id,
              status,
              title,
              description,
              actor_type,
              actor_id,
              created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz)
          `,
          [
            event.id,
            application.id,
            event.status,
            event.title,
            event.description,
            event.actorType,
            event.actorId,
            event.createdAt
          ]
        );

        return {
          created: true,
          application: toApplicationSummary(application, job)
        };
      }

      const existingResult = await client.query(
        `
          SELECT id, user_id, job_id, status, note, created_at, updated_at
          FROM job_applications
          WHERE user_id = $1 AND job_id = $2
          LIMIT 1
        `,
        [userId, job.id]
      );
      const existing = mapApplicationRow(existingResult.rows[0]);
      return {
        created: false,
        application: toApplicationSummary(existing, job)
      };
    });
  }

  async listUserApplications({ userId, cursor, limit, status }) {
    const normalizedCursor = normalizeCursor(cursor);
    const normalizedLimit = normalizeLimit(limit);
    const normalizedStatus = normalizeApplicationStatus(status);

    const countParams = [userId];
    let statusClause = '';
    if (normalizedStatus) {
      countParams.push(normalizedStatus);
      statusClause = `AND status = $${countParams.length}`;
    }

    const countResult = await this.pool.query(
      `
        SELECT COUNT(*)::int AS count
        FROM job_applications
        WHERE user_id = $1
        ${statusClause}
      `,
      countParams
    );
    const total = Number(countResult.rows[0]?.count || 0);

    const listParams = [userId];
    if (normalizedStatus) {
      listParams.push(normalizedStatus);
    }
    listParams.push(normalizedLimit, normalizedCursor);
    const limitParam = listParams.length - 1;
    const cursorParam = listParams.length;
    const listResult = await this.pool.query(
      `
        SELECT id, user_id, job_id, status, note, created_at, updated_at
        FROM job_applications
        WHERE user_id = $1
        ${normalizedStatus ? `AND status = $2` : ''}
        ORDER BY updated_at DESC
        LIMIT $${limitParam}
        OFFSET $${cursorParam}
      `,
      listParams
    );

    const applications = listResult.rows.map((row) => mapApplicationRow(row));
    const nextOffset = normalizedCursor + applications.length;
    const nextCursor = nextOffset < total ? String(nextOffset) : null;

    const jobIds = Array.from(new Set(applications.map((application) => application.jobId)));
    const jobsById = new Map();
    if (jobIds.length > 0) {
      const jobsResult = await this.pool.query(
        `
          SELECT
            id,
            title,
            employment_type,
            visa_sponsorship,
            description,
            requirements_json,
            location_json,
            employer_json,
            lifecycle_status,
            published_at,
            scheduled_publish_at
          FROM jobs
          WHERE id = ANY($1::text[])
        `,
        [jobIds]
      );
      for (const row of jobsResult.rows) {
        const job = mapJobRow(row);
        jobsById.set(job.id, job);
      }
    }

    return {
      items: applications
        .map((application) => {
          const job = jobsById.get(application.jobId);
          return job ? toApplicationSummary(application, job) : null;
        })
        .filter(Boolean),
      pageInfo: {
        cursor: String(normalizedCursor),
        nextCursor,
        limit: normalizedLimit,
        total
      }
    };
  }

  async getApplicationJourney({ userId, applicationId }) {
    const application = await this.getUserApplicationByIdOrThrow({ userId, applicationId });

    const job = await this.getJobByIdOrThrow(application.jobId);
    const journeyResult = await this.pool.query(
      `
        SELECT id, status, title, description, actor_type, actor_id, created_at
        FROM job_application_journey_events
        WHERE application_id = $1
        ORDER BY created_at ASC
      `,
      [application.id]
    );

    return {
      application: toApplicationSummary(application, job),
      journey: journeyResult.rows.map((row) => mapJourneyRow(row))
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
    const application = await this.getUserApplicationByIdOrThrow({ userId, applicationId });
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

  async registerUserApplicationDocument({
    userId,
    applicationId,
    documentType,
    fileName,
    contentType,
    contentLength,
    objectKey,
    checksumSha256
  }) {
    return withTransaction(this.pool, async (client) => {
      const application = await this.getUserApplicationByIdOrThrow({
        userId,
        applicationId,
        queryable: client,
        lockClause: 'FOR UPDATE'
      });
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

      let inserted;
      try {
        const insertResult = await client.query(
          `
            INSERT INTO job_application_documents (
              id,
              application_id,
              user_id,
              document_type,
              file_name,
              content_type,
              content_length,
              object_key,
              checksum_sha256,
              file_url,
              review_status,
              review_reason,
              reviewed_by,
              reviewed_at,
              created_at,
              updated_at
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9,
              $10,
              'PENDING',
              NULL,
              NULL,
              NULL,
              NOW(),
              NOW()
            )
            RETURNING
              id,
              application_id,
              user_id,
              document_type,
              file_name,
              content_type,
              content_length,
              object_key,
              checksum_sha256,
              review_status,
              review_reason,
              reviewed_by,
              reviewed_at,
              created_at,
              updated_at
          `,
          [
            randomUUID(),
            application.id,
            userId,
            normalizedDocumentType,
            normalizedFileName,
            normalizedContentType,
            normalizedContentLength,
            normalizedObjectKey,
            normalizedChecksumSha256,
            this.objectStorage.toFileUrl(normalizedObjectKey)
          ]
        );
        inserted = mapApplicationDocumentRow(insertResult.rows[0]);
      } catch (error) {
        if (String(error?.code || '') === '23505') {
          throw new JobsApiError(409, 'duplicate_application_document', 'document with same checksum already exists');
        }
        throw error;
      }

      return {
        applicationId: application.id,
        document: toApplicationDocument(inserted)
      };
    });
  }

  async listUserApplicationDocuments({ userId, applicationId }) {
    const application = await this.getUserApplicationByIdOrThrow({ userId, applicationId });
    const [job, documentsResult] = await Promise.all([
      this.getJobByIdOrThrow(application.jobId),
      this.pool.query(
        `
          SELECT
            id,
            application_id,
            user_id,
            document_type,
            file_name,
            content_type,
            content_length,
            object_key,
            checksum_sha256,
            review_status,
            review_reason,
            reviewed_by,
            reviewed_at,
            created_at,
            updated_at
          FROM job_application_documents
          WHERE application_id = $1
          ORDER BY created_at DESC
        `,
        [application.id]
      )
    ]);
    const items = documentsResult.rows.map((row) => toApplicationDocument(mapApplicationDocumentRow(row)));
    return {
      application: toApplicationSummary(application, job),
      items,
      total: items.length
    };
  }

  async listAdminApplicationDocuments({ applicationId }) {
    const application = await this.getApplicationByIdOrThrow(applicationId);
    const [job, applicant, documentsResult] = await Promise.all([
      this.getJobByIdOrThrow(application.jobId),
      this.getApplicantById(application.userId),
      this.pool.query(
        `
          SELECT
            id,
            application_id,
            user_id,
            document_type,
            file_name,
            content_type,
            content_length,
            object_key,
            checksum_sha256,
            review_status,
            review_reason,
            reviewed_by,
            reviewed_at,
            created_at,
            updated_at
          FROM job_application_documents
          WHERE application_id = $1
          ORDER BY created_at DESC
        `,
        [application.id]
      )
    ]);
    const items = documentsResult.rows.map((row) => toApplicationDocument(mapApplicationDocumentRow(row)));
    return {
      application: toApplicationSummary(application, job),
      applicant,
      items,
      total: items.length
    };
  }

  async reviewAdminApplicationDocument({ applicationId, documentId, reviewStatus, reviewReason, reviewedBy }) {
    const normalizedDocumentId = normalizeApplicationDocumentId(documentId);
    const normalizedReviewStatus = normalizeApplicationDocumentReviewStatus(reviewStatus);
    const normalizedReviewReason = normalizeApplicationReviewReason(reviewReason);
    const normalizedReviewedBy = normalizeOptionalUpdatedBy(reviewedBy);

    return withTransaction(this.pool, async (client) => {
      const application = await this.getApplicationByIdOrThrow(applicationId, {
        queryable: client,
        lockClause: 'FOR UPDATE'
      });
      const documentResult = await client.query(
        `
          SELECT
            id,
            application_id,
            user_id,
            document_type,
            file_name,
            content_type,
            content_length,
            object_key,
            checksum_sha256,
            review_status,
            review_reason,
            reviewed_by,
            reviewed_at,
            created_at,
            updated_at
          FROM job_application_documents
          WHERE id = $1 AND application_id = $2
          LIMIT 1
          FOR UPDATE
        `,
        [normalizedDocumentId, application.id]
      );
      const existing = mapApplicationDocumentRow(documentResult.rows[0]);
      if (!existing) {
        throw new JobsApiError(404, 'application_document_not_found', 'application document not found');
      }

      const changed =
        existing.reviewStatus !== normalizedReviewStatus ||
        existing.reviewReason !== normalizedReviewReason ||
        existing.reviewedBy !== normalizedReviewedBy;

      let document = existing;
      if (changed) {
        const updateResult = await client.query(
          `
            UPDATE job_application_documents
            SET
              review_status = $2,
              review_reason = $3,
              reviewed_by = $4,
              reviewed_at = NOW(),
              updated_at = NOW()
            WHERE id = $1
            RETURNING
              id,
              application_id,
              user_id,
              document_type,
              file_name,
              content_type,
              content_length,
              object_key,
              checksum_sha256,
              review_status,
              review_reason,
              reviewed_by,
              reviewed_at,
              created_at,
              updated_at
          `,
          [existing.id, normalizedReviewStatus, normalizedReviewReason, normalizedReviewedBy]
        );
        document = mapApplicationDocumentRow(updateResult.rows[0]);
      }

      const [job, applicant] = await Promise.all([
        this.getJobByIdOrThrow(application.jobId, { queryable: client }),
        this.getApplicantById(application.userId, { queryable: client })
      ]);
      return {
        updated: changed,
        application: toApplicationSummary(application, job),
        applicant,
        document: toApplicationDocument(document)
      };
    });
  }

  async issueAdminApplicationDocumentPreviewUrl({ documentId, expiresSec }) {
    const normalizedDocumentId = normalizeApplicationDocumentId(documentId);
    const normalizedExpiresSec = normalizeApplicationPreviewExpiresSec(expiresSec);
    const result = await this.pool.query(
      `
        SELECT
          id,
          application_id,
          user_id,
          document_type,
          file_name,
          content_type,
          content_length,
          object_key,
          checksum_sha256,
          review_status,
          review_reason,
          reviewed_by,
          reviewed_at,
          created_at,
          updated_at
        FROM job_application_documents
        WHERE id = $1
        LIMIT 1
      `,
      [normalizedDocumentId]
    );
    const document = mapApplicationDocumentRow(result.rows[0]);
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

  async decideOfferForUser({ userId, applicationId, decision, reason }) {
    const normalizedDecision = String(decision || '')
      .trim()
      .toUpperCase();
    if (!['ACCEPT', 'DECLINE'].includes(normalizedDecision)) {
      throw new JobsApiError(400, 'invalid_offer_decision', 'decision must be ACCEPT or DECLINE');
    }
    const normalizedReason = normalizeOptionalReason(reason);

    return withTransaction(this.pool, async (client) => {
      const application = await this.getUserApplicationByIdOrThrow({
        userId,
        applicationId,
        queryable: client,
        lockClause: 'FOR UPDATE'
      });
      if (application.status !== 'OFFERED') {
        throw new JobsApiError(
          409,
          'offer_not_available',
          'offer decision is only allowed when application status is OFFERED'
        );
      }
      const now = new Date().toISOString();
      const nextStatus = normalizedDecision === 'ACCEPT' ? 'HIRED' : 'REJECTED';
      const updatedResult = await client.query(
        `
          UPDATE job_applications
          SET status = $2, updated_at = $3::timestamptz
          WHERE id = $1
          RETURNING id, user_id, job_id, status, note, created_at, updated_at
        `,
        [application.id, nextStatus, now]
      );
      const updatedApplication = mapApplicationRow(updatedResult.rows[0]);
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
      await client.query(
        `
          INSERT INTO job_application_journey_events (
            id,
            application_id,
            status,
            title,
            description,
            actor_type,
            actor_id,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz)
        `,
        [
          journeyEvent.id,
          updatedApplication.id,
          journeyEvent.status,
          journeyEvent.title,
          journeyEvent.description,
          journeyEvent.actorType,
          journeyEvent.actorId,
          journeyEvent.createdAt
        ]
      );

      const job = await this.getJobByIdOrThrow(updatedApplication.jobId, { queryable: client });
      return {
        updated: true,
        decision: normalizedDecision,
        application: toApplicationSummary(updatedApplication, job),
        journeyEvent
      };
    });
  }

  async acceptOfferForUser({ userId, applicationId, reason }) {
    return this.decideOfferForUser({
      userId,
      applicationId,
      decision: 'ACCEPT',
      reason
    });
  }

  async declineOfferForUser({ userId, applicationId, reason }) {
    return this.decideOfferForUser({
      userId,
      applicationId,
      decision: 'DECLINE',
      reason
    });
  }

  async getApplicantById(userId, { queryable = this.pool } = {}) {
    const result = await queryable.query(
      `
        SELECT id, full_name, email
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId]
    );
    return mapApplicantRow(result.rows[0]);
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

    const whereParts = [];
    const params = [];
    if (normalizedStatus) {
      params.push(normalizedStatus);
      whereParts.push(`a.status = $${params.length}`);
    }
    if (normalizedJobId) {
      params.push(normalizedJobId);
      whereParts.push(`a.job_id = $${params.length}`);
    }
    if (normalizedOrgId) {
      params.push(normalizedOrgId);
      whereParts.push(`COALESCE(j.employer_json->>'id', '') = $${params.length}`);
    }
    if (normalizedQuery) {
      params.push(`%${normalizedQuery}%`);
      whereParts.push(
        `
          LOWER(
            CONCAT_WS(
              ' ',
              u.full_name,
              u.email,
              j.title,
              COALESCE(j.employer_json->>'name', '')
            )
          ) LIKE $${params.length}
        `
      );
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    const countResult = await this.pool.query(
      `
        SELECT COUNT(*)::int AS count
        FROM job_applications a
        JOIN jobs j ON j.id = a.job_id
        JOIN users u ON u.id = a.user_id
        ${whereClause}
      `,
      params
    );
    const total = Number(countResult.rows[0]?.count || 0);

    const listParams = [...params, normalizedLimit, normalizedCursor];
    const listResult = await this.pool.query(
      `
        SELECT
          a.id AS application_id,
          a.user_id,
          a.job_id AS application_job_id,
          a.status AS application_status,
          a.note AS application_note,
          a.created_at AS application_created_at,
          a.updated_at AS application_updated_at,
          j.id AS job_id,
          j.title AS job_title,
          j.employment_type AS job_employment_type,
          j.visa_sponsorship AS job_visa_sponsorship,
          j.description AS job_description,
          j.requirements_json AS job_requirements_json,
          j.location_json AS job_location_json,
          j.employer_json AS job_employer_json,
          j.lifecycle_status AS job_lifecycle_status,
          j.published_at AS job_published_at,
          j.scheduled_publish_at AS job_scheduled_publish_at,
          u.id AS applicant_id,
          u.full_name AS applicant_full_name,
          u.email AS applicant_email,
          je.id AS last_event_id,
          je.status AS last_event_status,
          je.title AS last_event_title,
          je.description AS last_event_description,
          je.actor_type AS last_event_actor_type,
          je.actor_id AS last_event_actor_id,
          je.created_at AS last_event_created_at
        FROM job_applications a
        JOIN jobs j ON j.id = a.job_id
        JOIN users u ON u.id = a.user_id
        LEFT JOIN LATERAL (
          SELECT id, status, title, description, actor_type, actor_id, created_at
          FROM job_application_journey_events
          WHERE application_id = a.id
          ORDER BY created_at DESC
          LIMIT 1
        ) je ON TRUE
        ${whereClause}
        ORDER BY a.updated_at DESC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
      `,
      listParams
    );

    const items = listResult.rows.map((row) => {
      const application = mapApplicationRow({
        id: row.application_id,
        user_id: row.user_id,
        job_id: row.application_job_id,
        status: row.application_status,
        note: row.application_note,
        created_at: row.application_created_at,
        updated_at: row.application_updated_at
      });
      const job = mapJobRow({
        id: row.job_id,
        title: row.job_title,
        employment_type: row.job_employment_type,
        visa_sponsorship: row.job_visa_sponsorship,
        description: row.job_description,
        requirements_json: row.job_requirements_json,
        location_json: row.job_location_json,
        employer_json: row.job_employer_json,
        lifecycle_status: row.job_lifecycle_status,
        published_at: row.job_published_at,
        scheduled_publish_at: row.job_scheduled_publish_at
      });
      const applicant = {
        id: row.applicant_id,
        fullName: row.applicant_full_name,
        email: row.applicant_email
      };
      const lastEvent = row.last_event_id
        ? mapJourneyRow({
            id: row.last_event_id,
            status: row.last_event_status,
            title: row.last_event_title,
            description: row.last_event_description,
            actor_type: row.last_event_actor_type,
            actor_id: row.last_event_actor_id,
            created_at: row.last_event_created_at
          })
        : null;
      return {
        application: toApplicationSummary(application, job),
        applicant,
        lastEvent
      };
    });

    const nextOffset = normalizedCursor + items.length;
    const nextCursor = nextOffset < total ? String(nextOffset) : null;

    return {
      items,
      pageInfo: {
        cursor: String(normalizedCursor),
        nextCursor,
        limit: normalizedLimit,
        total
      }
    };
  }

  async getAdminApplication({ applicationId }) {
    const normalizedApplicationId = normalizeApplicationId(applicationId);
    const result = await this.pool.query(
      `
        SELECT id, user_id, job_id, status, note, created_at, updated_at
        FROM job_applications
        WHERE id = $1
        LIMIT 1
      `,
      [normalizedApplicationId]
    );
    const application = mapApplicationRow(result.rows[0]);
    if (!application) {
      throw new JobsApiError(404, 'application_not_found', 'application not found');
    }

    const [job, applicant, lastEventResult] = await Promise.all([
      this.getJobByIdOrThrow(application.jobId),
      this.getApplicantById(application.userId),
      this.pool.query(
        `
          SELECT id, status, title, description, actor_type, actor_id, created_at
          FROM job_application_journey_events
          WHERE application_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [application.id]
      )
    ]);

    return {
      application: toApplicationSummary(application, job),
      applicant,
      lastEvent: mapJourneyRow(lastEventResult.rows[0])
    };
  }

  async getAdminApplicationJourney({ applicationId }) {
    const normalizedApplicationId = normalizeApplicationId(applicationId);
    const result = await this.pool.query(
      `
        SELECT id, user_id, job_id, status, note, created_at, updated_at
        FROM job_applications
        WHERE id = $1
        LIMIT 1
      `,
      [normalizedApplicationId]
    );
    const application = mapApplicationRow(result.rows[0]);
    if (!application) {
      throw new JobsApiError(404, 'application_not_found', 'application not found');
    }

    const [job, applicant, journeyResult] = await Promise.all([
      this.getJobByIdOrThrow(application.jobId),
      this.getApplicantById(application.userId),
      this.pool.query(
        `
          SELECT id, status, title, description, actor_type, actor_id, created_at
          FROM job_application_journey_events
          WHERE application_id = $1
          ORDER BY created_at ASC
        `,
        [application.id]
      )
    ]);

    return {
      application: toApplicationSummary(application, job),
      applicant,
      journey: journeyResult.rows.map((row) => mapJourneyRow(row))
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

    return withTransaction(this.pool, async (client) => {
      const application = await this.getApplicationByIdOrThrow(normalizedApplicationId, {
        queryable: client,
        lockClause: 'FOR UPDATE'
      });
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
        const updatedApplicationResult = await client.query(
          `
            UPDATE job_applications
            SET status = $2, updated_at = $3::timestamptz
            WHERE id = $1
            RETURNING id, user_id, job_id, status, note, created_at, updated_at
          `,
          [application.id, normalizedStatus, now]
        );
        const updatedApplication = mapApplicationRow(updatedApplicationResult.rows[0]);
        if (!updatedApplication) {
          throw new JobsApiError(404, 'application_not_found', 'application not found');
        }
        application.status = updatedApplication.status;
        application.updatedAt = updatedApplication.updatedAt;

        journeyEvent = buildStatusJourneyEvent({
          status: normalizedStatus,
          reason: normalizedReason,
          updatedBy: normalizedUpdatedBy,
          createdAt: now,
          actorType: 'ADMIN',
          actorId: normalizedUpdatedBy
        });
        await client.query(
          `
            INSERT INTO job_application_journey_events (
              id,
              application_id,
              status,
              title,
              description,
              actor_type,
              actor_id,
              created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz)
          `,
          [
            journeyEvent.id,
            application.id,
            journeyEvent.status,
            journeyEvent.title,
            journeyEvent.description,
            journeyEvent.actorType,
            journeyEvent.actorId,
            journeyEvent.createdAt
          ]
        );
      }

      const [job, applicant] = await Promise.all([
        this.getJobByIdOrThrow(application.jobId, { queryable: client }),
        this.getApplicantById(application.userId, { queryable: client })
      ]);

      return {
        updated: changed,
        application: toApplicationSummary(application, job),
        applicant,
        journeyEvent
      };
    });
  }

  async listAdminActivityEvents({ cursor, limit, actorId, from, to, toStatus } = {}) {
    const normalizedCursor = normalizeCursor(cursor);
    const normalizedLimit = normalizeLimit(limit);
    const normalizedActorId = String(actorId || '').trim();
    const normalizedFrom = normalizeOptionalDateTime(from, 'from');
    const normalizedTo = normalizeOptionalDateTime(to, 'to');
    const normalizedToStatus = toStatus
      ? String(toStatus)
          .trim()
          .toUpperCase()
      : '';
    if (normalizedToStatus && !APPLICATION_STATUSES.has(normalizedToStatus)) {
      throw new JobsApiError(
        400,
        'invalid_application_status',
        `status must be one of ${Array.from(APPLICATION_STATUSES).join(', ')}`
      );
    }

    const whereParts = [];
    const params = [];
    if (normalizedActorId) {
      params.push(normalizedActorId);
      whereParts.push(`COALESCE(je.actor_id, a.user_id::text) = $${params.length}`);
    }
    if (normalizedFrom) {
      params.push(normalizedFrom);
      whereParts.push(`je.created_at >= $${params.length}::timestamptz`);
    }
    if (normalizedTo) {
      params.push(normalizedTo);
      whereParts.push(`je.created_at <= $${params.length}::timestamptz`);
    }
    if (normalizedToStatus) {
      params.push(normalizedToStatus);
      whereParts.push(`je.status = $${params.length}`);
    }
    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    const countResult = await this.pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM job_application_journey_events je
        JOIN job_applications a ON a.id = je.application_id
        ${whereClause}
      `,
      params
    );
    const total = Number(countResult.rows[0]?.total || 0);

    const listParams = [...params, normalizedLimit, normalizedCursor];
    const result = await this.pool.query(
      `
        SELECT
          je.id,
          je.application_id,
          je.status,
          je.title,
          je.description,
          je.actor_type,
          je.actor_id,
          je.created_at,
          a.user_id,
          a.job_id,
          LAG(je.status) OVER (
            PARTITION BY je.application_id
            ORDER BY je.created_at ASC
          ) AS from_status,
          u.full_name AS applicant_full_name,
          u.email AS applicant_email,
          j.title AS job_title
        FROM job_application_journey_events je
        JOIN job_applications a ON a.id = je.application_id
        JOIN users u ON u.id = a.user_id
        JOIN jobs j ON j.id = a.job_id
        ${whereClause}
        ORDER BY je.created_at DESC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
      `,
      listParams
    );

    return {
      items: result.rows.map((row) => ({
        id: row.id,
        type: 'APPLICATION',
        action: 'APPLICATION_STATUS_TRANSITION',
        entityType: 'JOB_APPLICATION',
        entityId: row.application_id,
        actorType: row.actor_type || (row.status === 'SUBMITTED' ? 'USER' : 'ADMIN'),
        actorId: row.actor_id || row.user_id,
        statusFrom: row.from_status || null,
        statusTo: row.status,
        title: row.title,
        description: row.description,
        createdAt: new Date(row.created_at).toISOString(),
        applicant: {
          id: row.user_id,
          fullName: row.applicant_full_name,
          email: row.applicant_email
        },
        job: {
          id: row.job_id,
          title: row.job_title
        }
      })),
      pageInfo: {
        cursor: String(normalizedCursor),
        nextCursor:
          normalizedCursor + result.rows.length < total ? String(normalizedCursor + result.rows.length) : null,
        limit: normalizedLimit,
        total
      }
    };
  }

  async listAdminJobs({ q, cursor, limit }) {
    const normalizedQuery = normalizeSearchQuery(q);
    const normalizedCursor = normalizeCursor(cursor);
    const normalizedLimit = normalizeLimit(limit);

    const params = [];
    let whereClause = '';
    if (normalizedQuery) {
      params.push(`%${normalizedQuery}%`);
      whereClause = `
        WHERE LOWER(
          CONCAT_WS(
            ' ',
            title,
            description,
            COALESCE(employer_json->>'name', ''),
            COALESCE(location_json->>'displayLabel', '')
          )
        ) LIKE $1
      `;
    }

    const countResult = await this.pool.query(
      `
        SELECT COUNT(*)::int AS count
        FROM jobs
        ${whereClause}
      `,
      params
    );
    const total = Number(countResult.rows[0]?.count || 0);

    const listParams = [...params, normalizedLimit, normalizedCursor];
    const listResult = await this.pool.query(
      `
        SELECT
          id,
          title,
          employment_type,
          visa_sponsorship,
          description,
          requirements_json,
          location_json,
          employer_json,
          lifecycle_status,
          published_at,
          scheduled_publish_at
        FROM jobs
        ${whereClause}
        ORDER BY created_at ASC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
      `,
      listParams
    );
    const jobs = listResult.rows.map((row) => mapJobRow(row));
    const nextOffset = normalizedCursor + jobs.length;
    const nextCursor = nextOffset < total ? String(nextOffset) : null;

    return {
      items: jobs.map((job) => toAdminJob(job)),
      pageInfo: {
        cursor: String(normalizedCursor),
        nextCursor,
        limit: normalizedLimit,
        total
      }
    };
  }

  async createJob(payload) {
    const validationService = this.adminCreateValidator;
    const result = validationService.createJob(payload);
    await upsertJobToDb(this.pool, result.job);
    return result;
  }

  async updateJob({ jobId, ...patch }) {
    return withTransaction(this.pool, async (client) => {
      const existing = await this.getJobByIdOrThrow(jobId, {
        queryable: client,
        lockClause: 'FOR UPDATE'
      });
      const validationService = createJobsService({ jobs: [existing] });
      const result = validationService.updateJob({ jobId: existing.id, ...patch });
      await upsertJobToDb(client, result.job);
      return result;
    });
  }

  async publishJob({ jobId, publishedAt }) {
    return withTransaction(this.pool, async (client) => {
      const existing = await this.getJobByIdOrThrow(jobId, {
        queryable: client,
        lockClause: 'FOR UPDATE'
      });
      const normalizedPublishedAt = normalizeOptionalLifecycleDate(publishedAt, 'publishedAt') || new Date().toISOString();
      const next = {
        ...existing,
        lifecycleStatus: 'PUBLISHED',
        publishedAt: normalizedPublishedAt,
        scheduledAt: null
      };
      await upsertJobToDb(client, next);
      return { job: toAdminJob(next) };
    });
  }

  async unpublishJob({ jobId }) {
    return withTransaction(this.pool, async (client) => {
      const existing = await this.getJobByIdOrThrow(jobId, {
        queryable: client,
        lockClause: 'FOR UPDATE'
      });
      const next = {
        ...existing,
        lifecycleStatus: 'DRAFT',
        publishedAt: null,
        scheduledAt: null
      };
      await upsertJobToDb(client, next);
      return { job: toAdminJob(next) };
    });
  }

  async scheduleJob({ jobId, scheduledAt }) {
    const normalizedScheduledAt = normalizeRequiredLifecycleDate(scheduledAt, 'scheduledAt');
    return withTransaction(this.pool, async (client) => {
      const existing = await this.getJobByIdOrThrow(jobId, {
        queryable: client,
        lockClause: 'FOR UPDATE'
      });
      const next = {
        ...existing,
        lifecycleStatus: 'SCHEDULED',
        publishedAt: null,
        scheduledAt: normalizedScheduledAt
      };
      await upsertJobToDb(client, next);
      return { job: toAdminJob(next) };
    });
  }

  async bulkUpdateJobs({ action, jobIds, scheduledAt, publishedAt }) {
    const normalizedAction = normalizeBulkAction(action);
    const normalizedJobIds = normalizeBulkJobIds(jobIds);
    const results = [];

    for (const jobId of normalizedJobIds) {
      try {
        if (normalizedAction === 'PUBLISH') {
          const result = await this.publishJob({ jobId, publishedAt });
          results.push({ jobId, success: true, lifecycle: result.job.lifecycle });
          continue;
        }
        if (normalizedAction === 'UNPUBLISH') {
          const result = await this.unpublishJob({ jobId });
          results.push({ jobId, success: true, lifecycle: result.job.lifecycle });
          continue;
        }
        if (normalizedAction === 'SCHEDULE') {
          const result = await this.scheduleJob({ jobId, scheduledAt });
          results.push({ jobId, success: true, lifecycle: result.job.lifecycle });
          continue;
        }
        const result = await this.deleteJob({ jobId });
        results.push({ jobId, success: true, removed: result.removed });
      } catch (error) {
        if (error instanceof JobsApiError) {
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

  async deleteJob({ jobId }) {
    const normalizedJobId = normalizeJobId(jobId);
    const result = await this.pool.query(
      `
        DELETE FROM jobs
        WHERE id = $1
        RETURNING id
      `,
      [normalizedJobId]
    );
    if (result.rowCount === 0) {
      throw new JobsApiError(404, 'job_not_found', 'job not found');
    }
    return {
      removed: true,
      jobId: result.rows[0].id
    };
  }
}

export async function createPostgresJobsService({ pool, objectStorage = null }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('Postgres jobs service requires a pg pool');
  }

  await seedJobsIfEmpty(pool);
  return new PostgresJobsService({ pool, objectStorage });
}
