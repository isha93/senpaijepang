import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { createAuthService, isApiError } from './auth/service.js';
import { InMemoryAuthStore } from './auth/store.js';
import { createKycService, isKycApiError } from './identity/kyc-service.js';
import { createJobsService, isJobsApiError } from './jobs/service.js';
import { createFeedService, isFeedApiError } from './feed/service.js';
import { createProfileService, isProfileApiError } from './profile/service.js';
import {
  createOrganizationsService,
  isOrganizationsApiError
} from './organizations/service.js';
import { createLogger } from './observability/logger.js';
import { InMemoryApiMetrics } from './observability/metrics.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-admin-api-key, x-kyc-webhook-secret, x-idempotency-key',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Expose-Headers': 'x-request-id'
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    ...JSON_HEADERS,
    ...CORS_HEADERS
  });
  res.end(JSON.stringify(payload));
}

function sendNoContent(res) {
  res.writeHead(204, CORS_HEADERS);
  res.end();
}

function sendOptionsResponse(res) {
  res.writeHead(204, CORS_HEADERS);
  res.end();
}

function getBearerToken(req) {
  const raw = req.headers.authorization;
  if (!raw || !raw.startsWith('Bearer ')) {
    return null;
  }
  return raw.slice('Bearer '.length).trim();
}

function getAdminApiKeyHeader(req) {
  return String(req.headers['x-admin-api-key'] || '').trim();
}

function getWebhookSecretHeader(req) {
  return String(req.headers['x-kyc-webhook-secret'] || '').trim();
}

function getIdempotencyKeyHeader(req) {
  return String(req.headers['x-idempotency-key'] || '').trim();
}

function normalizeRoleCodes(roleCodes, fallback = ['super_admin']) {
  const rawValues = Array.isArray(roleCodes) ? roleCodes : String(roleCodes || '').split(',');
  const values = rawValues
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);
  const normalized = values.length > 0 ? values : fallback;
  return new Set(normalized);
}

function normalizeRuntimePath(pathname) {
  const normalized = String(pathname || '/');
  if (normalized === '/v1' || normalized === '/v1/') {
    return '/';
  }
  if (normalized.startsWith('/v1/')) {
    return normalized.slice('/v1'.length);
  }
  return normalized;
}

function matchKycSubmitRoute(pathname) {
  const match = String(pathname || '').match(/^\/identity\/kyc\/sessions\/([^/]+)\/submit$/);
  return match ? match[1] : null;
}

function matchKycProviderMetadataRoute(pathname) {
  const match = String(pathname || '').match(/^\/identity\/kyc\/sessions\/([^/]+)\/provider-metadata$/);
  return match ? match[1] : null;
}

function matchJobDetailRoute(pathname) {
  const match = String(pathname || '').match(/^\/jobs\/([^/]+)$/);
  return match ? match[1] : null;
}

function matchSavedJobRoute(pathname) {
  const match = String(pathname || '').match(/^\/users\/me\/saved-jobs\/([^/]+)$/);
  return match ? match[1] : null;
}

function matchJobApplicationRoute(pathname) {
  const match = String(pathname || '').match(/^\/jobs\/([^/]+)\/applications$/);
  return match ? match[1] : null;
}

function matchApplicationJourneyRoute(pathname) {
  const match = String(pathname || '').match(/^\/users\/me\/applications\/([^/]+)\/journey$/);
  return match ? match[1] : null;
}

function matchSavedPostRoute(pathname) {
  const match = String(pathname || '').match(/^\/users\/me\/saved-posts\/([^/]+)$/);
  return match ? match[1] : null;
}

function matchOrganizationVerificationRoute(pathname) {
  const match = String(pathname || '').match(/^\/organizations\/([^/]+)\/verification$/);
  return match ? match[1] : null;
}

