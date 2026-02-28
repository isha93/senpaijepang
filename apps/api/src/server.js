import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { createAuthService, isApiError } from './auth/service.js';
import { InMemoryAuthStore } from './auth/store.js';
import { createKycService, isKycApiError } from './identity/kyc-service.js';
import { createJobsService, isJobsApiError } from './jobs/service.js';
import { createLogger } from './observability/logger.js';
import { InMemoryApiMetrics } from './observability/metrics.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-admin-api-key, x-kyc-webhook-secret, x-idempotency-key',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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

function authenticateAdminRequest(req, res, adminApiKey) {
  if (!adminApiKey) {
    sendJson(res, 503, {
      error: {
        code: 'admin_api_disabled',
        message: 'admin API is disabled'
      }
    });
    return false;
  }

  const providedApiKey = getAdminApiKeyHeader(req);
  if (!providedApiKey) {
    sendJson(res, 401, {
      error: {
        code: 'missing_admin_api_key',
        message: 'x-admin-api-key header is required'
      }
    });
    return false;
  }
  if (providedApiKey !== adminApiKey) {
    sendJson(res, 403, {
      error: {
        code: 'invalid_admin_api_key',
        message: 'x-admin-api-key is invalid'
      }
    });
    return false;
  }
  return true;
}

async function handleRequest(req, res, authService, kycService, jobsService, adminApiKey, metrics) {
  const url = new URL(req.url || '/', 'http://localhost');

  if (req.method === 'OPTIONS') {
    sendOptionsResponse(res);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { status: 'ok', service: 'api', version: '0.1.0' });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/metrics') {
    sendJson(res, 200, metrics.snapshot());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/jobs') {
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

  const jobDetailId = req.method === 'GET' ? matchJobDetailRoute(url.pathname) : null;
  if (req.method === 'GET' && jobDetailId) {
    const user = await authenticateOptionalRequest(req, authService);
    const result = await jobsService.getJobDetail({
      jobId: jobDetailId,
      userId: user?.id || null
    });
    sendJson(res, 200, result);
    return;
  }

  const applyJobId = req.method === 'POST' ? matchJobApplicationRoute(url.pathname) : null;
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

  if (req.method === 'POST' && url.pathname === '/identity/kyc/provider-webhook') {
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

  if (req.method === 'POST' && url.pathname === '/auth/register') {
    const body = await readJsonBody(req);
    const result = await authService.register(body);
    sendJson(res, 201, result);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/auth/login') {
    const body = await readJsonBody(req);
    const result = await authService.login(body);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/auth/refresh') {
    const body = await readJsonBody(req);
    const result = await authService.refresh(body);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/auth/logout') {
    const body = await readJsonBody(req);
    await authService.logout(body);
    sendNoContent(res);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/auth/me') {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    sendJson(res, 200, { user });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/identity/kyc/sessions') {
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

  if (req.method === 'GET' && url.pathname === '/identity/kyc/status') {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const status = await kycService.getStatus({ userId: user.id });
    sendJson(res, 200, status);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/identity/kyc/upload-url') {
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

  if (req.method === 'POST' && url.pathname === '/identity/kyc/documents') {
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

  const submitSessionId = req.method === 'POST' ? matchKycSubmitRoute(url.pathname) : null;
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
    req.method === 'POST' ? matchKycProviderMetadataRoute(url.pathname) : null;
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

  if (req.method === 'GET' && url.pathname === '/identity/kyc/history') {
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

  if (req.method === 'GET' && url.pathname === '/users/me/saved-jobs') {
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

  if (req.method === 'GET' && url.pathname === '/users/me/applications') {
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

  const applicationJourneyId = req.method === 'GET' ? matchApplicationJourneyRoute(url.pathname) : null;
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

  if (req.method === 'POST' && url.pathname === '/users/me/saved-jobs') {
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

  const savedJobId = req.method === 'DELETE' ? matchSavedJobRoute(url.pathname) : null;
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

  if (req.method === 'GET' && url.pathname === '/admin/kyc/review-queue') {
    const authorized = authenticateAdminRequest(req, res, adminApiKey);
    if (!authorized) {
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

  if (req.method === 'POST' && url.pathname === '/admin/kyc/review') {
    const authorized = authenticateAdminRequest(req, res, adminApiKey);
    if (!authorized) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await kycService.reviewSession({
      sessionId: body.sessionId,
      decision: body.decision,
      reviewedBy: body.reviewedBy,
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

export function createServer({ authService, kycService, jobsService, adminApiKey } = {}) {
  const resolvedAuthService = authService || createAuthService({ store: new InMemoryAuthStore() });
  const resolvedKycService = kycService || createKycService({ store: resolvedAuthService.store });
  const resolvedJobsService = jobsService || createJobsService();
  const resolvedAdminApiKey =
    adminApiKey !== undefined ? String(adminApiKey).trim() : String(process.env.ADMIN_API_KEY || '').trim();
  const logger = createLogger({ env: process.env, service: 'api' });
  const metrics = new InMemoryApiMetrics();

  return http.createServer((req, res) => {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    const requestId = randomUUID();
    const startedAtMs = Date.now();
    let finalized = false;

    res.setHeader('x-request-id', requestId);
    logger.info('http.request.started', {
      requestId,
      method: req.method,
      path: pathname
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
        path: pathname,
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
      resolvedAdminApiKey,
      metrics
    ).catch((error) => {
      if (isApiError(error) || isKycApiError(error) || isJobsApiError(error)) {
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
        path: pathname,
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
