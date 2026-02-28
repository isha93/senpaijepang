class JobsApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const EMPLOYMENT_TYPES = new Set(['FULL_TIME', 'PART_TIME', 'CONTRACT']);

const JOB_SEED_DATA = [
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

export class JobsService {
  constructor({ jobs = JOB_SEED_DATA } = {}) {
    this.jobs = Array.from(jobs);
    this.jobById = new Map(this.jobs.map((job) => [job.id, job]));
    this.savedByUserId = new Map();
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
    const normalizedJobId = String(jobId || '').trim();
    if (!normalizedJobId) {
      throw new JobsApiError(400, 'invalid_job_id', 'jobId is required');
    }

    const job = this.jobById.get(normalizedJobId);
    if (!job) {
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
    const normalizedJobId = String(jobId || '').trim();
    if (!normalizedJobId) {
      throw new JobsApiError(400, 'invalid_job_id', 'jobId is required');
    }
    if (!this.jobById.has(normalizedJobId)) {
      throw new JobsApiError(404, 'job_not_found', 'job not found');
    }

    const savedMap = this.getSavedMapForUser(userId);
    const isNew = !savedMap.has(normalizedJobId);
    if (isNew) {
      savedMap.set(normalizedJobId, Date.now());
    }

    return {
      saved: true,
      created: isNew,
      jobId: normalizedJobId
    };
  }

  unsaveJob({ userId, jobId }) {
    const normalizedJobId = String(jobId || '').trim();
    if (!normalizedJobId) {
      throw new JobsApiError(400, 'invalid_job_id', 'jobId is required');
    }
    if (!this.jobById.has(normalizedJobId)) {
      throw new JobsApiError(404, 'job_not_found', 'job not found');
    }

    const savedMap = this.getSavedMapForUser(userId);
    const removed = savedMap.delete(normalizedJobId);
    return {
      saved: false,
      removed,
      jobId: normalizedJobId
    };
  }
}

export function createJobsService(options = {}) {
  return new JobsService(options);
}

export function isJobsApiError(error) {
  return error instanceof JobsApiError;
}
