import {
  AuthUser,
  clearSession,
  getAccessToken,
  getRefreshToken,
  setTokens,
  setUser
} from '../auth/tokenStore';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '';
const ADMIN_API_KEY = (import.meta.env.VITE_ADMIN_API_KEY as string | undefined)?.trim() || '';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
  skipRefresh?: boolean;
};

export type ApiError = {
  status: number;
  code: string;
  message: string;
};

function resolveApiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

function normalizeUser(input: unknown): AuthUser | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const value = input as {
    id?: unknown;
    fullName?: unknown;
    email?: unknown;
    roles?: unknown;
  };

  if (
    typeof value.id !== 'string' ||
    typeof value.fullName !== 'string' ||
    typeof value.email !== 'string' ||
    !Array.isArray(value.roles) ||
    value.roles.some((role) => typeof role !== 'string')
  ) {
    return null;
  }

  return {
    id: value.id,
    fullName: value.fullName,
    email: value.email,
    roles: value.roles
  };
}

async function executeFetch(path: string, options: RequestOptions) {
  const headers: Record<string, string> = {
    ...(options.headers || {})
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.auth) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return fetch(resolveApiUrl(path), {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  const response = await fetch(resolveApiUrl('/auth/refresh'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) {
    return false;
  }

  const data = (await response.json().catch(() => null)) as
    | {
        accessToken?: unknown;
        refreshToken?: unknown;
        user?: unknown;
      }
    | null;

  if (!data || typeof data.accessToken !== 'string' || typeof data.refreshToken !== 'string') {
    return false;
  }

  setTokens(data.accessToken, data.refreshToken);
  const user = normalizeUser(data.user);
  if (user) {
    setUser(user);
  }

  return true;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await executeFetch(path, options);

  if (
    response.status === 401 &&
    options.auth &&
    !options.skipRefresh &&
    path !== '/auth/refresh' &&
    path !== '/auth/login'
  ) {
    const refreshed = await refreshAccessToken().catch(() => false);
    if (refreshed) {
      return apiRequest<T>(path, {
        ...options,
        skipRefresh: true
      });
    }

    clearSession();
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const error: ApiError = {
      status: response.status,
      code: data?.error?.code || 'unknown_error',
      message: data?.error?.message || 'Unexpected request error'
    };
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const apiBaseUrl = API_BASE_URL;
export const hasAdminApiKey = Boolean(ADMIN_API_KEY);

export function withAdminHeaders(headers: Record<string, string> = {}) {
  if (!ADMIN_API_KEY) {
    return headers;
  }

  return {
    ...headers,
    'x-admin-api-key': ADMIN_API_KEY
  };
}
