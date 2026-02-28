import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';
import { createAuthService } from '../src/auth/service.js';
import { InMemoryAuthStore } from '../src/auth/store.js';

const TEST_ADMIN_API_KEY = 'admin-business-key';

async function withServer(run, options = {}) {
  const server = createServer(options);
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

async function requestJson(
  baseUrl,
  path,
  { method = 'GET', body, accessToken, adminApiKey } = {}
) {
  const headers = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  if (adminApiKey) {
    headers['x-admin-api-key'] = adminApiKey;
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

test('admin jobs CRUD works with api key', async () => {
  await withServer(
    async (baseUrl) => {
      const missingKey = await requestJson(baseUrl, '/admin/jobs', {
        method: 'POST',
        body: {
          title: 'Mig Welder',
          employmentType: 'FULL_TIME',
          visaSponsorship: true,
          description: 'Need experienced welder for Tokyo plant.',
          requirements: ['3+ years welding experience'],
          location: {
            countryCode: 'JP',
            city: 'Tokyo',
            displayLabel: 'Tokyo, JP',
            latitude: 35.6762,
            longitude: 139.6503
          },
          employer: {
            id: 'emp_tokyo_factory',
            name: 'Tokyo Factory',
            logoUrl: null,
            isVerifiedEmployer: true
          }
        }
      });
      assert.equal(missingKey.res.status, 401);
      assert.equal(missingKey.json.error.code, 'missing_admin_api_key');

      const createJob = await requestJson(baseUrl, '/admin/jobs', {
        method: 'POST',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          title: 'Mig Welder',
          employmentType: 'FULL_TIME',
          visaSponsorship: true,
          description: 'Need experienced welder for Tokyo plant.',
          requirements: ['3+ years welding experience'],
          location: {
            countryCode: 'JP',
            city: 'Tokyo',
            displayLabel: 'Tokyo, JP',
            latitude: 35.6762,
            longitude: 139.6503
          },
          employer: {
            id: 'emp_tokyo_factory',
            name: 'Tokyo Factory',
            logoUrl: null,
            isVerifiedEmployer: true
          }
        }
      });
      assert.equal(createJob.res.status, 201);
      assert.ok(createJob.json.job.id);
      const jobId = createJob.json.job.id;

      const listAdminJobs = await requestJson(baseUrl, '/admin/jobs?limit=50', {
        adminApiKey: TEST_ADMIN_API_KEY
      });
      assert.equal(listAdminJobs.res.status, 200);
      assert.ok(listAdminJobs.json.items.some((item) => item.id === jobId));

      const patchJob = await requestJson(baseUrl, `/admin/jobs/${jobId}`, {
        method: 'PATCH',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          title: 'Mig Welder Updated'
        }
      });
      assert.equal(patchJob.res.status, 200);
      assert.equal(patchJob.json.job.title, 'Mig Welder Updated');

      const publicDetail = await requestJson(baseUrl, `/jobs/${jobId}`);
      assert.equal(publicDetail.res.status, 200);
      assert.equal(publicDetail.json.job.title, 'Mig Welder Updated');

      const removeJob = await requestJson(baseUrl, `/admin/jobs/${jobId}`, {
        method: 'DELETE',
        adminApiKey: TEST_ADMIN_API_KEY
      });
      assert.equal(removeJob.res.status, 200);
      assert.equal(removeJob.json.removed, true);
      assert.equal(removeJob.json.jobId, jobId);

      const detailAfterDelete = await requestJson(baseUrl, `/jobs/${jobId}`);
      assert.equal(detailAfterDelete.res.status, 404);
      assert.equal(detailAfterDelete.json.error.code, 'job_not_found');
    },
    { adminApiKey: TEST_ADMIN_API_KEY }
  );
});

test('admin feed posts CRUD works with api key', async () => {
  await withServer(
    async (baseUrl) => {
      const createPost = await requestJson(baseUrl, '/admin/feed/posts', {
        method: 'POST',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          title: 'Info Session Osaka',
          excerpt: 'Jadwal info session keberangkatan batch Maret.',
          category: 'ANNOUNCEMENT',
          author: 'Senpai Ops',
          imageUrl: null
        }
      });
      assert.equal(createPost.res.status, 201);
      assert.ok(createPost.json.post.id);
      const postId = createPost.json.post.id;

      const listAdminPosts = await requestJson(baseUrl, '/admin/feed/posts?category=ANNOUNCEMENT', {
        adminApiKey: TEST_ADMIN_API_KEY
      });
      assert.equal(listAdminPosts.res.status, 200);
      assert.ok(listAdminPosts.json.items.some((item) => item.id === postId));

      const patchPost = await requestJson(baseUrl, `/admin/feed/posts/${postId}`, {
        method: 'PATCH',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          title: 'Info Session Osaka Updated'
        }
      });
      assert.equal(patchPost.res.status, 200);
      assert.equal(patchPost.json.post.title, 'Info Session Osaka Updated');

      const publicFeed = await requestJson(baseUrl, '/feed/posts?q=updated');
      assert.equal(publicFeed.res.status, 200);
      assert.ok(publicFeed.json.items.some((item) => item.id === postId));

      const deletePost = await requestJson(baseUrl, `/admin/feed/posts/${postId}`, {
        method: 'DELETE',
        adminApiKey: TEST_ADMIN_API_KEY
      });
      assert.equal(deletePost.res.status, 200);
      assert.equal(deletePost.json.removed, true);
      assert.equal(deletePost.json.postId, postId);
    },
    { adminApiKey: TEST_ADMIN_API_KEY }
  );
});

