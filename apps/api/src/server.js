import http from 'node:http';
import { createAuthService, isApiError } from './auth/service.js';
import { InMemoryAuthStore } from './auth/store.js';
import { createKycService, isKycApiError } from './identity/kyc-service.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function sendJson(res, status, payload) {
  res.writeHead(status, JSON_HEADERS);
  res.end(JSON.stringify(payload));
}

function sendNoContent(res) {
  res.writeHead(204);
  res.end();
}

function getBearerToken(req) {
  const raw = req.headers.authorization;
  if (!raw || !raw.startsWith('Bearer ')) {
    return null;
  }
  return raw.slice('Bearer '.length).trim();
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

async function handleRequest(req, res, authService, kycService) {
  const url = new URL(req.url || '/', 'http://localhost');

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

  sendJson(res, 404, {
    error: {
      code: 'not_found',
      message: 'route not found'
    }
  });
}

export function createServer({ authService, kycService } = {}) {
  const resolvedAuthService = authService || createAuthService({ store: new InMemoryAuthStore() });
  const resolvedKycService = kycService || createKycService({ store: resolvedAuthService.store });

  return http.createServer((req, res) => {
    handleRequest(req, res, resolvedAuthService, resolvedKycService).catch((error) => {
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
