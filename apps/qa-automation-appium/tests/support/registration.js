const PRODUCTION_API_BASE_URL = 'https://senpai-api-app-production.up.railway.app';

function resolveApiBaseURL() {
  return String(process.env.API_BASE_URL || '').trim();
}

function isRegistrationE2EEnabled() {
  const baseURL = resolveApiBaseURL();
  if (!baseURL) return false;
  if (baseURL === PRODUCTION_API_BASE_URL && String(process.env.E2E_ALLOW_PROD_REGISTRATION || '').trim().toLowerCase() !== 'true') {
    return false;
  }
  return true;
}

function registrationSkipReason() {
  const baseURL = resolveApiBaseURL();
  if (!baseURL) {
    return 'registration e2e requires API_BASE_URL to be set';
  }
  if (baseURL === PRODUCTION_API_BASE_URL && String(process.env.E2E_ALLOW_PROD_REGISTRATION || '').trim().toLowerCase() !== 'true') {
    return 'registration e2e is blocked against production by default';
  }
  return '';
}

function buildUniqueRegistrationUser() {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return {
    fullName: `Appium ${stamp}`,
    email: `appium.${stamp}@example.com`,
    password: 'Password1234'
  };
}

function resolveStaticVerificationCode(baseURL) {
  const configuredCode = String(process.env.E2E_STATIC_VERIFICATION_CODE || '').trim();
  if (configuredCode) {
    if (!/^\d{6}$/.test(configuredCode)) {
      throw new Error('E2E_STATIC_VERIFICATION_CODE must be a 6 digit code');
    }
    return configuredCode;
  }

  const allowProd = String(process.env.E2E_ALLOW_PROD_REGISTRATION || '').trim().toLowerCase() === 'true';
  if (allowProd && baseURL === PRODUCTION_API_BASE_URL) {
    return '777777';
  }

  return '';
}

async function fetchVerificationCodeForRegistration(email) {
  const baseURL = resolveApiBaseURL();
  if (!baseURL) {
    throw new Error('API_BASE_URL is required to resolve verification code for e2e registration');
  }

  const staticCode = resolveStaticVerificationCode(baseURL);
  if (staticCode) {
    return staticCode;
  }

  const response = await fetch(`${baseURL}/v1/auth/email-verification/resend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const reason = body?.error?.message || body?.error?.code || response.status;
    throw new Error(`failed to resend verification code: ${reason}`);
  }

  if (!body.developmentCode) {
    throw new Error('resend response does not expose developmentCode; enable non-production dev OTP exposure for e2e');
  }

  return body.developmentCode;
}

module.exports = {
  buildUniqueRegistrationUser,
  fetchVerificationCodeForRegistration,
  isRegistrationE2EEnabled,
  registrationSkipReason
};
