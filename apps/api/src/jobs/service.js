import { randomUUID } from 'node:crypto';

export class JobsApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const EMPLOYMENT_TYPES = new Set(['FULL_TIME', 'PART_TIME', 'CONTRACT']);
const APPLICATION_STATUSES = new Set(['SUBMITTED', 'IN_REVIEW', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED']);
const MAX_TITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_REQUIREMENTS = 20;
const MAX_REQUIREMENT_LENGTH = 300;
const MAX_CITY_LENGTH = 120;
const MAX_DISPLAY_LABEL_LENGTH = 180;
const MAX_EMPLOYER_NAME_LENGTH = 180;

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
];

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
      }
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
    }
  };
}

export class JobsService {
  constructor({ jobs = JOB_SEED_DATA } = {}) {
    this.jobs = Array.from(jobs);
    this.jobById = new Map(this.jobs.map((job) => [job.id, job]));
    this.savedByUserId = new Map();
    this.applicationsById = new Map();
    this.applicationIdsByUserId = new Map();
    this.applicationIdByUserJob = new Map();
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
    const normalizedApplicationId = String(applicationId || '').trim();
    if (!normalizedApplicationId) {
      throw new JobsApiError(400, 'invalid_application_id', 'applicationId is required');
    }

    const application = this.applicationsById.get(normalizedApplicationId);
    if (!application || application.userId !== userId) {
      throw new JobsApiError(404, 'application_not_found', 'application not found');
    }

    const job = this.getJobByIdOrThrow(application.jobId);
    return {
      application: toApplicationSummary(application, job),
      journey: Array.from(application.journey)
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

  createJob({ title, employmentType, visaSponsorship, description, requirements, location, employer }) {
    const job = {
      id: randomUUID(),
      title: normalizeRequiredTitle(title),
      employmentType: normalizeRequiredEmploymentType(employmentType),
      visaSponsorship: normalizeRequiredVisaSponsorship(visaSponsorship),
      description: normalizeRequiredDescription(description),
      requirements: normalizeRequiredRequirements(requirements),
      location: normalizeRequiredLocation(location),
      employer: normalizeRequiredEmployer(employer)
    };

    this.jobs.push(job);
    this.jobById.set(job.id, job);
    return { job: toAdminJob(job) };
  }

  updateJob({ jobId, title, employmentType, visaSponsorship, description, requirements, location, employer }) {
    const job = this.getJobByIdOrThrow(jobId);
    const patch = {
      title: title === undefined ? undefined : normalizeRequiredTitle(title),
      employmentType: normalizeOptionalEmploymentType(employmentType),
      visaSponsorship: normalizeOptionalVisaSponsorship(visaSponsorship),
      description: normalizeOptionalDescription(description),
      requirements: normalizeOptionalRequirements(requirements),
      location: normalizeOptionalLocation(location),
      employer: normalizeOptionalEmployer(employer)
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

    return { job: toAdminJob(job) };
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
