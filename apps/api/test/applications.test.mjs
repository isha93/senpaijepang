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
  return { res, body: text ? JSON.parse(text) : null };
}

async function getJson(baseUrl, path, { accessToken } = {}) {
  const headers = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${baseUrl}${path}`, { headers });
  const text = await res.text();
  return { res, body: text ? JSON.parse(text) : null };
}

test('job application flow: apply -> list -> journey', async () => {
  await withServer(async (baseUrl) => {
    const register = await postJson(baseUrl, '/auth/register', {
      fullName: 'Applicant One',
      email: 'applicant-one@example.com',
      password: 'pass1234'
    });
    assert.equal(register.res.status, 201);
    const accessToken = register.body.accessToken;

    const apply = await postJson(
      baseUrl,
      '/jobs/job_tokyo_senior_welder_001/applications',
      { note: 'Ready to relocate and available next month.' },
      { accessToken }
    );

    assert.equal(apply.res.status, 201);
    assert.equal(apply.body.created, true);
    assert.equal(apply.body.application.jobId, 'job_tokyo_senior_welder_001');
    assert.equal(apply.body.application.status, 'SUBMITTED');
    assert.ok(apply.body.application.id);

    const list = await getJson(baseUrl, '/users/me/applications', { accessToken });
    assert.equal(list.res.status, 200);
    assert.equal(list.body.items.length, 1);
    assert.equal(list.body.items[0].id, apply.body.application.id);
    assert.equal(list.body.items[0].status, 'SUBMITTED');
    assert.equal(list.body.items[0].job.title, 'Senior Welder');

    const journey = await getJson(
      baseUrl,
      `/users/me/applications/${apply.body.application.id}/journey`,
      { accessToken }
    );
    assert.equal(journey.res.status, 200);
    assert.equal(journey.body.application.id, apply.body.application.id);
    assert.equal(journey.body.journey.length, 1);
    assert.equal(journey.body.journey[0].status, 'SUBMITTED');
  });
});

test('job application is idempotent per user and job', async () => {
  await withServer(async (baseUrl) => {
    const register = await postJson(baseUrl, '/auth/register', {
      fullName: 'Applicant Two',
      email: 'applicant-two@example.com',
      password: 'pass1234'
    });
    assert.equal(register.res.status, 201);
    const accessToken = register.body.accessToken;

    const first = await postJson(
      baseUrl,
      '/jobs/job_osaka_cnc_operator_002/applications',
      {},
      { accessToken }
    );
    assert.equal(first.res.status, 201);
    assert.equal(first.body.created, true);

    const second = await postJson(
      baseUrl,
      '/jobs/job_osaka_cnc_operator_002/applications',
      { note: 'Second try should be idempotent.' },
      { accessToken }
    );
    assert.equal(second.res.status, 200);
    assert.equal(second.body.created, false);
    assert.equal(second.body.application.id, first.body.application.id);

    const list = await getJson(baseUrl, '/users/me/applications', { accessToken });
    assert.equal(list.res.status, 200);
    assert.equal(list.body.items.length, 1);
  });
});

test('application endpoints enforce auth and ownership', async () => {
  await withServer(async (baseUrl) => {
    const guestApply = await postJson(baseUrl, '/jobs/job_tokyo_senior_welder_001/applications', {});
    assert.equal(guestApply.res.status, 401);
    assert.equal(guestApply.body.error.code, 'missing_access_token');

    const ownerRegister = await postJson(baseUrl, '/auth/register', {
      fullName: 'Owner Applicant',
      email: 'owner-applicant@example.com',
      password: 'pass1234'
    });
    assert.equal(ownerRegister.res.status, 201);
    const ownerToken = ownerRegister.body.accessToken;

    const otherRegister = await postJson(baseUrl, '/auth/register', {
      fullName: 'Other Applicant',
      email: 'other-applicant@example.com',
      password: 'pass1234'
    });
    assert.equal(otherRegister.res.status, 201);
    const otherToken = otherRegister.body.accessToken;

    const apply = await postJson(baseUrl, '/jobs/job_fukuoka_eldercare_assistant_004/applications', {}, {
      accessToken: ownerToken
    });
    assert.equal(apply.res.status, 201);
    const applicationId = apply.body.application.id;

    const forbiddenJourney = await getJson(baseUrl, `/users/me/applications/${applicationId}/journey`, {
      accessToken: otherToken
    });
    assert.equal(forbiddenJourney.res.status, 404);
    assert.equal(forbiddenJourney.body.error.code, 'application_not_found');

    const missingJobApply = await postJson(baseUrl, '/jobs/job_missing_404/applications', {}, { accessToken: ownerToken });
    assert.equal(missingJobApply.res.status, 404);
    assert.equal(missingJobApply.body.error.code, 'job_not_found');
  });
});
