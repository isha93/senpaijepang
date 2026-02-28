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

test('jobs listing and detail available for guest users', async () => {
  await withServer(async (baseUrl) => {
    const jobs = await getJson(baseUrl, '/jobs?limit=2');
    assert.equal(jobs.res.status, 200);
    assert.equal(Array.isArray(jobs.body.items), true);
    assert.equal(jobs.body.items.length, 2);
    assert.equal(jobs.body.items[0].viewerState.authenticated, false);
    assert.equal(jobs.body.items[0].viewerState.saved, false);
    assert.equal(jobs.body.items[0].viewerState.canApply, false);

    const firstJobId = jobs.body.items[0].id;
    const detail = await getJson(baseUrl, `/jobs/${firstJobId}`);
    assert.equal(detail.res.status, 200);
    assert.equal(detail.body.job.id, firstJobId);
    assert.equal(Array.isArray(detail.body.job.requirements), true);
    assert.equal(detail.body.viewerState.authenticated, false);
    assert.equal(detail.body.viewerState.saved, false);
  });
});

test('saved jobs flow: save, list, detail sync, unsave', async () => {
  await withServer(async (baseUrl) => {
    const register = await postJson(baseUrl, '/auth/register', {
      fullName: 'Jobs User',
      email: 'jobs-user@example.com',
      password: 'pass1234'
    });
    assert.equal(register.res.status, 201);
    const accessToken = register.body.accessToken;

    const jobsBefore = await getJson(baseUrl, '/jobs', { accessToken });
    assert.equal(jobsBefore.res.status, 200);
    const targetJobId = jobsBefore.body.items[0].id;
    assert.equal(jobsBefore.body.items[0].viewerState.saved, false);

    const save = await postJson(baseUrl, '/users/me/saved-jobs', { jobId: targetJobId }, { accessToken });
    assert.equal(save.res.status, 200);
    assert.equal(save.body.saved, true);
    assert.equal(save.body.jobId, targetJobId);

    const jobsAfterSave = await getJson(baseUrl, '/jobs', { accessToken });
    assert.equal(jobsAfterSave.res.status, 200);
    const savedItem = jobsAfterSave.body.items.find((item) => item.id === targetJobId);
    assert.equal(savedItem.viewerState.saved, true);

    const detailAfterSave = await getJson(baseUrl, `/jobs/${targetJobId}`, { accessToken });
    assert.equal(detailAfterSave.res.status, 200);
    assert.equal(detailAfterSave.body.viewerState.saved, true);
    assert.equal(detailAfterSave.body.viewerState.authenticated, true);
    assert.equal(detailAfterSave.body.viewerState.canApply, true);

    const savedJobs = await getJson(baseUrl, '/users/me/saved-jobs', { accessToken });
    assert.equal(savedJobs.res.status, 200);
    assert.equal(savedJobs.body.items.length, 1);
    assert.equal(savedJobs.body.items[0].id, targetJobId);
    assert.equal(savedJobs.body.items[0].viewerState.saved, true);

    const unsaveRes = await fetch(`${baseUrl}/users/me/saved-jobs/${targetJobId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const unsaveBody = await unsaveRes.json();
    assert.equal(unsaveRes.status, 200);
    assert.equal(unsaveBody.saved, false);
    assert.equal(unsaveBody.jobId, targetJobId);

    const detailAfterUnsave = await getJson(baseUrl, `/jobs/${targetJobId}`, { accessToken });
    assert.equal(detailAfterUnsave.res.status, 200);
    assert.equal(detailAfterUnsave.body.viewerState.saved, false);
  });
});

test('saved jobs endpoints require access token and validate job existence', async () => {
  await withServer(async (baseUrl) => {
    const missingTokenSave = await postJson(baseUrl, '/users/me/saved-jobs', {
      jobId: 'job_tokyo_senior_welder_001'
    });
    assert.equal(missingTokenSave.res.status, 401);
    assert.equal(missingTokenSave.body.error.code, 'missing_access_token');

    const register = await postJson(baseUrl, '/auth/register', {
      fullName: 'Jobs User Two',
      email: 'jobs-user-two@example.com',
      password: 'pass1234'
    });
    assert.equal(register.res.status, 201);
    const accessToken = register.body.accessToken;

    const invalidSave = await postJson(
      baseUrl,
      '/users/me/saved-jobs',
      { jobId: 'job_missing_404' },
      { accessToken }
    );
    assert.equal(invalidSave.res.status, 404);
    assert.equal(invalidSave.body.error.code, 'job_not_found');

    const invalidDetail = await getJson(baseUrl, '/jobs/job_missing_404', { accessToken });
    assert.equal(invalidDetail.res.status, 404);
    assert.equal(invalidDetail.body.error.code, 'job_not_found');
  });
});

test('jobs listing validates query filters and cursor', async () => {
  await withServer(async (baseUrl) => {
    const invalidVisaFilter = await getJson(baseUrl, '/jobs?visaSponsored=maybe');
    assert.equal(invalidVisaFilter.res.status, 400);
    assert.equal(invalidVisaFilter.body.error.code, 'invalid_visa_sponsored');

    const invalidCursor = await getJson(baseUrl, '/jobs?cursor=-10');
    assert.equal(invalidCursor.res.status, 400);
    assert.equal(invalidCursor.body.error.code, 'invalid_cursor');

    const filtered = await getJson(baseUrl, '/jobs?employmentType=FULL_TIME&visaSponsored=true');
    assert.equal(filtered.res.status, 200);
    assert.ok(filtered.body.items.length >= 1);
    for (const item of filtered.body.items) {
      assert.equal(item.employmentType, 'FULL_TIME');
      assert.equal(item.visaSponsorship, true);
    }
  });
});
