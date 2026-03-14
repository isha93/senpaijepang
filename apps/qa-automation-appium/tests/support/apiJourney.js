const PRODUCTION_API_BASE_URL = 'https://senpai-api-app-production.up.railway.app';
const EXAMPLE_CHECKSUM = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

function resolveApiBaseURL() {
  const baseURL = String(process.env.API_BASE_URL || '').trim();
  if (!baseURL) {
    throw new Error('API_BASE_URL is required for the full journey automation');
  }
  return baseURL.replace(/\/$/, '');
}

function isProductionBaseURL(baseURL) {
  return baseURL === PRODUCTION_API_BASE_URL;
}

function requireJourneyE2EConfig() {
  const baseURL = resolveApiBaseURL();
  const allowProd = String(process.env.E2E_ALLOW_PROD_REGISTRATION || '').trim().toLowerCase() === 'true';
  if (isProductionBaseURL(baseURL) && !allowProd) {
    throw new Error('full journey automation is blocked against production unless E2E_ALLOW_PROD_REGISTRATION=true');
  }

  const adminApiKey = String(process.env.ADMIN_API_KEY || '').trim();
  if (!adminApiKey) {
    throw new Error('ADMIN_API_KEY is required for full journey progression automation');
  }

  return { baseURL, adminApiKey };
}

async function requestJson(pathname, {
  method = 'GET',
  accessToken,
  adminApiKey,
  body,
  headers = {}
} = {}) {
  const baseURL = resolveApiBaseURL();
  const response = await fetch(`${baseURL}/v1${pathname}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(adminApiKey ? { 'x-admin-api-key': adminApiKey } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const rawText = await response.text();
  const json = rawText ? JSON.parse(rawText) : {};

  if (!response.ok) {
    const reason = json?.error?.message || json?.error?.code || `${response.status}`;
    throw new Error(`${method} ${pathname} failed: ${reason}`);
  }

  return json;
}

async function loginUser(email, password) {
  const response = await requestJson('/auth/login', {
    method: 'POST',
    body: {
      identifier: email,
      password
    }
  });
  return response;
}

async function provisionVerifiedCandidate({ accessToken, adminApiKey, reviewedBy = 'qa-automation@senpaijepang.com' }) {
  const createdSession = await requestJson('/identity/kyc/sessions', {
    method: 'POST',
    accessToken,
    body: { provider: 'manual' }
  });
  const sessionId = createdSession.session.id;

  const uploadUrl = await requestJson('/identity/kyc/upload-url', {
    method: 'POST',
    accessToken,
    body: {
      sessionId,
      documentType: 'passport',
      fileName: 'passport.pdf',
      contentType: 'application/pdf',
      contentLength: 420000,
      checksumSha256: EXAMPLE_CHECKSUM
    }
  });

  await requestJson('/identity/kyc/documents', {
    method: 'POST',
    accessToken,
    body: {
      sessionId,
      documentType: 'passport',
      objectKey: uploadUrl.upload.objectKey,
      checksumSha256: EXAMPLE_CHECKSUM
    }
  });

  await requestJson(`/identity/kyc/sessions/${sessionId}/submit`, {
    method: 'POST',
    accessToken,
    body: {}
  });

  await requestJson('/users/me/verification/final-request', {
    method: 'POST',
    accessToken,
    body: {
      source: 'IOS_FULL_JOURNEY_AUTOMATION',
      note: 'Auto-submitted by iOS Appium end-to-end journey'
    }
  });

  return requestJson('/admin/kyc/review', {
    method: 'POST',
    adminApiKey,
    body: {
      sessionId,
      decision: 'VERIFIED',
      reviewedBy,
      reason: 'automation_documents_valid'
    }
  });
}

async function getLatestApplication(accessToken) {
  const payload = await requestJson('/users/me/applications?limit=10', {
    accessToken
  });
  const [latest] = payload.items || [];
  if (!latest) {
    throw new Error('no application found for candidate');
  }
  return latest;
}

async function updateApplicationStatus({ applicationId, status, reason, adminApiKey, updatedBy = 'qa-automation@senpaijepang.com' }) {
  return requestJson(`/admin/applications/${applicationId}/status`, {
    method: 'PATCH',
    adminApiKey,
    body: {
      status,
      reason,
      updatedBy
    }
  });
}

async function progressApplicationToHired({ applicationId, accessToken, adminApiKey }) {
  await updateApplicationStatus({
    applicationId,
    status: 'IN_REVIEW',
    reason: 'Initial screening complete',
    adminApiKey
  });
  await updateApplicationStatus({
    applicationId,
    status: 'INTERVIEW',
    reason: 'Candidate passed interview',
    adminApiKey
  });
  await updateApplicationStatus({
    applicationId,
    status: 'OFFERED',
    reason: 'Employer issued formal offer',
    adminApiKey
  });

  return requestJson(`/users/me/applications/${applicationId}/offer/accept`, {
    method: 'POST',
    accessToken,
    body: {
      reason: 'Accepted in iOS full journey automation'
    }
  });
}

module.exports = {
  getLatestApplication,
  loginUser,
  progressApplicationToHired,
  provisionVerifiedCandidate,
  requireJourneyE2EConfig
};
