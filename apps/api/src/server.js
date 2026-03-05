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
import { createAdminOpsService, isAdminOpsApiError } from './admin/ops-service.js';
import { createLogger } from './observability/logger.js';
import { InMemoryApiMetrics } from './observability/metrics.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-admin-api-key, x-kyc-webhook-secret, x-kyc-webhook-signature, x-kyc-webhook-timestamp, x-idempotency-key',
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

function getWebhookSignatureHeader(req) {
  return String(req.headers['x-kyc-webhook-signature'] || '').trim();
}

function getWebhookTimestampHeader(req) {
  return String(req.headers['x-kyc-webhook-timestamp'] || '').trim();
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

function matchUserApplicationDocumentsRoute(pathname) {
  const match = String(pathname || '').match(/^\/users\/me\/applications\/([^/]+)\/documents$/);
  return match ? match[1] : null;
}

function matchUserApplicationDocumentUploadUrlRoute(pathname) {
  const match = String(pathname || '').match(/^\/users\/me\/applications\/([^/]+)\/documents\/upload-url$/);
  return match ? match[1] : null;
}

function matchUserApplicationOfferRoute(pathname) {
  const match = String(pathname || '').match(/^\/users\/me\/applications\/([^/]+)\/offer\/(accept|decline)$/);
  if (!match) {
    return null;
  }
  return {
    applicationId: match[1],
    action: match[2]
  };
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

function matchAdminJobRoute(pathname) {
  const match = String(pathname || '').match(/^\/admin\/jobs\/([^/]+)$/);
  return match ? match[1] : null;
}

function matchAdminJobLifecycleRoute(pathname) {
  const match = String(pathname || '').match(/^\/admin\/jobs\/([^/]+)\/(publish|unpublish|schedule)$/);
  if (!match) {
    return null;
  }
  return {
    jobId: match[1],
    action: match[2]
  };
}

function matchAdminFeedPostRoute(pathname) {
  const match = String(pathname || '').match(/^\/admin\/feed\/posts\/([^/]+)$/);
  return match ? match[1] : null;
}

function matchAdminFeedPostLifecycleRoute(pathname) {
  const match = String(pathname || '').match(/^\/admin\/feed\/posts\/([^/]+)\/(publish|unpublish|schedule)$/);
  if (!match) {
    return null;
  }
  return {
    postId: match[1],
    action: match[2]
  };
}

function matchAdminOrganizationVerificationRoute(pathname) {
  const match = String(pathname || '').match(/^\/admin\/organizations\/([^/]+)\/verification$/);
  return match ? match[1] : null;
}

function matchAdminKycDocumentPreviewRoute(pathname) {
  const match = String(pathname || '').match(/^\/admin\/kyc\/documents\/([^/]+)\/preview-url$/);
  return match ? match[1] : null;
}

function matchAdminCaseActionRoute(pathname) {
  const match = String(pathname || '').match(/^\/admin\/cases\/([^/]+)\/action$/);
  return match ? match[1] : null;
}

function matchAdminUserRoute(pathname) {
  const match = String(pathname || '').match(/^\/admin\/users\/([^/]+)$/);
  return match ? match[1] : null;
}

function matchAdminUserProfileRoute(pathname) {
  const match = String(pathname || '').match(/^\/admin\/users\/([^/]+)\/profile$/);
  return match ? match[1] : null;
}

function matchAdminUserKycHistoryRoute(pathname) {
  const match = String(pathname || '').match(/^\/admin\/users\/([^/]+)\/kyc\/history$/);
  return match ? match[1] : null;
}

function matchAdminApplicationRoute(pathname) {
  const match = String(pathname || '').match(/^\/admin\/applications\/([^/]+)$/);
  return match ? match[1] : null;
}

function matchAdminApplicationJourneyRoute(pathname) {
  const match = String(pathname || '').match(/^\/admin\/applications\/([^/]+)\/journey$/);
  return match ? match[1] : null;
}

function matchAdminApplicationStatusRoute(pathname) {
  const match = String(pathname || '').match(/^\/admin\/applications\/([^/]+)\/status$/);
  return match ? match[1] : null;
}

function matchAdminApplicationDocumentsRoute(pathname) {
  const match = String(pathname || '').match(/^\/admin\/applications\/([^/]+)\/documents$/);
  return match ? match[1] : null;
}

function matchAdminApplicationDocumentRoute(pathname) {
  const match = String(pathname || '').match(/^\/admin\/applications\/([^/]+)\/documents\/([^/]+)$/);
  if (!match) {
    return null;
  }
  return {
    applicationId: match[1],
    documentId: match[2]
  };
}

function matchAdminApplicationDocumentPreviewRoute(pathname) {
  const match = String(pathname || '').match(/^\/admin\/applications\/documents\/([^/]+)\/preview-url$/);
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

async function readJsonBodyWithRaw(req) {
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
        resolve({ raw: '', body: {} });
        return;
      }

      try {
        resolve({ raw, body: JSON.parse(raw) });
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

function requireSuperAdminForAdminUserManagement(res, adminAuth) {
  if (!adminAuth || adminAuth.mode !== 'bearer') {
    return true;
  }
  const hasSuperAdminRole = (adminAuth.user?.roles || []).some(
    (roleCode) => String(roleCode || '').trim().toLowerCase() === 'super_admin'
  );
  if (hasSuperAdminRole) {
    return true;
  }

  sendJson(res, 403, {
    error: {
      code: 'insufficient_admin_role',
      message: 'super_admin role is required for admin user management'
    }
  });
  return false;
}

function mapLegacyAdminCaseStatus(status) {
  const normalized = String(status || '')
    .trim()
    .toUpperCase();
  if (!normalized) {
    return undefined;
  }

  const statusMap = {
    OPEN: 'SUBMITTED',
    IN_REVIEW: 'MANUAL_REVIEW',
    WAITING_EVIDENCE: 'CREATED',
    RESOLVED: 'VERIFIED',
    REJECTED: 'REJECTED'
  };
  return statusMap[normalized] || normalized;
}

function mapLegacyAdminCaseActionToDecision(action) {
  const normalized = String(action || '')
    .trim()
    .toUpperCase();
  if (!normalized) {
    return null;
  }

  const actionMap = {
    REQUEST_EVIDENCE: 'MANUAL_REVIEW',
    ESCALATE: 'MANUAL_REVIEW',
    RESOLVE_VALID: 'VERIFIED',
    RESOLVE_INVALID: 'REJECTED',
    BLACKLIST_ENTITY: 'REJECTED'
  };
  return actionMap[normalized] || null;
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
  adminOpsService,
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
    const payload = await readJsonBodyWithRaw(req);
    const result = await kycService.ingestProviderWebhook({
      webhookSecret: getWebhookSecretHeader(req),
      webhookSignature: getWebhookSignatureHeader(req),
      webhookTimestamp: getWebhookTimestampHeader(req),
      idempotencyKey: getIdempotencyKeyHeader(req),
      payloadRaw: payload.raw,
      payload: payload.body,
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

  if (req.method === 'GET' && pathname === '/trust/profile') {
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

  const userApplicationDocumentsUploadUrlId =
    req.method === 'POST' ? matchUserApplicationDocumentUploadUrlRoute(pathname) : null;
  if (req.method === 'POST' && userApplicationDocumentsUploadUrlId) {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await jobsService.createUserApplicationDocumentUploadUrl({
      userId: user.id,
      applicationId: userApplicationDocumentsUploadUrlId,
      documentType: body.documentType,
      fileName: body.fileName,
      contentType: body.contentType,
      contentLength: body.contentLength,
      checksumSha256: body.checksumSha256
    });
    sendJson(res, 201, result);
    return;
  }

  const userApplicationDocumentsId =
    ['GET', 'POST'].includes(req.method || '') ? matchUserApplicationDocumentsRoute(pathname) : null;
  if (req.method === 'GET' && userApplicationDocumentsId) {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const result = await jobsService.listUserApplicationDocuments({
      userId: user.id,
      applicationId: userApplicationDocumentsId
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'POST' && userApplicationDocumentsId) {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await jobsService.registerUserApplicationDocument({
      userId: user.id,
      applicationId: userApplicationDocumentsId,
      documentType: body.documentType,
      fileName: body.fileName,
      contentType: body.contentType,
      contentLength: body.contentLength,
      objectKey: body.objectKey,
      checksumSha256: body.checksumSha256
    });
    sendJson(res, 201, result);
    return;
  }

  const userApplicationOfferAction =
    req.method === 'POST' ? matchUserApplicationOfferRoute(pathname) : null;
  if (req.method === 'POST' && userApplicationOfferAction) {
    const user = await authenticateRequest(req, res, authService);
    if (!user) {
      return;
    }

    const body = await readJsonBody(req);
    let result;
    if (userApplicationOfferAction.action === 'accept') {
      result = await jobsService.acceptOfferForUser({
        userId: user.id,
        applicationId: userApplicationOfferAction.applicationId,
        reason: body.reason
      });
    } else {
      result = await jobsService.declineOfferForUser({
        userId: user.id,
        applicationId: userApplicationOfferAction.applicationId,
        reason: body.reason
      });
    }
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

  if (req.method === 'GET' && pathname === '/admin/users') {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }
    if (!requireSuperAdminForAdminUserManagement(res, adminAuth)) {
      return;
    }

    const result = await authService.listAdminUsers({
      q: url.searchParams.get('q') || undefined,
      cursor: url.searchParams.get('cursor') || undefined,
      limit: url.searchParams.get('limit') || undefined
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'GET' && pathname === '/admin/overview/summary') {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const result = await adminOpsService.getOverviewSummary();
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'GET' && pathname === '/admin/activity-events') {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const result = await adminOpsService.listActivityEvents({
      type: url.searchParams.get('type') || undefined,
      actorId: url.searchParams.get('actorId') || undefined,
      from: url.searchParams.get('from') || undefined,
      to: url.searchParams.get('to') || undefined,
      cursor: url.searchParams.get('cursor') || undefined,
      limit: url.searchParams.get('limit') || undefined
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'GET' && pathname === '/admin/audit/events') {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const result = await adminOpsService.listAuditEvents({
      type: url.searchParams.get('type') || undefined,
      actorType: url.searchParams.get('actorType') || undefined,
      actorId: url.searchParams.get('actorId') || undefined,
      entityType: url.searchParams.get('entityType') || undefined,
      entityId: url.searchParams.get('entityId') || undefined,
      action: url.searchParams.get('action') || undefined,
      from: url.searchParams.get('from') || undefined,
      to: url.searchParams.get('to') || undefined,
      cursor: url.searchParams.get('cursor') || undefined,
      limit: url.searchParams.get('limit') || undefined
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'POST' && pathname === '/admin/users') {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }
    if (!requireSuperAdminForAdminUserManagement(res, adminAuth)) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await authService.createAdminUser({
      fullName: body.fullName,
      email: body.email,
      password: body.password,
      roles: body.roles
    });
    sendJson(res, 201, result);
    return;
  }

  const adminUserId = req.method === 'GET' ? matchAdminUserRoute(pathname) : null;
  if (req.method === 'GET' && adminUserId) {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const result = await authService.getAdminUser({ userId: adminUserId });
    sendJson(res, 200, result);
    return;
  }

  const adminUserProfileUserId = req.method === 'GET' ? matchAdminUserProfileRoute(pathname) : null;
  if (req.method === 'GET' && adminUserProfileUserId) {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const result = await profileService.getProfile({ userId: adminUserProfileUserId });
    sendJson(res, 200, result);
    return;
  }

  const adminUserKycHistoryUserId = req.method === 'GET' ? matchAdminUserKycHistoryRoute(pathname) : null;
  if (req.method === 'GET' && adminUserKycHistoryUserId) {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    await authService.getAdminUser({ userId: adminUserKycHistoryUserId });
    const result = await kycService.getHistory({
      userId: adminUserKycHistoryUserId,
      sessionId: url.searchParams.get('sessionId') || undefined
    });
    sendJson(res, 200, result);
    return;
  }

  const adminUserPatchId = req.method === 'PATCH' ? matchAdminUserRoute(pathname) : null;
  if (req.method === 'PATCH' && adminUserPatchId) {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }
    if (!requireSuperAdminForAdminUserManagement(res, adminAuth)) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await authService.updateAdminUser({
      userId: adminUserPatchId,
      fullName: body.fullName,
      password: body.password,
      roles: body.roles
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'GET' && pathname === '/admin/applications') {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const result = await jobsService.listAdminApplications({
      q: url.searchParams.get('q') || undefined,
      status: url.searchParams.get('status') || undefined,
      jobId: url.searchParams.get('jobId') || undefined,
      orgId: url.searchParams.get('orgId') || undefined,
      cursor: url.searchParams.get('cursor') || undefined,
      limit: url.searchParams.get('limit') || undefined
    });
    sendJson(res, 200, result);
    return;
  }

  const adminApplicationJourneyId = req.method === 'GET' ? matchAdminApplicationJourneyRoute(pathname) : null;
  if (req.method === 'GET' && adminApplicationJourneyId) {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const result = await jobsService.getAdminApplicationJourney({
      applicationId: adminApplicationJourneyId
    });
    sendJson(res, 200, result);
    return;
  }

  const adminApplicationStatusId = req.method === 'PATCH' ? matchAdminApplicationStatusRoute(pathname) : null;
  if (req.method === 'PATCH' && adminApplicationStatusId) {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await jobsService.updateAdminApplicationStatus({
      applicationId: adminApplicationStatusId,
      status: body.status,
      reason: body.reason,
      updatedBy: body.updatedBy || adminAuth.user?.email || null
    });
    sendJson(res, 200, result);
    return;
  }

  const adminApplicationDocumentsId =
    req.method === 'GET' ? matchAdminApplicationDocumentsRoute(pathname) : null;
  if (req.method === 'GET' && adminApplicationDocumentsId) {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const result = await jobsService.listAdminApplicationDocuments({
      applicationId: adminApplicationDocumentsId
    });
    sendJson(res, 200, result);
    return;
  }

  const adminApplicationDocumentTarget =
    req.method === 'PATCH' ? matchAdminApplicationDocumentRoute(pathname) : null;
  if (req.method === 'PATCH' && adminApplicationDocumentTarget) {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await jobsService.reviewAdminApplicationDocument({
      applicationId: adminApplicationDocumentTarget.applicationId,
      documentId: adminApplicationDocumentTarget.documentId,
      reviewStatus: body.reviewStatus,
      reviewReason: body.reviewReason,
      reviewedBy: body.reviewedBy || adminAuth.user?.email || null
    });
    sendJson(res, 200, result);
    return;
  }

  const adminApplicationDocumentPreviewId =
    req.method === 'POST' ? matchAdminApplicationDocumentPreviewRoute(pathname) : null;
  if (req.method === 'POST' && adminApplicationDocumentPreviewId) {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await jobsService.issueAdminApplicationDocumentPreviewUrl({
      documentId: adminApplicationDocumentPreviewId,
      expiresSec: body.expiresSec
    });
    sendJson(res, 200, result);
    return;
  }

  const adminApplicationId = req.method === 'GET' ? matchAdminApplicationRoute(pathname) : null;
  if (req.method === 'GET' && adminApplicationId) {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const result = await jobsService.getAdminApplication({
      applicationId: adminApplicationId
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'GET' && pathname === '/admin/jobs') {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const result = await jobsService.listAdminJobs({
      q: url.searchParams.get('q') || undefined,
      cursor: url.searchParams.get('cursor') || undefined,
      limit: url.searchParams.get('limit') || undefined
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'POST' && pathname === '/admin/jobs') {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await jobsService.createJob(body);
    sendJson(res, 201, result);
    return;
  }

  if (req.method === 'POST' && pathname === '/admin/jobs/bulk') {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await jobsService.bulkUpdateJobs({
      action: body.action,
      jobIds: body.jobIds,
      scheduledAt: body.scheduledAt,
      publishedAt: body.publishedAt
    });
    sendJson(res, 200, result);
    return;
  }

  const adminJobLifecycle =
    req.method === 'POST' ? matchAdminJobLifecycleRoute(pathname) : null;
  if (req.method === 'POST' && adminJobLifecycle) {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const body = await readJsonBody(req);
    let result;
    if (adminJobLifecycle.action === 'publish') {
      result = await jobsService.publishJob({
        jobId: adminJobLifecycle.jobId,
        publishedAt: body.publishedAt
      });
    } else if (adminJobLifecycle.action === 'unpublish') {
      result = await jobsService.unpublishJob({
        jobId: adminJobLifecycle.jobId
      });
    } else {
      result = await jobsService.scheduleJob({
        jobId: adminJobLifecycle.jobId,
        scheduledAt: body.scheduledAt
      });
    }
    sendJson(res, 200, result);
    return;
  }

  const adminJobId = ['PATCH', 'DELETE'].includes(req.method || '') ? matchAdminJobRoute(pathname) : null;
  if (req.method === 'PATCH' && adminJobId) {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await jobsService.updateJob({
      jobId: adminJobId,
      ...body
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'DELETE' && adminJobId) {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const result = await jobsService.deleteJob({
      jobId: adminJobId
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'GET' && pathname === '/admin/feed/posts') {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const result = await feedService.listAdminPosts({
      q: url.searchParams.get('q') || undefined,
      category: url.searchParams.get('category') || undefined,
      cursor: url.searchParams.get('cursor') || undefined,
      limit: url.searchParams.get('limit') || undefined
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'POST' && pathname === '/admin/feed/posts') {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await feedService.createPost(body);
    sendJson(res, 201, result);
    return;
  }

  if (req.method === 'POST' && pathname === '/admin/feed/posts/bulk') {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await feedService.bulkUpdatePosts({
      action: body.action,
      postIds: body.postIds,
      scheduledAt: body.scheduledAt,
      publishedAt: body.publishedAt
    });
    sendJson(res, 200, result);
    return;
  }

  const adminFeedLifecycle =
    req.method === 'POST' ? matchAdminFeedPostLifecycleRoute(pathname) : null;
  if (req.method === 'POST' && adminFeedLifecycle) {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const body = await readJsonBody(req);
    let result;
    if (adminFeedLifecycle.action === 'publish') {
      result = await feedService.publishPost({
        postId: adminFeedLifecycle.postId,
        publishedAt: body.publishedAt
      });
    } else if (adminFeedLifecycle.action === 'unpublish') {
      result = await feedService.unpublishPost({
        postId: adminFeedLifecycle.postId
      });
    } else {
      result = await feedService.schedulePost({
        postId: adminFeedLifecycle.postId,
        scheduledAt: body.scheduledAt
      });
    }
    sendJson(res, 200, result);
    return;
  }

  const adminFeedPostId =
    ['PATCH', 'DELETE'].includes(req.method || '') ? matchAdminFeedPostRoute(pathname) : null;
  if (req.method === 'PATCH' && adminFeedPostId) {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await feedService.updatePost({
      postId: adminFeedPostId,
      ...body
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'DELETE' && adminFeedPostId) {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const result = await feedService.deletePost({
      postId: adminFeedPostId
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'GET' && pathname === '/admin/organizations') {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const result = await organizationsService.listOrganizationsForAdmin({
      cursor: url.searchParams.get('cursor') || undefined,
      limit: url.searchParams.get('limit') || undefined,
      orgType: url.searchParams.get('orgType') || undefined,
      verificationStatus: url.searchParams.get('verificationStatus') || undefined
    });
    sendJson(res, 200, result);
    return;
  }

  const adminOrganizationVerificationOrgId =
    req.method === 'PATCH' ? matchAdminOrganizationVerificationRoute(pathname) : null;
  if (req.method === 'PATCH' && adminOrganizationVerificationOrgId) {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await organizationsService.adminUpdateVerification({
      orgId: adminOrganizationVerificationOrgId,
      status: body.status,
      reasonCodes: body.reasonCodes
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
    const cursor = url.searchParams.get('cursor') || undefined;
    const limit = url.searchParams.get('limit') || undefined;
    const result = await kycService.listReviewQueue({
      status,
      cursor,
      limit
    });
    sendJson(res, 200, result);
    return;
  }

  const adminKycPreviewDocumentId =
    req.method === 'POST' ? matchAdminKycDocumentPreviewRoute(pathname) : null;
  if (req.method === 'POST' && adminKycPreviewDocumentId) {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const body = await readJsonBody(req);
    const result = await kycService.issueDocumentPreviewUrl({
      documentId: adminKycPreviewDocumentId,
      expiresSec: body.expiresSec
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'GET' && pathname === '/admin/cases') {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const status = mapLegacyAdminCaseStatus(url.searchParams.get('status'));
    const cursor = url.searchParams.get('cursor') || undefined;
    const limit = url.searchParams.get('limit') || undefined;
    const result = await kycService.listReviewQueue({
      status,
      cursor,
      limit
    });
    sendJson(res, 200, result);
    return;
  }

  const adminCaseActionCaseId = req.method === 'POST' ? matchAdminCaseActionRoute(pathname) : null;
  if (req.method === 'POST' && adminCaseActionCaseId) {
    const adminAuth = await authenticateAdminRequest(req, res, authService, adminApiKey, adminRoleCodes);
    if (!adminAuth) {
      return;
    }

    const body = await readJsonBody(req);
    const mappedDecision = mapLegacyAdminCaseActionToDecision(body.action);
    if (body.action && !mappedDecision) {
      sendJson(res, 400, {
        error: {
          code: 'unsupported_case_action',
          message:
            'action must be one of REQUEST_EVIDENCE, ESCALATE, RESOLVE_VALID, RESOLVE_INVALID, BLACKLIST_ENTITY'
        }
      });
      return;
    }

    const reviewedBy = body.reviewedBy || adminAuth.user?.email || 'legacy_admin_case_action';
    const result = await kycService.reviewSession({
      sessionId: adminCaseActionCaseId,
      decision: body.decision || mappedDecision,
      reviewedBy,
      reason: body.reason || body.note
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
  adminOpsService,
  adminApiKey,
  adminRoleCodes
} = {}) {
  const resolvedAuthService = authService || createAuthService({ store: new InMemoryAuthStore() });
  const resolvedKycService = kycService || createKycService({ store: resolvedAuthService.store });
  const resolvedJobsService = jobsService || createJobsService({ userDirectory: resolvedAuthService.store });
  const resolvedFeedService = feedService || createFeedService();
  const resolvedProfileService = profileService || createProfileService({ store: resolvedAuthService.store });
  const resolvedOrganizationsService =
    organizationsService || createOrganizationsService({ store: resolvedAuthService.store });
  const resolvedAdminOpsService =
    adminOpsService ||
    createAdminOpsService({
      kycService: resolvedKycService,
      jobsService: resolvedJobsService,
      feedService: resolvedFeedService,
      organizationsService: resolvedOrganizationsService
    });
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
      resolvedAdminOpsService,
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
        isOrganizationsApiError(error) ||
        isAdminOpsApiError(error)
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