function matchOrganizationVerificationStatusRoute(pathname) {
  const match = String(pathname || '').match(/^\/organizations\/([^/]+)\/verification\/status$/);
  return match ? match[1] : null;
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error('request body too large'));
      }
    });

    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('invalid json body'));
      }
    });

    req.on('error', reject);
  });
}

function sendMissingAccessTokenError(res) {
  sendJson(res, 401, {
    error: {
      code: 'missing_access_token',
      message: 'authorization header with bearer token is required'
    }
  });
}

async function authenticateRequest(req, res, authService) {
  const token = getBearerToken(req);
  if (!token) {
    sendMissingAccessTokenError(res);
    return null;
  }
  return authService.authenticateAccessToken(token);
}

async function authenticateOptionalRequest(req, authService) {
  const token = getBearerToken(req);
  if (!token) {
    return null;
  }
  return authService.authenticateAccessToken(token);
}

async function authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes) {
  const accessToken = getBearerToken(req);
  if (accessToken) {
    const user = await authService.authenticateAccessToken(accessToken);
    const hasRole = (user.roles || []).some((roleCode) =>
      adminRoleCodes.has(String(roleCode || '').trim().toLowerCase())
    );
    if (!hasRole) {
      sendJson(res, 403, {
        error: {
          code: 'insufficient_admin_role',
          message: `one of admin roles is required: ${Array.from(adminRoleCodes).join(', ')}`
        }
      });
      return null;
    }
    return { mode: 'bearer', user };
  }

  if (!adminApiKey) {
    sendJson(res, 503, {
      error: {
        code: 'admin_api_disabled',
        message: 'admin API is disabled'
      }
    });
    return null;
  }

  const providedApiKey = getAdminApiKeyHeader(req);
  if (!providedApiKey) {
    sendJson(res, 401, {
      error: {
        code: 'missing_admin_api_key',
        message: 'x-admin-api-key header is required'
      }
    });
    return null;
  }
  if (providedApiKey !== adminApiKey) {
    sendJson(res, 403, {
      error: {
        code: 'invalid_admin_api_key',
        message: 'x-admin-api-key is invalid'
      }
    });
    return null;
  }

  return { mode: 'api_key', user: null };
}

