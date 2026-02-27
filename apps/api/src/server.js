import http from 'node:http';
import { createAuthService, isApiError } from './auth/service.js';
import { InMemoryAuthStore } from './auth/store.js';

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

async function handleRequest(req, res, authService) {
  const url = new URL(req.url || '/', 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { status: 'ok', service: 'api', version: '0.1.0' });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/auth/register') {
    const body = await readJsonBody(req);
    const result = authService.register(body);
    sendJson(res, 201, result);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/auth/login') {
    const body = await readJsonBody(req);
    const result = authService.login(body);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/auth/refresh') {
    const body = await readJsonBody(req);
    const result = authService.refresh(body);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/auth/logout') {
    const body = await readJsonBody(req);
    authService.logout(body);
    sendNoContent(res);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/auth/me') {
    const token = getBearerToken(req);
    if (!token) {
      sendJson(res, 401, {
        error: {
          code: 'missing_access_token',
          message: 'authorization header with bearer token is required'
        }
      });
      return;
    }

    const user = authService.authenticateAccessToken(token);
    sendJson(res, 200, { user });
    return;
  }

  sendJson(res, 404, {
    error: {
      code: 'not_found',
      message: 'route not found'
    }
  });
}

export function createServer({ authService } = {}) {
  const service = authService || createAuthService({ store: new InMemoryAuthStore() });

  return http.createServer((req, res) => {
    handleRequest(req, res, service).catch((error) => {
      if (isApiError(error)) {
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
