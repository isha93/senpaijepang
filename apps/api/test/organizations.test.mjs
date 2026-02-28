import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

async function withServer(run) {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

async function postJson(baseUrl, path, payload, { accessToken } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  return { res, body };
}

async function getJson(baseUrl, path, { accessToken } = {}) {
  const headers = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${baseUrl}${path}`, { headers });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  return { res, body };
}

test('organizations endpoints require access token', async () => {
  await withServer(async (baseUrl) => {
    const createOrg = await postJson(baseUrl, '/organizations', {
      name: 'Acme',
      orgType: 'TSK',
      countryCode: 'JP'
    });
    assert.equal(createOrg.res.status, 401);
    assert.equal(createOrg.body.error.code, 'missing_access_token');

    const submit = await postJson(baseUrl, '/organizations/some-org/verification', {
      registrationNumber: 'REG-1',
      legalName: 'Acme Legal'
    });
    assert.equal(submit.res.status, 401);
    assert.equal(submit.body.error.code, 'missing_access_token');

    const status = await getJson(baseUrl, '/organizations/some-org/verification/status');
    assert.equal(status.res.status, 401);
    assert.equal(status.body.error.code, 'missing_access_token');
  });
});

test('organization create validates payload and normalizes values', async () => {
  await withServer(async (baseUrl) => {
    const register = await postJson(baseUrl, '/auth/register', {
      fullName: 'Org Owner',
      email: 'org-owner@example.com',
      password: 'pass1234'
    });
    assert.equal(register.res.status, 201);
    const accessToken = register.body.accessToken;

    const invalidType = await postJson(
      baseUrl,
      '/organizations',
      {
        name: 'Acme Talent',
        orgType: 'UNKNOWN',
        countryCode: 'JP'
      },
      { accessToken }
    );
    assert.equal(invalidType.res.status, 400);
    assert.equal(invalidType.body.error.code, 'invalid_org_type');

    const invalidCountry = await postJson(
      baseUrl,
      '/organizations',
      {
        name: 'Acme Talent',
        orgType: 'TSK',
        countryCode: 'JPN'
      },
      { accessToken }
    );
    assert.equal(invalidCountry.res.status, 400);
    assert.equal(invalidCountry.body.error.code, 'invalid_country_code');

    const created = await postJson(
      baseUrl,
      '/organizations',
      {
        name: '  Acme Talent  ',
        orgType: 'lpk',
        countryCode: 'id'
      },
      { accessToken }
    );
    assert.equal(created.res.status, 201);
    assert.ok(created.body.id);
    assert.equal(created.body.name, 'Acme Talent');
    assert.equal(created.body.orgType, 'LPK');
    assert.equal(created.body.countryCode, 'ID');
  });
});

test('organization verification flow is owner-scoped and idempotent', async () => {
  await withServer(async (baseUrl) => {
    const owner = await postJson(baseUrl, '/auth/register', {
      fullName: 'Org Verify Owner',
      email: 'org-verify-owner@example.com',
      password: 'pass1234'
    });
    assert.equal(owner.res.status, 201);
    const ownerAccessToken = owner.body.accessToken;

    const other = await postJson(baseUrl, '/auth/register', {
      fullName: 'Org Verify Other',
      email: 'org-verify-other@example.com',
      password: 'pass1234'
    });
    assert.equal(other.res.status, 201);
    const otherAccessToken = other.body.accessToken;

    const created = await postJson(
      baseUrl,
      '/organizations',
      {
        name: 'Org Verify Co',
        orgType: 'TSK',
        countryCode: 'JP'
      },
      { accessToken: ownerAccessToken }
    );
    assert.equal(created.res.status, 201);
    const orgId = created.body.id;

    const statusBefore = await getJson(baseUrl, `/organizations/${orgId}/verification/status`, {
      accessToken: ownerAccessToken
    });
    assert.equal(statusBefore.res.status, 404);
    assert.equal(statusBefore.body.error.code, 'org_verification_not_found');

    const invalidPayload = await postJson(
      baseUrl,
      `/organizations/${orgId}/verification`,
      {
        legalName: 'Org Verify Co Legal'
      },
      { accessToken: ownerAccessToken }
    );
    assert.equal(invalidPayload.res.status, 400);
    assert.equal(invalidPayload.body.error.code, 'invalid_registration_number');

    const submitted = await postJson(
      baseUrl,
      `/organizations/${orgId}/verification`,
      {
        registrationNumber: 'REG-001',
        legalName: 'Org Verify Co Legal',
        supportingObjectKeys: ['org/verify/npwp.pdf']
      },
      { accessToken: ownerAccessToken }
    );
    assert.equal(submitted.res.status, 202);
    assert.ok(submitted.body.id);
    assert.equal(submitted.body.orgId, orgId);
    assert.equal(submitted.body.status, 'PENDING');

    const submittedAgain = await postJson(
      baseUrl,
      `/organizations/${orgId}/verification`,
      {
        registrationNumber: 'REG-002',
        legalName: 'Org Verify Co Legal Updated',
        supportingObjectKeys: ['org/verify/npwp-v2.pdf']
      },
      { accessToken: ownerAccessToken }
    );
    assert.equal(submittedAgain.res.status, 202);
    assert.equal(submittedAgain.body.id, submitted.body.id);
    assert.equal(submittedAgain.body.status, 'PENDING');

    const statusAfter = await getJson(baseUrl, `/organizations/${orgId}/verification/status`, {
      accessToken: ownerAccessToken
    });
    assert.equal(statusAfter.res.status, 200);
    assert.equal(statusAfter.body.id, submitted.body.id);
    assert.equal(statusAfter.body.orgId, orgId);
    assert.equal(statusAfter.body.status, 'PENDING');
    assert.deepEqual(statusAfter.body.reasonCodes, []);

    const otherStatus = await getJson(baseUrl, `/organizations/${orgId}/verification/status`, {
      accessToken: otherAccessToken
    });
    assert.equal(otherStatus.res.status, 404);
    assert.equal(otherStatus.body.error.code, 'org_not_found');

    const otherSubmit = await postJson(
      baseUrl,
      `/organizations/${orgId}/verification`,
      {
        registrationNumber: 'REG-OTHER',
        legalName: 'Other Legal'
      },
      { accessToken: otherAccessToken }
    );
    assert.equal(otherSubmit.res.status, 404);
    assert.equal(otherSubmit.body.error.code, 'org_not_found');
  });
});

test('organizations endpoints work with /v1 prefix alias', async () => {
  await withServer(async (baseUrl) => {
    const register = await postJson(baseUrl, '/v1/auth/register', {
      fullName: 'Org V1 Owner',
      email: 'org-v1-owner@example.com',
      password: 'pass1234'
    });
    assert.equal(register.res.status, 201);
    const accessToken = register.body.accessToken;

    const createOrg = await postJson(
      baseUrl,
      '/v1/organizations',
      {
        name: 'Alias Org',
        orgType: 'EMPLOYER',
        countryCode: 'JP'
      },
      { accessToken }
    );
    assert.equal(createOrg.res.status, 201);
    const orgId = createOrg.body.id;

    const submit = await postJson(
      baseUrl,
      `/v1/organizations/${orgId}/verification`,
      {
        registrationNumber: 'ALIAS-001',
        legalName: 'Alias Org Legal'
      },
      { accessToken }
    );
    assert.equal(submit.res.status, 202);
    assert.equal(submit.body.orgId, orgId);

    const status = await getJson(baseUrl, `/v1/organizations/${orgId}/verification/status`, {
      accessToken
    });
    assert.equal(status.res.status, 200);
    assert.equal(status.body.orgId, orgId);
  });
});
