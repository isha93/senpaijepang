import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';
import { createAuthService } from '../src/auth/service.js';
import { PostgresAuthStore } from '../src/auth/postgres-store.js';
import { createKycService } from '../src/identity/kyc-service.js';
import { createDbPool } from '../src/db/pool.js';
import { createPostgresJobsService } from '../src/jobs/postgres-service.js';
import { createPostgresFeedService } from '../src/feed/postgres-service.js';

const HAS_DATABASE_URL = Boolean(String(process.env.DATABASE_URL || '').trim());
const TEST_AUTH_SECRET = 'postgres-integration-secret';

async function startPostgresServer(pool) {
  const store = new PostgresAuthStore({ pool });
  const authService = createAuthService({
    store,
    env: {
      AUTH_TOKEN_SECRET: TEST_AUTH_SECRET
    }
  });
  const kycService = createKycService({
    store,
    env: {
      AUTH_TOKEN_SECRET: TEST_AUTH_SECRET
    }
  });
  const jobsService = await createPostgresJobsService({ pool });
  const feedService = await createPostgresFeedService({ pool });
  const server = createServer({
    authService,
    kycService,
    jobsService,
    feedService,
    adminApiKey: 'postgres-integration-admin-key'
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`
  };
}

async function stopServer(server) {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

async function requestJson(
  baseUrl,
  path,
  { method = 'GET', body, accessToken } = {}
) {
  const headers = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  return { res, json };
}

async function assertInteractionTablesExist(pool) {
  const tableCheck = await pool.query(
    `
      SELECT
        to_regclass('public.user_saved_jobs') AS user_saved_jobs,
        to_regclass('public.user_saved_posts') AS user_saved_posts,
        to_regclass('public.job_applications') AS job_applications,
        to_regclass('public.job_application_journey_events') AS job_application_journey_events
    `
  );
  const tableRow = tableCheck.rows[0] || {};
  assert.ok(tableRow.user_saved_jobs, 'missing table user_saved_jobs; run migrations first');
  assert.ok(tableRow.user_saved_posts, 'missing table user_saved_posts; run migrations first');
  assert.ok(tableRow.job_applications, 'missing table job_applications; run migrations first');
  assert.ok(
    tableRow.job_application_journey_events,
    'missing table job_application_journey_events; run migrations first'
  );
}

test(
  'postgres interactions persist across server restart',
  {
    skip: !HAS_DATABASE_URL
  },
  async () => {
    const pool = createDbPool(process.env);
    await assertInteractionTablesExist(pool);

    let firstServer;
    let secondServer;

    try {
      firstServer = await startPostgresServer(pool);
      const firstBaseUrl = firstServer.baseUrl;

      const register = await requestJson(firstBaseUrl, '/auth/register', {
        method: 'POST',
        body: {
          fullName: 'Postgres Persist User',
          email: `postgres-persist-${Date.now()}@example.com`,
          password: 'pass1234'
        }
      });
      assert.equal(register.res.status, 201);
      const accessToken = register.json.accessToken;

      const jobs = await requestJson(firstBaseUrl, '/jobs?limit=2', { accessToken });
      assert.equal(jobs.res.status, 200);
      assert.ok(jobs.json.items.length > 0);
      const jobId = jobs.json.items[0].id;

      const saveJob = await requestJson(firstBaseUrl, '/users/me/saved-jobs', {
        method: 'POST',
        accessToken,
        body: { jobId }
      });
      assert.equal(saveJob.res.status, 200);
      assert.equal(saveJob.json.saved, true);

      const applyJob = await requestJson(firstBaseUrl, `/jobs/${jobId}/applications`, {
        method: 'POST',
        accessToken,
        body: {
          note: 'persist-me'
        }
      });
      assert.equal(applyJob.res.status, 201);
      assert.equal(applyJob.json.created, true);
      const applicationId = applyJob.json.application.id;

      const feed = await requestJson(firstBaseUrl, '/feed/posts?limit=2', { accessToken });
      assert.equal(feed.res.status, 200);
      assert.ok(feed.json.items.length > 0);
      const postId = feed.json.items[0].id;

      const savePost = await requestJson(firstBaseUrl, '/users/me/saved-posts', {
        method: 'POST',
        accessToken,
        body: { postId }
      });
      assert.equal(savePost.res.status, 200);
      assert.equal(savePost.json.saved, true);

      await stopServer(firstServer.server);

      secondServer = await startPostgresServer(pool);
      const secondBaseUrl = secondServer.baseUrl;

      const savedJobs = await requestJson(secondBaseUrl, '/users/me/saved-jobs?limit=10', { accessToken });
      assert.equal(savedJobs.res.status, 200);
      assert.ok(savedJobs.json.items.some((item) => item.id === jobId));

      const savedPosts = await requestJson(secondBaseUrl, '/users/me/saved-posts?limit=10', { accessToken });
      assert.equal(savedPosts.res.status, 200);
      assert.ok(savedPosts.json.items.some((item) => item.id === postId));

      const applications = await requestJson(secondBaseUrl, '/users/me/applications?limit=10', { accessToken });
      assert.equal(applications.res.status, 200);
      assert.ok(applications.json.items.some((item) => item.id === applicationId));

      const journey = await requestJson(secondBaseUrl, `/users/me/applications/${applicationId}/journey`, {
        accessToken
      });
      assert.equal(journey.res.status, 200);
      assert.equal(journey.json.application.id, applicationId);
      assert.equal(Array.isArray(journey.json.journey), true);
      assert.equal(journey.json.journey.length, 1);
      assert.equal(journey.json.journey[0].status, 'SUBMITTED');

      const applyAgain = await requestJson(secondBaseUrl, `/jobs/${jobId}/applications`, {
        method: 'POST',
        accessToken,
        body: { note: 'second-attempt' }
      });
      assert.equal(applyAgain.res.status, 200);
      assert.equal(applyAgain.json.created, false);
      assert.equal(applyAgain.json.application.id, applicationId);
    } finally {
      if (firstServer?.server?.listening) {
        await stopServer(firstServer.server);
      }
      if (secondServer?.server?.listening) {
        await stopServer(secondServer.server);
      }
      await pool.end();
    }
  }
);

test(
  'postgres concurrent save/apply operations remain idempotent',
  {
    skip: !HAS_DATABASE_URL
  },
  async () => {
    const pool = createDbPool(process.env);
    await assertInteractionTablesExist(pool);

    let runtime;
    try {
      runtime = await startPostgresServer(pool);
      const baseUrl = runtime.baseUrl;

      const register = await requestJson(baseUrl, '/auth/register', {
        method: 'POST',
        body: {
          fullName: 'Postgres Concurrency User',
          email: `postgres-concurrency-${Date.now()}@example.com`,
          password: 'pass1234'
        }
      });
      assert.equal(register.res.status, 201);
      const accessToken = register.json.accessToken;
      const userId = register.json.user.id;

      const jobs = await requestJson(baseUrl, '/jobs?limit=1', { accessToken });
      assert.equal(jobs.res.status, 200);
      const jobId = jobs.json.items[0].id;

      const [saveJobA, saveJobB] = await Promise.all([
        requestJson(baseUrl, '/users/me/saved-jobs', {
          method: 'POST',
          accessToken,
          body: { jobId }
        }),
        requestJson(baseUrl, '/users/me/saved-jobs', {
          method: 'POST',
          accessToken,
          body: { jobId }
        })
      ]);
      assert.equal(saveJobA.res.status, 200);
      assert.equal(saveJobB.res.status, 200);
      const saveCreatedCount = [saveJobA.json.created, saveJobB.json.created].filter(Boolean).length;
      assert.equal(saveCreatedCount, 1);

      const savedJobsCount = await pool.query(
        'SELECT COUNT(*)::int AS count FROM user_saved_jobs WHERE user_id = $1 AND job_id = $2',
        [userId, jobId]
      );
      assert.equal(Number(savedJobsCount.rows[0].count), 1);

      const [applyA, applyB] = await Promise.all([
        requestJson(baseUrl, `/jobs/${jobId}/applications`, {
          method: 'POST',
          accessToken,
          body: { note: 'concurrent-1' }
        }),
        requestJson(baseUrl, `/jobs/${jobId}/applications`, {
          method: 'POST',
          accessToken,
          body: { note: 'concurrent-2' }
        })
      ]);
      assert.ok([200, 201].includes(applyA.res.status));
      assert.ok([200, 201].includes(applyB.res.status));
      const applyCreatedCount = [applyA.json.created, applyB.json.created].filter(Boolean).length;
      assert.equal(applyCreatedCount, 1);

      const applicationId = applyA.json.application.id;
      assert.equal(applyB.json.application.id, applicationId);

      const applicationsCount = await pool.query(
        'SELECT COUNT(*)::int AS count FROM job_applications WHERE user_id = $1 AND job_id = $2',
        [userId, jobId]
      );
      assert.equal(Number(applicationsCount.rows[0].count), 1);

      const journeyCount = await pool.query(
        'SELECT COUNT(*)::int AS count FROM job_application_journey_events WHERE application_id = $1',
        [applicationId]
      );
      assert.equal(Number(journeyCount.rows[0].count), 1);

      const feed = await requestJson(baseUrl, '/feed/posts?limit=1', { accessToken });
      assert.equal(feed.res.status, 200);
      const postId = feed.json.items[0].id;

      const [savePostA, savePostB] = await Promise.all([
        requestJson(baseUrl, '/users/me/saved-posts', {
          method: 'POST',
          accessToken,
          body: { postId }
        }),
        requestJson(baseUrl, '/users/me/saved-posts', {
          method: 'POST',
          accessToken,
          body: { postId }
        })
      ]);
      assert.equal(savePostA.res.status, 200);
      assert.equal(savePostB.res.status, 200);
      const savePostCreatedCount = [savePostA.json.created, savePostB.json.created].filter(Boolean).length;
      assert.equal(savePostCreatedCount, 1);

      const savedPostsCount = await pool.query(
        'SELECT COUNT(*)::int AS count FROM user_saved_posts WHERE user_id = $1 AND post_id = $2',
        [userId, postId]
      );
      assert.equal(Number(savedPostsCount.rows[0].count), 1);
    } finally {
      if (runtime?.server?.listening) {
        await stopServer(runtime.server);
      }
      await pool.end();
    }
  }
);
