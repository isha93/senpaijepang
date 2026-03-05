class AdminOpsApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const ACTIVITY_TYPES = new Set(['ALL', 'KYC', 'APPLICATION', 'JOB', 'FEED', 'ORG', 'AUTH']);
const AUDIT_ACTOR_TYPES = new Set(['ALL', 'USER', 'ADMIN', 'SYSTEM']);
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const ACTIVITY_SOURCE_PAGE_LIMIT = 50;
const MAX_AUDIT_SCAN_ITEMS = 5000;

function normalizeLimit(limit) {
  if (limit === undefined || limit === null || String(limit).trim() === '') {
    return DEFAULT_LIMIT;
  }
  const normalized = Number(limit);
  if (!Number.isFinite(normalized) || normalized < 1 || normalized > MAX_LIMIT) {
    throw new AdminOpsApiError(400, 'invalid_limit', `limit must be between 1 and ${MAX_LIMIT}`);
  }
  return Math.floor(normalized);
}

function normalizeCursor(cursor) {
  if (cursor === undefined || cursor === null || String(cursor).trim() === '') {
    return 0;
  }
  const normalized = Number(cursor);
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new AdminOpsApiError(400, 'invalid_cursor', 'cursor must be a non-negative integer');
  }
  return Math.floor(normalized);
}

function normalizeOptionalDateTime(value, fieldName) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  const normalized = String(value).trim();
  const timestamp = Date.parse(normalized);
  if (!Number.isFinite(timestamp)) {
    throw new AdminOpsApiError(400, 'invalid_date_filter', `${fieldName} must be valid ISO date-time`);
  }
  return new Date(timestamp).toISOString();
}

function normalizeActivityType(type) {
  const normalized = String(type || 'ALL')
    .trim()
    .toUpperCase();
  if (!ACTIVITY_TYPES.has(normalized)) {
    throw new AdminOpsApiError(
      400,
      'invalid_activity_type',
      `type must be one of ${Array.from(ACTIVITY_TYPES).join(', ')}`
    );
  }
  return normalized;
}

function normalizeAuditActorType(actorType) {
  const normalized = String(actorType || 'ALL')
    .trim()
    .toUpperCase();
  if (!AUDIT_ACTOR_TYPES.has(normalized)) {
    throw new AdminOpsApiError(
      400,
      'invalid_actor_type',
      `actorType must be one of ${Array.from(AUDIT_ACTOR_TYPES).join(', ')}`
    );
  }
  return normalized;
}

function normalizeOptionalFilter(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function startOfUtcDayIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)).toISOString();
}

function endOfUtcDayIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)).toISOString();
}

function pickTotal(page) {
  if (!page || typeof page !== 'object') {
    return 0;
  }
  const total = Number(page?.pageInfo?.total);
  if (Number.isFinite(total) && total >= 0) {
    return Math.floor(total);
  }
  return 0;
}

function pickPageTotal(page, fallback) {
  const total = Number(page?.pageInfo?.total);
  if (Number.isFinite(total) && total >= 0) {
    return Math.floor(total);
  }
  return fallback;
}

async function collectActivitySource({ targetCount, pageLimit, fetchPage }) {
  if (targetCount <= 0) {
    return {
      items: [],
      total: 0
    };
  }

  let cursor = 0;
  let hasMore = true;
  const items = [];
  let total = null;

  while (hasMore && items.length < targetCount) {
    const nextLimit = Math.min(pageLimit, targetCount - items.length);
    const page = await fetchPage({ cursor, limit: nextLimit });
    const pageItems = Array.isArray(page?.items) ? page.items : [];
    items.push(...pageItems);
    total = pickPageTotal(page, items.length);

    const nextCursorRaw = page?.pageInfo?.nextCursor;
    const nextCursor = Number(nextCursorRaw);
    if (
      nextCursorRaw === null ||
      nextCursorRaw === undefined ||
      !Number.isFinite(nextCursor) ||
      nextCursor <= cursor
    ) {
      hasMore = false;
    } else {
      cursor = Math.floor(nextCursor);
    }
  }

  return {
    items,
    total: total === null ? items.length : total
  };
}