async function handleRequest(
  req,
  res,
  authService,
  kycService,
  jobsService,
  feedService,
  profileService,
  organizationsService,
  adminApiKey,
  adminRoleCodes,
  metrics
) {
  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = normalizeRuntimePath(url.pathname);

  if (req.method === 'OPTIONS') {
    sendOptionsResponse(res);
    return;
  }

  if (req.method === 'GET' && pathname === '/health') {
    sendJson(res, 200, { status: 'ok', service: 'api', version: '0.1.0' });
    return;
  }

  if (req.method === 'GET' && pathname === '/metrics') {
    sendJson(res, 200, metrics.snapshot());
    return;
  }

  if (req.method === 'GET' && pathname === '/jobs') {
    const user = await authenticateOptionalRequest(req, authService);
    const result = await jobsService.listJobs({
      q: url.searchParams.get('q') || undefined,
      employmentType: url.searchParams.get('employmentType') || undefined,
      visaSponsored: url.searchParams.get('visaSponsored') || undefined,
      location: url.searchParams.get('location') || undefined,
      cursor: url.searchParams.get('cursor') || undefined,
      limit: url.searchParams.get('limit') || undefined,
      userId: user?.id || null
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'GET' && pathname === '/feed/posts') {
    const user = await authenticateOptionalRequest(req, authService);
    const result = await feedService.listPosts({
      q: url.searchParams.get('q') || undefined,
      category: url.searchParams.get('category') || undefined,
      cursor: url.searchParams.get('cursor') || undefined,
      limit: url.searchParams.get('limit') || undefined,
      userId: user?.id || null
    });
    sendJson(res, 200, result);
    return;
  }

  const jobDetailId = req.method === 'GET' ? matchJobDetailRoute(pathname) : null;
  if (req.method === 'GET' && jobDetailId) {
    const user = await authenticateOptionalRequest(req, authService);
    const result = await jobsService.getJobDetail({
      jobId: jobDetailId,
      userId: user?.id || null
    });
    sendJson(res, 200, result);
    return;
  }

  const applyJobId = req.method === 'POST' ? matchJobApplicationRoute(pathname) : null;
  if (req.method === 'POST' && applyJobId) {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await jobsService.applyToJob({
      userId: user.id,
      jobId: applyJobId,
      note: body.note
    });
    sendJson(res, result.created ? 201 : 200, result);
    return;
  }

  if (req.method === 'POST' && pathname === '/identity/kyc/provider-webhook') {
    const body = await readJsonBody(req);
    const result = await kycService.ingestProviderWebhook({
      webhookSecret: getWebhookSecretHeader(req),
      idempotencyKey: getIdempotencyKeyHeader(req),
      payload: body,
      sourceIp: req.socket?.remoteAddress || null
    });
    sendJson(res, 202, result);
    return;
  }

  if (req.method === 'POST' && pathname === '/auth/register') {
    const body = await readJsonBody(req);
    const result = await authService.register(body);
    sendJson(res, 201, result);
    return;
  }

  if (req.method === 'POST' && pathname === '/auth/login') {
    const body = await readJsonBody(req);
    const result = await authService.login(body);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'POST' && pathname === '/auth/refresh') {
    const body = await readJsonBody(req);
    const result = await authService.refresh(body);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'POST' && pathname === '/auth/logout') {
    const body = await readJsonBody(req);
    await authService.logout(body);
    sendNoContent(res);
    return;
  }

  if (req.method === 'GET' && pathname === '/auth/me') {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    sendJson(res, 200, { user });
    return;
  }

  if (req.method === 'POST' && pathname === '/organizations') {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await organizationsService.createOrganization({
      userId: user.id,
      name: body.name,
      orgType: body.orgType,
      countryCode: body.countryCode
    });
    sendJson(res, 201, result);
    return;
  }

  const organizationVerificationOrgId =
    req.method === 'POST' ? matchOrganizationVerificationRoute(pathname) : null;
  if (req.method === 'POST' && organizationVerificationOrgId) {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await organizationsService.submitVerification({
      userId: user.id,
      orgId: organizationVerificationOrgId,
      registrationNumber: body.registrationNumber,
      legalName: body.legalName,
      supportingObjectKeys: body.supportingObjectKeys
    });
    sendJson(res, 202, result);
    return;
  }

  const organizationVerificationStatusOrgId =
    req.method === 'GET' ? matchOrganizationVerificationStatusRoute(pathname) : null;
  if (req.method === 'GET' && organizationVerificationStatusOrgId) {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const result = await organizationsService.getVerificationStatus({
      userId: user.id,
      orgId: organizationVerificationStatusOrgId
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'POST' && pathname === '/identity/kyc/sessions') {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await kycService.startSession({
      userId: user.id,
      provider: body.provider
    });
    sendJson(res, 201, result);
    return;
  }

  if (req.method === 'GET' && pathname === '/identity/kyc/status') {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const status = await kycService.getStatus({ userId: user.id });
    sendJson(res, 200, status);
    return;
  }

  if (req.method === 'POST' && pathname === '/identity/kyc/upload-url') {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await kycService.createUploadUrl({
      userId: user.id,
      sessionId: body.sessionId,
      documentType: body.documentType,
      fileName: body.fileName,
      contentType: body.contentType,
      contentLength: body.contentLength,
      checksumSha256: body.checksumSha256
    });
    sendJson(res, 201, result);
    return;
  }

  if (req.method === 'POST' && pathname === '/identity/kyc/documents') {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await kycService.uploadDocument({
      userId: user.id,
      sessionId: body.sessionId,
      documentType: body.documentType,
      objectKey: body.objectKey,
      checksumSha256: body.checksumSha256,
      metadata: body.metadata
    });
    sendJson(res, 201, result);
    return;
  }

  const submitSessionId = req.method === 'POST' ? matchKycSubmitRoute(pathname) : null;
  if (req.method === 'POST' && submitSessionId) {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const result = await kycService.submitSession({
      userId: user.id,
      sessionId: submitSessionId
    });
    sendJson(res, 200, result);
    return;
  }

  const providerMetadataSessionId =
    req.method === 'POST' ? matchKycProviderMetadataRoute(pathname) : null;
  if (req.method === 'POST' && providerMetadataSessionId) {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await kycService.setProviderMetadata({
      userId: user.id,
      sessionId: providerMetadataSessionId,
      providerRef: body.providerRef,
      metadata: body.metadata
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'GET' && pathname === '/identity/kyc/history') {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const sessionId = url.searchParams.get('sessionId') || null;
    const history = await kycService.getHistory({
      userId: user.id,
      sessionId
    });
    sendJson(res, 200, history);
    return;
  }

  if (req.method === 'GET' && pathname === '/users/me/saved-jobs') {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const result = await jobsService.listSavedJobs({
      userId: user.id,
      cursor: url.searchParams.get('cursor') || undefined,
      limit: url.searchParams.get('limit') || undefined
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'GET' && pathname === '/users/me/applications') {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const result = await jobsService.listUserApplications({
      userId: user.id,
      cursor: url.searchParams.get('cursor') || undefined,
      limit: url.searchParams.get('limit') || undefined,
      status: url.searchParams.get('status') || undefined
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'GET' && pathname === '/users/me/saved-posts') {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const result = await feedService.listSavedPosts({
      userId: user.id,
      cursor: url.searchParams.get('cursor') || undefined,
      limit: url.searchParams.get('limit') || undefined
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'GET' && pathname === '/users/me/profile') {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const result = await profileService.getProfile({ userId: user.id });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'PATCH' && pathname === '/users/me/profile') {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await profileService.updateProfile({
      userId: user.id,
      fullName: body.fullName,
      avatarUrl: body.avatarUrl
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'GET' && pathname === '/users/me/verification-documents') {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const result = await profileService.listVerificationDocuments({ userId: user.id });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'POST' && pathname === '/users/me/verification/final-request') {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await profileService.requestFinalVerification({
      userId: user.id,
      source: body.source,
      note: body.note
    });
    sendJson(res, result.created ? 201 : 200, result);
    return;
  }

  if (req.method === 'POST' && pathname === '/users/me/saved-posts') {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await feedService.savePost({
      userId: user.id,
      postId: body.postId
    });
    sendJson(res, 200, result);
    return;
  }

  const savedPostId = req.method === 'DELETE' ? matchSavedPostRoute(pathname) : null;
  if (req.method === 'DELETE' && savedPostId) {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const result = await feedService.unsavePost({
      userId: user.id,
      postId: savedPostId
    });
    sendJson(res, 200, result);
    return;
  }

  const applicationJourneyId = req.method === 'GET' ? matchApplicationJourneyRoute(pathname) : null;
  if (req.method === 'GET' && applicationJourneyId) {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const result = await jobsService.getApplicationJourney({
      userId: user.id,
      applicationId: applicationJourneyId
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'POST' && pathname === '/users/me/saved-jobs') {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await jobsService.saveJob({
      userId: user.id,
      jobId: body.jobId
    });
    sendJson(res, 200, result);
    return;
  }

  const savedJobId = req.method === 'DELETE' ? matchSavedJobRoute(pathname) : null;
  if (req.method === 'DELETE' && savedJobId) {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const result = await jobsService.unsaveJob({
      userId: user.id,
      jobId: savedJobId
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'GET' && pathname === '/admin/kyc/review-queue') {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const status = url.searchParams.get('status') || undefined;
    const limit = url.searchParams.get('limit') || undefined;
    const result = await kycService.listReviewQueue({
      status,
      limit
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'POST' && pathname === '/admin/kyc/review') {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const body = await readJsonBody(req);
    const reviewedBy = body.reviewedBy || adminAuth.user?.email;
    const result = await kycService.reviewSession({
      sessionId: body.sessionId,
      decision: body.decision,
      reviewedBy,
      reason: body.reason
    });
    sendJson(res, 200, result);
    return;
  }

  sendJson(res, 404, {
    error: {
      code: 'not_found',
      message: 'route not found'
    }
  });
}

export function createServer({
  authService,
  kycService,
  jobsService,
  feedService,
  profileService,
  organizationsService,
  adminApiKey,
  adminRoleCodes
} = {}) {
  const resolvedAuthService = authService || createAuthService({ store: new InMemoryAuthStore() });
  const resolvedKycService = kycService || createKycService({ store: resolvedAuthService.store });
  const resolvedJobsService = jobsService || createJobsService();
  const resolvedFeedService = feedService || createFeedService();
  const resolvedProfileService = profileService || createProfileService({ store: resolvedAuthService.store });
  const resolvedOrganizationsService = organizationsService || createOrganizationsService();
  const resolvedAdminApiKey =
    adminApiKey !== undefined ? String(adminApiKey).trim() : String(process.env.ADMIN_API_KEY || '').trim();
  const resolvedAdminRoleCodes =
    adminRoleCodes !== undefined ? normalizeRoleCodes(adminRoleCodes) : normalizeRoleCodes(process.env.ADMIN_ROLE_CODES);
  const logger = createLogger({ env: process.env, service: 'api' });
  const metrics = new InMemoryApiMetrics();

  return http.createServer((req, res) => {
    const rawPathname = new URL(req.url || '/', 'http://localhost').pathname;
    const pathname = normalizeRuntimePath(rawPathname);
    const requestId = randomUUID();
    const startedAtMs = Date.now();
    let finalized = false;

    res.setHeader('x-request-id', requestId);
    logger.info('http.request.started', {
      requestId,
      method: req.method,
      path: rawPathname,
      routePath: pathname
    });

    function finalize() {
      if (finalized) {
        return;
      }
      finalized = true;
      const durationMs = Date.now() - startedAtMs;
      metrics.observeHttpRequest({
        method: req.method,
        route: pathname,
        statusCode: res.statusCode,
        durationMs
      });
      logger.info('http.request.finished', {
        requestId,
        method: req.method,
        path: rawPathname,
        routePath: pathname,
        statusCode: res.statusCode,
        durationMs
      });
    }

    res.on('finish', finalize);
    res.on('close', finalize);

    handleRequest(
      req,
      res,
      resolvedAuthService,
      resolvedKycService,
      resolvedJobsService,
      resolvedFeedService,
      resolvedProfileService,
      resolvedOrganizationsService,
      resolvedAdminApiKey,
      resolvedAdminRoleCodes,
      metrics
    ).catch((error) => {
      if (
        isApiError(error) ||
        isKycApiError(error) ||
        isJobsApiError(error) ||
        isFeedApiError(error) ||
        isProfileApiError(error) ||
        isOrganizationsApiError(error)
      ) {
        sendJson(res, error.status, {
          error: {
            code: error.code,
            message: error.message
          }
        });
        return;
      }

      if (error.message === 'invalid json body' || error.message === 'request body too large') {
        sendJson(res, 400, {
          error: {
            code: 'invalid_request_body',
            message: error.message
          }
        });
        return;
      }

      logger.error('http.request.failed', {
        requestId,
        method: req.method,
        path: rawPathname,
        routePath: pathname,
        errorName: error?.name || 'Error',
        errorMessage: error?.message || 'unknown error'
      });

      sendJson(res, 500, {
        error: {
          code: 'internal_error',
          message: 'unexpected server error'
        }
      });
    });
  });
}
