import { randomUUID } from 'node:crypto';
import { JOB_SEED_DATA, JobsApiError, createJobsService } from './service.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const EMPLOYMENT_TYPES = new Set(['FULL_TIME', 'PART_TIME', 'CONTRACT']);
const APPLICATION_STATUSES = new Set(['SUBMITTED', 'IN_REVIEW', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED']);

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

function mapJobRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    employmentType: row.employment_type,
    visaSponsorship: Boolean(row.visa_sponsorship),
    description: row.description,
    requirements: Array.isArray(row.requirements_json) ? row.requirements_json : [],
    location: row.location_json || {},
    employer: row.employer_json || {}
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
    createdAt: new Date(row.created_at).toISOString()
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
        employer_json
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb)
      ON CONFLICT (id)
      DO UPDATE SET
        title = EXCLUDED.title,
        employment_type = EXCLUDED.employment_type,
        visa_sponsorship = EXCLUDED.visa_sponsorship,
        description = EXCLUDED.description,
        requirements_json = EXCLUDED.requirements_json,
        location_json = EXCLUDED.location_json,
        employer_json = EXCLUDED.employer_json,
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
      JSON.stringify(job.employer || {})
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
  constructor({ pool }) {
    this.pool = pool;
    this.adminCreateValidator = createJobsService({ jobs: [] });
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
          employer_json
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

  async listJobs({ q, employmentType, visaSponsored, location, cursor, limit, userId }) {
    const normalizedQuery = normalizeSearchQuery(q);
    const normalizedEmploymentType = normalizeEmploymentType(employmentType);
    const normalizedVisaSponsored = normalizeVisaSponsored(visaSponsored);
    const normalizedLocation = normalizeLocation(location);
    const normalizedCursor = normalizeCursor(cursor);
    const normalizedLimit = normalizeLimit(limit);
    const authenticated = Boolean(userId);

    const whereParts = [];
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
          employer_json
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
          j.employer_json
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
              created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
          `,
          [event.id, application.id, event.status, event.title, event.description, event.createdAt]
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
            employer_json
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
    const normalizedApplicationId = normalizeApplicationId(applicationId);
    const applicationResult = await this.pool.query(
      `
        SELECT id, user_id, job_id, status, note, created_at, updated_at
        FROM job_applications
        WHERE id = $1 AND user_id = $2
        LIMIT 1
      `,
      [normalizedApplicationId, userId]
    );
    const application = mapApplicationRow(applicationResult.rows[0]);
    if (!application) {
      throw new JobsApiError(404, 'application_not_found', 'application not found');
    }

    const job = await this.getJobByIdOrThrow(application.jobId);
    const journeyResult = await this.pool.query(
      `
        SELECT id, status, title, description, created_at
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
          employer_json
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
      items: jobs.map((job) => ({
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
        }
      })),
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

export async function createPostgresJobsService({ pool }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('Postgres jobs service requires a pg pool');
  }

  await seedJobsIfEmpty(pool);
  return new PostgresJobsService({ pool });
}