test('admin organizations list and verification update works with api key', async () => {
  await withServer(
    async (baseUrl) => {
      const register = await requestJson(baseUrl, '/auth/register', {
        method: 'POST',
        body: {
          fullName: 'Org Admin Flow User',
          email: 'org-admin-flow@example.com',
          password: 'pass1234'
        }
      });
      assert.equal(register.res.status, 201);
      const accessToken = register.json.accessToken;

      const createOrg = await requestJson(baseUrl, '/organizations', {
        method: 'POST',
        accessToken,
        body: {
          name: 'Admin Flow Org',
          orgType: 'TSK',
          countryCode: 'JP'
        }
      });
      assert.equal(createOrg.res.status, 201);
      const orgId = createOrg.json.id;

      const submitVerification = await requestJson(baseUrl, `/organizations/${orgId}/verification`, {
        method: 'POST',
        accessToken,
        body: {
          registrationNumber: 'REG-ADM-001',
          legalName: 'Admin Flow Org Legal',
          supportingObjectKeys: ['org/admin-flow/legal.pdf']
        }
      });
      assert.equal(submitVerification.res.status, 202);
      assert.equal(submitVerification.json.status, 'PENDING');

      const adminList = await requestJson(baseUrl, '/admin/organizations?verificationStatus=PENDING', {
        adminApiKey: TEST_ADMIN_API_KEY
      });
      assert.equal(adminList.res.status, 200);
      assert.ok(adminList.json.items.some((item) => item.organization.id === orgId));

      const adminUpdate = await requestJson(baseUrl, `/admin/organizations/${orgId}/verification`, {
        method: 'PATCH',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          status: 'VERIFIED',
          reasonCodes: ['AUTO_MATCHED']
        }
      });
      assert.equal(adminUpdate.res.status, 200);
      assert.equal(adminUpdate.json.status, 'VERIFIED');
      assert.deepEqual(adminUpdate.json.reasonCodes, ['AUTO_MATCHED']);

      const userStatus = await requestJson(baseUrl, `/organizations/${orgId}/verification/status`, {
        accessToken
      });
      assert.equal(userStatus.res.status, 200);
      assert.equal(userStatus.json.status, 'VERIFIED');
      assert.deepEqual(userStatus.json.reasonCodes, ['AUTO_MATCHED']);
    },
    { adminApiKey: TEST_ADMIN_API_KEY }
  );
});

test('admin business endpoints also work with bearer super_admin role', async () => {
  const authStore = new InMemoryAuthStore();
  const authService = createAuthService({ store: authStore });

  await withServer(async (baseUrl) => {
    const adminRegister = await requestJson(baseUrl, '/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Bearer Admin Ops',
        email: 'bearer-admin-ops@example.com',
        password: 'pass1234'
      }
    });
    assert.equal(adminRegister.res.status, 201);
    const adminAccessToken = adminRegister.json.accessToken;
    const adminUserId = adminRegister.json.user.id;

    const promoted = await authStore.ensureUserRole({
      userId: adminUserId,
      roleCode: 'super_admin'
    });
    assert.equal(promoted, true);

    const createPost = await requestJson(baseUrl, '/admin/feed/posts', {
      method: 'POST',
      accessToken: adminAccessToken,
      body: {
        title: 'Bearer Admin Post',
        excerpt: 'Created by bearer super_admin.',
        category: 'ANNOUNCEMENT',
        author: 'Bearer Admin',
        imageUrl: null
      }
    });
    assert.equal(createPost.res.status, 201);
    assert.equal(createPost.json.post.title, 'Bearer Admin Post');
  }, { authService });
});