async function collectAllActivitySource({ pageLimit, fetchPage, maxItems = MAX_AUDIT_SCAN_ITEMS }) {
  let cursor = 0;
  let hasMore = true;
  const items = [];
  let total = 0;

  while (hasMore && items.length < maxItems) {
    const page = await fetchPage({ cursor, limit: pageLimit });
    const pageItems = Array.isArray(page?.items) ? page.items : [];
    items.push(...pageItems);
    total = pickPageTotal(page, items.length);

    const nextCursorRaw = page?.pageInfo?.nextCursor;
    const nextCursor = Number(nextCursorRaw);
    if (
      nextCursorRaw === null ||
      nextCursorRaw === undefined ||
      !Number.isFinite(nextCursor) ||
      nextCursor <= cursor
    ) {
      hasMore = false;
    } else {
      cursor = Math.floor(nextCursor);
    }
  }

  return {
    items: items.slice(0, maxItems),
    total
  };
}

export class AdminOpsService {
  constructor({ kycService, jobsService, feedService, organizationsService }) {
    this.kycService = kycService;
    this.jobsService = jobsService;
    this.feedService = feedService;
    this.organizationsService = organizationsService;
  }

  async getOverviewSummary() {
    const now = new Date();
    const dayFrom = startOfUtcDayIso(now);
    const dayTo = endOfUtcDayIso(now);

    const [
      pendingKycPage,
      manualReviewKycPage,
      pendingOrgPage,
      activeJobsPage,
      publishedFeedPostsPage,
      totalApplicationsPage,
      submittedApplicationsPage,
      inReviewApplicationsPage,
      interviewApplicationsPage,
      offeredApplicationsPage,
      hiredApplicationsPage,
      rejectedApplicationsPage,
      verifiedTodayEventsPage,
      rejectedTodayEventsPage
    ] = await Promise.all([
      this.kycService.listReviewQueue({ status: 'SUBMITTED', cursor: 0, limit: 1 }),
      this.kycService.listReviewQueue({ status: 'MANUAL_REVIEW', cursor: 0, limit: 1 }),
      this.organizationsService.listOrganizationsForAdmin({ verificationStatus: 'PENDING', cursor: 0, limit: 1 }),
      this.jobsService.listAdminJobs({ cursor: 0, limit: 1 }),
      this.feedService.listAdminPosts({ cursor: 0, limit: 1 }),
      this.jobsService.listAdminApplications({ cursor: 0, limit: 1 }),
      this.jobsService.listAdminApplications({ status: 'SUBMITTED', cursor: 0, limit: 1 }),
      this.jobsService.listAdminApplications({ status: 'IN_REVIEW', cursor: 0, limit: 1 }),
      this.jobsService.listAdminApplications({ status: 'INTERVIEW', cursor: 0, limit: 1 }),
      this.jobsService.listAdminApplications({ status: 'OFFERED', cursor: 0, limit: 1 }),
      this.jobsService.listAdminApplications({ status: 'HIRED', cursor: 0, limit: 1 }),
      this.jobsService.listAdminApplications({ status: 'REJECTED', cursor: 0, limit: 1 }),
      this.kycService.listAdminActivityEvents({ cursor: 0, limit: 1, toStatus: 'VERIFIED', from: dayFrom, to: dayTo }),
      this.kycService.listAdminActivityEvents({ cursor: 0, limit: 1, toStatus: 'REJECTED', from: dayFrom, to: dayTo })
    ]);

    return {
      pendingKyc: Number(pendingKycPage?.pageInfo?.total || 0),
      manualReviewKyc: Number(manualReviewKycPage?.pageInfo?.total || 0),
      verifiedToday: Number(verifiedTodayEventsPage?.pageInfo?.total || 0),
      rejectedToday: Number(rejectedTodayEventsPage?.pageInfo?.total || 0),
      pendingOrganizationVerification: pickTotal(pendingOrgPage),
      activeJobs: pickTotal(activeJobsPage),
      publishedFeedPosts: pickTotal(publishedFeedPostsPage),
      activeApplications: pickTotal(totalApplicationsPage),
      submittedApplications: pickTotal(submittedApplicationsPage),
      inReviewApplications: pickTotal(inReviewApplicationsPage),
      interviewApplications: pickTotal(interviewApplicationsPage),
      offeredApplications: pickTotal(offeredApplicationsPage),
      hiredApplications: pickTotal(hiredApplicationsPage),
      rejectedApplications: pickTotal(rejectedApplicationsPage),
      lastUpdatedAt: now.toISOString()
    };
  }

