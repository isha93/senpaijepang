import http from 'node:http';
import { createAuthService, isApiError } from './auth/service.js';
import { InMemoryAuthStore } from './auth/store.js';
import { createKycService, isKycApiError } from './identity/kyc-service.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
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

async function handleRequest(req, res, authService, kycService, adminApiKey) {
  const url = new URL(req.url || '/', 'http://localhost');

  if (req.method === 'OPTIONS') {
    sendOptionsResponse(res);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { status: 'ok', service: 'api', version: '0.1.0' });
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

export function createServer({ authService, kycService, adminApiKey } = {}) {
  const resolvedAuthService = authService || createAuthService({ store: new InMemoryAuthStore() });
  const resolvedKycService = kycService || createKycService({ store: resolvedAuthService.store });
  const resolvedAdminApiKey =
    adminApiKey !== undefined ? String(adminApiKey).trim() : String(process.env.ADMIN_API_KEY || '').trim();

  return http.createServer((req, res) => {
    handleRequest(req, res, resolvedAuthService, resolvedKycService, resolvedAdminApiKey).catch((error) => {
      if (isApiError(error) || isKycApiError(error)) {
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

      sendJson(res, 500, {
        error: {
          code: 'internal_error',
          message: 'unexpected server error'
        }
      });
    });
  });
}