  async listActivityEvents({ type, actorId, from, to, cursor, limit } = {}) {
    const normalizedType = normalizeActivityType(type);
    const normalizedActorId = String(actorId || '').trim() || null;
    const normalizedFrom = normalizeOptionalDateTime(from, 'from');
    const normalizedTo = normalizeOptionalDateTime(to, 'to');
    const normalizedCursor = normalizeCursor(cursor);
    const normalizedLimit = normalizeLimit(limit);
    const targetCount = normalizedCursor + normalizedLimit;

    const includeKyc = normalizedType === 'ALL' || normalizedType === 'KYC';
    const includeApplication = normalizedType === 'ALL' || normalizedType === 'APPLICATION';

    const [kycSource, applicationSource] = await Promise.all([
      includeKyc
        ? collectActivitySource({
            targetCount,
            pageLimit: ACTIVITY_SOURCE_PAGE_LIMIT,
            fetchPage: ({ cursor: sourceCursor, limit: sourceLimit }) =>
              this.kycService.listAdminActivityEvents({
                cursor: sourceCursor,
                limit: sourceLimit,
                actorId: normalizedActorId || undefined,
                from: normalizedFrom || undefined,
                to: normalizedTo || undefined
              })
          })
        : Promise.resolve({ items: [], total: 0 }),
      includeApplication
        ? collectActivitySource({
            targetCount,
            pageLimit: ACTIVITY_SOURCE_PAGE_LIMIT,
            fetchPage: ({ cursor: sourceCursor, limit: sourceLimit }) =>
              this.jobsService.listAdminActivityEvents({
                cursor: sourceCursor,
                limit: sourceLimit,
                actorId: normalizedActorId || undefined,
                from: normalizedFrom || undefined,
                to: normalizedTo || undefined
              })
          })
        : Promise.resolve({ items: [], total: 0 })
    ]);

    const merged = [...kycSource.items, ...applicationSource.items].sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
    );

    const total = Number(kycSource.total || 0) + Number(applicationSource.total || 0);
    const items = merged.slice(normalizedCursor, normalizedCursor + normalizedLimit);
    const nextCursor = normalizedCursor + items.length < total ? String(normalizedCursor + items.length) : null;

    return {
      count: items.length,
      filters: {
        type: normalizedType,
        actorId: normalizedActorId,
        from: normalizedFrom,
        to: normalizedTo
      },
      pageInfo: {
        cursor: String(normalizedCursor),
        nextCursor,
        limit: normalizedLimit,
        total
      },
      items
    };
  }

  async listAuditEvents({ type, actorType, actorId, entityType, entityId, action, from, to, cursor, limit } = {}) {
    const normalizedType = normalizeActivityType(type);
    const normalizedActorType = normalizeAuditActorType(actorType);
    const normalizedActorId = normalizeOptionalFilter(actorId);
    const normalizedEntityType = normalizeOptionalFilter(entityType);
    const normalizedEntityId = normalizeOptionalFilter(entityId);
    const normalizedAction = normalizeOptionalFilter(action);
    const normalizedFrom = normalizeOptionalDateTime(from, 'from');
    const normalizedTo = normalizeOptionalDateTime(to, 'to');
    const normalizedCursor = normalizeCursor(cursor);
    const normalizedLimit = normalizeLimit(limit);

    const includeKyc = normalizedType === 'ALL' || normalizedType === 'KYC';
    const includeApplication = normalizedType === 'ALL' || normalizedType === 'APPLICATION';

    const [kycSource, applicationSource] = await Promise.all([
      includeKyc
        ? collectAllActivitySource({
            pageLimit: ACTIVITY_SOURCE_PAGE_LIMIT,
            fetchPage: ({ cursor: sourceCursor, limit: sourceLimit }) =>
              this.kycService.listAdminActivityEvents({
                cursor: sourceCursor,
                limit: sourceLimit,
                actorId: normalizedActorId || undefined,
                from: normalizedFrom || undefined,
                to: normalizedTo || undefined
              })
          })
        : Promise.resolve({ items: [], total: 0 }),
      includeApplication
        ? collectAllActivitySource({
            pageLimit: ACTIVITY_SOURCE_PAGE_LIMIT,
            fetchPage: ({ cursor: sourceCursor, limit: sourceLimit }) =>
              this.jobsService.listAdminActivityEvents({
                cursor: sourceCursor,
                limit: sourceLimit,
                actorId: normalizedActorId || undefined,
                from: normalizedFrom || undefined,
                to: normalizedTo || undefined
              })
          })
        : Promise.resolve({ items: [], total: 0 })
    ]);

    const fromTime = normalizedFrom ? Date.parse(normalizedFrom) : null;
    const toTime = normalizedTo ? Date.parse(normalizedTo) : null;
    const filtered = [...kycSource.items, ...applicationSource.items]
      .filter((item) => {
        if (normalizedActorType !== 'ALL') {
          if (String(item?.actorType || '').trim().toUpperCase() !== normalizedActorType) {
            return false;
          }
        }
        if (normalizedActorId && String(item?.actorId || '').trim() !== normalizedActorId) {
          return false;
        }
        if (normalizedEntityType) {
          if (String(item?.entityType || '').trim().toUpperCase() !== normalizedEntityType.toUpperCase()) {
            return false;
          }
        }
        if (normalizedEntityId && String(item?.entityId || '').trim() !== normalizedEntityId) {
          return false;
        }
        if (normalizedAction) {
          if (String(item?.action || '').trim().toUpperCase() !== normalizedAction.toUpperCase()) {
            return false;
          }
        }
        if (fromTime !== null || toTime !== null) {
          const createdAtTime = Date.parse(item?.createdAt || '');
          if (!Number.isFinite(createdAtTime)) {
            return false;
          }
          if (fromTime !== null && createdAtTime < fromTime) {
            return false;
          }
          if (toTime !== null && createdAtTime > toTime) {
            return false;
          }
        }
        return true;
      })
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));

    const items = filtered.slice(normalizedCursor, normalizedCursor + normalizedLimit);
    const nextCursor = normalizedCursor + items.length < filtered.length ? String(normalizedCursor + items.length) : null;

    return {
      count: items.length,
      filters: {
        type: normalizedType,
        actorType: normalizedActorType,
        actorId: normalizedActorId,
        entityType: normalizedEntityType,
        entityId: normalizedEntityId,
        action: normalizedAction,
        from: normalizedFrom,
        to: normalizedTo
      },
      pageInfo: {
        cursor: String(normalizedCursor),
        nextCursor,
        limit: normalizedLimit,
        total: filtered.length
      },
      items
    };
  }
}

export function createAdminOpsService({ kycService, jobsService, feedService, organizationsService } = {}) {
  if (!kycService || typeof kycService.listReviewQueue !== 'function' || typeof kycService.listAdminActivityEvents !== 'function') {
    throw new Error('admin ops requires a kyc service with review queue and activity methods');
  }
  if (!jobsService || typeof jobsService.listAdminJobs !== 'function' || typeof jobsService.listAdminApplications !== 'function' || typeof jobsService.listAdminActivityEvents !== 'function') {
    throw new Error('admin ops requires a jobs service with admin list/application/activity methods');
  }
  if (!feedService || typeof feedService.listAdminPosts !== 'function') {
    throw new Error('admin ops requires a feed service with admin list method');
  }
  if (!organizationsService || typeof organizationsService.listOrganizationsForAdmin !== 'function') {
    throw new Error('admin ops requires an organizations service with admin list method');
  }
  return new AdminOpsService({
    kycService,
    jobsService,
    feedService,
    organizationsService
  });
}

export function isAdminOpsApiError(error) {
  return error instanceof AdminOpsApiError;
}
