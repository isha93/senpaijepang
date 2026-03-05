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

test('admin jobs lifecycle and bulk actions work with api key', async () => {
  await withServer(
    async (baseUrl) => {
      const createJob = await requestJson(baseUrl, '/admin/jobs', {
        method: 'POST',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          title: 'Lifecycle Job Alpha',
          employmentType: 'FULL_TIME',
          visaSponsorship: true,
          description: 'Lifecycle alpha description for testing purposes.',
          requirements: ['Requirement alpha'],
          location: {
            countryCode: 'JP',
            city: 'Tokyo',
            displayLabel: 'Tokyo, JP',
            latitude: 35.6762,
            longitude: 139.6503
          },
          employer: {
            id: 'emp_lifecycle_alpha',
            name: 'Lifecycle Alpha Co',
            logoUrl: null,
            isVerifiedEmployer: true
          }
        }
      });
      assert.equal(createJob.res.status, 201);
      const jobId = createJob.json.job.id;

      const createJob2 = await requestJson(baseUrl, '/admin/jobs', {
        method: 'POST',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          title: 'Lifecycle Job Beta',
          employmentType: 'CONTRACT',
          visaSponsorship: false,
          description: 'Lifecycle beta description for testing purposes.',
          requirements: ['Requirement beta'],
          location: {
            countryCode: 'JP',
            city: 'Osaka',
            displayLabel: 'Osaka, JP',
            latitude: 34.6937,
            longitude: 135.5023
          },
          employer: {
            id: 'emp_lifecycle_beta',
            name: 'Lifecycle Beta Co',
            logoUrl: null,
            isVerifiedEmployer: true
          }
        }
      });
      assert.equal(createJob2.res.status, 201);
      const secondJobId = createJob2.json.job.id;

      const unpublish = await requestJson(baseUrl, `/admin/jobs/${jobId}/unpublish`, {
        method: 'POST',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {}
      });
      assert.equal(unpublish.res.status, 200);
      assert.equal(unpublish.json.job.lifecycle.status, 'DRAFT');

      const hiddenDetail = await requestJson(baseUrl, `/jobs/${jobId}`);
      assert.equal(hiddenDetail.res.status, 404);

      const publish = await requestJson(baseUrl, `/admin/jobs/${jobId}/publish`, {
        method: 'POST',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {}
      });
      assert.equal(publish.res.status, 200);
      assert.equal(publish.json.job.lifecycle.status, 'PUBLISHED');

      const visibleDetail = await requestJson(baseUrl, `/jobs/${jobId}`);
      assert.equal(visibleDetail.res.status, 200);
      assert.equal(visibleDetail.json.job.id, jobId);

      const scheduleDate = '2099-01-01T10:00:00.000Z';
      const schedule = await requestJson(baseUrl, `/admin/jobs/${secondJobId}/schedule`, {
        method: 'POST',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          scheduledAt: scheduleDate
        }
      });
      assert.equal(schedule.res.status, 200);
      assert.equal(schedule.json.job.lifecycle.status, 'SCHEDULED');
      assert.equal(schedule.json.job.lifecycle.scheduledAt, scheduleDate);

      const listPublic = await requestJson(baseUrl, '/jobs?limit=50');
      assert.equal(listPublic.res.status, 200);
      assert.equal(listPublic.json.items.some((item) => item.id === secondJobId), false);

      const bulk = await requestJson(baseUrl, '/admin/jobs/bulk', {
        method: 'POST',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          action: 'UNPUBLISH',
          jobIds: [jobId, secondJobId]
        }
      });
      assert.equal(bulk.res.status, 200);
      assert.equal(bulk.json.successCount, 2);
      assert.equal(bulk.json.failureCount, 0);

      const publicAfterBulk = await requestJson(baseUrl, '/jobs?limit=50');
      assert.equal(publicAfterBulk.res.status, 200);
      assert.equal(publicAfterBulk.json.items.some((item) => item.id === jobId), false);
      assert.equal(publicAfterBulk.json.items.some((item) => item.id === secondJobId), false);

      const bulkWithMissing = await requestJson(baseUrl, '/admin/jobs/bulk', {
        method: 'POST',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          action: 'PUBLISH',
          jobIds: [jobId, 'job_not_exists_123']
        }
      });
      assert.equal(bulkWithMissing.res.status, 200);
      assert.equal(bulkWithMissing.json.successCount, 1);
      assert.equal(bulkWithMissing.json.failureCount, 1);
      assert.equal(
        bulkWithMissing.json.results.some(
          (item) => item.jobId === 'job_not_exists_123' && item.success === false && item.error.code === 'job_not_found'
        ),
        true
      );
    },
    { adminApiKey: TEST_ADMIN_API_KEY }
  );
});

test('admin feed lifecycle and bulk actions work with api key', async () => {
  await withServer(
    async (baseUrl) => {
      const createPost = await requestJson(baseUrl, '/admin/feed/posts', {
        method: 'POST',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          title: 'Lifecycle Feed Alpha',
          excerpt: 'Lifecycle feed alpha excerpt',
          category: 'ANNOUNCEMENT',
          author: 'Admin Ops',
          imageUrl: null
        }
      });
      assert.equal(createPost.res.status, 201);
      const postId = createPost.json.post.id;

      const createPost2 = await requestJson(baseUrl, '/admin/feed/posts', {
        method: 'POST',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          title: 'Lifecycle Feed Beta',
          excerpt: 'Lifecycle feed beta excerpt',
          category: 'NEWS',
          author: 'Admin Ops',
          imageUrl: null
        }
      });
      assert.equal(createPost2.res.status, 201);
      const secondPostId = createPost2.json.post.id;

      const unpublish = await requestJson(baseUrl, `/admin/feed/posts/${postId}/unpublish`, {
        method: 'POST',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {}
      });
      assert.equal(unpublish.res.status, 200);
      assert.equal(unpublish.json.post.lifecycle.status, 'DRAFT');

      const publicAfterUnpublish = await requestJson(baseUrl, '/feed/posts?limit=50');
      assert.equal(publicAfterUnpublish.res.status, 200);
      assert.equal(publicAfterUnpublish.json.items.some((item) => item.id === postId), false);

      const publish = await requestJson(baseUrl, `/admin/feed/posts/${postId}/publish`, {
        method: 'POST',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {}
      });
      assert.equal(publish.res.status, 200);
      assert.equal(publish.json.post.lifecycle.status, 'PUBLISHED');

      const publicAfterPublish = await requestJson(baseUrl, '/feed/posts?limit=50');
      assert.equal(publicAfterPublish.res.status, 200);
      assert.equal(publicAfterPublish.json.items.some((item) => item.id === postId), true);

      const scheduleDate = '2099-01-01T10:00:00.000Z';
      const schedule = await requestJson(baseUrl, `/admin/feed/posts/${secondPostId}/schedule`, {
        method: 'POST',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          scheduledAt: scheduleDate
        }
      });
      assert.equal(schedule.res.status, 200);
      assert.equal(schedule.json.post.lifecycle.status, 'SCHEDULED');
      assert.equal(schedule.json.post.lifecycle.scheduledAt, scheduleDate);

      const publicAfterSchedule = await requestJson(baseUrl, '/feed/posts?limit=50');
      assert.equal(publicAfterSchedule.res.status, 200);
      assert.equal(publicAfterSchedule.json.items.some((item) => item.id === secondPostId), false);

      const bulk = await requestJson(baseUrl, '/admin/feed/posts/bulk', {
        method: 'POST',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          action: 'UNPUBLISH',
          postIds: [postId, secondPostId]
        }
      });
      assert.equal(bulk.res.status, 200);
      assert.equal(bulk.json.successCount, 2);
      assert.equal(bulk.json.failureCount, 0);

      const publicAfterBulk = await requestJson(baseUrl, '/feed/posts?limit=50');
      assert.equal(publicAfterBulk.res.status, 200);
      assert.equal(publicAfterBulk.json.items.some((item) => item.id === postId), false);
      assert.equal(publicAfterBulk.json.items.some((item) => item.id === secondPostId), false);

      const bulkWithMissing = await requestJson(baseUrl, '/admin/feed/posts/bulk', {
        method: 'POST',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          action: 'PUBLISH',
          postIds: [postId, 'post_not_exists_123']
        }
      });
      assert.equal(bulkWithMissing.res.status, 200);
      assert.equal(bulkWithMissing.json.successCount, 1);
      assert.equal(bulkWithMissing.json.failureCount, 1);
      assert.equal(
        bulkWithMissing.json.results.some(
          (item) =>
            item.postId === 'post_not_exists_123' && item.success === false && item.error.code === 'post_not_found'
        ),
        true
      );
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

test('admin users management works with api key and bearer super_admin role', async () => {
  const authStore = new InMemoryAuthStore();
  const authService = createAuthService({ store: authStore });

  await withServer(
    async (baseUrl) => {
      const missingKey = await requestJson(baseUrl, '/admin/users');
      assert.equal(missingKey.res.status, 401);
      assert.equal(missingKey.json.error.code, 'missing_admin_api_key');

      const createAdminUser = await requestJson(baseUrl, '/admin/users', {
        method: 'POST',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          fullName: 'Permanent Admin',
          email: 'permanent-admin@example.com',
          password: 'AdminPass123',
          roles: ['super_admin', 'sdm']
        }
      });
      assert.equal(createAdminUser.res.status, 201);
      assert.equal(createAdminUser.json.user.email, 'permanent-admin@example.com');
      assert.deepEqual(createAdminUser.json.user.roles, ['sdm', 'super_admin']);
      const permanentAdminId = createAdminUser.json.user.id;

      const listAdminUsers = await requestJson(baseUrl, '/admin/users?q=permanent&limit=20', {
        adminApiKey: TEST_ADMIN_API_KEY
      });
      assert.equal(listAdminUsers.res.status, 200);
      assert.equal(listAdminUsers.json.pageInfo.cursor, '0');
      assert.equal(listAdminUsers.json.pageInfo.limit, 20);
      assert.ok(listAdminUsers.json.pageInfo.total >= 1);
      assert.ok(listAdminUsers.json.items.some((item) => item.id === permanentAdminId));

      const getAdminUser = await requestJson(baseUrl, `/admin/users/${permanentAdminId}`, {
        adminApiKey: TEST_ADMIN_API_KEY
      });
      assert.equal(getAdminUser.res.status, 200);
      assert.equal(getAdminUser.json.user.id, permanentAdminId);
      assert.equal(getAdminUser.json.user.email, 'permanent-admin@example.com');
      assert.deepEqual(getAdminUser.json.user.roles, ['sdm', 'super_admin']);

      const getAdminUserProfile = await requestJson(baseUrl, `/admin/users/${permanentAdminId}/profile`, {
        adminApiKey: TEST_ADMIN_API_KEY
      });
      assert.equal(getAdminUserProfile.res.status, 200);
      assert.equal(getAdminUserProfile.json.profile.id, permanentAdminId);
      assert.equal(getAdminUserProfile.json.profile.email, 'permanent-admin@example.com');
      assert.equal(getAdminUserProfile.json.profile.verificationStatus, 'NOT_STARTED');

      const emptyHistory = await requestJson(baseUrl, `/admin/users/${permanentAdminId}/kyc/history`, {
        adminApiKey: TEST_ADMIN_API_KEY
      });
      assert.equal(emptyHistory.res.status, 200);
      assert.equal(emptyHistory.json.session, null);
      assert.deepEqual(emptyHistory.json.events, []);

      const patchAdminUser = await requestJson(baseUrl, `/admin/users/${permanentAdminId}`, {
        method: 'PATCH',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          roles: ['super_admin'],
          password: 'AdminPass999'
        }
      });
      assert.equal(patchAdminUser.res.status, 200);
      assert.deepEqual(patchAdminUser.json.user.roles, ['super_admin']);

      const loginWithNewPassword = await requestJson(baseUrl, '/auth/login', {
        method: 'POST',
        body: {
          identifier: 'permanent-admin@example.com',
          password: 'AdminPass999'
        }
      });
      assert.equal(loginWithNewPassword.res.status, 200);
      assert.equal(loginWithNewPassword.json.user.email, 'permanent-admin@example.com');
      const permanentAdminToken = loginWithNewPassword.json.accessToken;

      const createAdminKycSession = await requestJson(baseUrl, '/identity/kyc/sessions', {
        method: 'POST',
        accessToken: permanentAdminToken,
        body: {
          provider: 'manual'
        }
      });
      assert.equal(createAdminKycSession.res.status, 201);
      const adminKycSessionId = createAdminKycSession.json.session.id;

      const populatedHistory = await requestJson(
        baseUrl,
        `/admin/users/${permanentAdminId}/kyc/history?sessionId=${adminKycSessionId}`,
        {
          adminApiKey: TEST_ADMIN_API_KEY
        }
      );
      assert.equal(populatedHistory.res.status, 200);
      assert.equal(populatedHistory.json.session.id, adminKycSessionId);
      assert.ok(populatedHistory.json.events.length >= 1);
      assert.equal(populatedHistory.json.events[0].toStatus, 'CREATED');

      const missingDetail = await requestJson(baseUrl, '/admin/users/00000000-0000-0000-0000-000000000000', {
        adminApiKey: TEST_ADMIN_API_KEY
      });
      assert.equal(missingDetail.res.status, 404);
      assert.equal(missingDetail.json.error.code, 'user_not_found');

      const missingHistory = await requestJson(
        baseUrl,
        '/admin/users/00000000-0000-0000-0000-000000000000/kyc/history',
        {
          adminApiKey: TEST_ADMIN_API_KEY
        }
      );
      assert.equal(missingHistory.res.status, 404);
      assert.equal(missingHistory.json.error.code, 'user_not_found');

      const regularAdminRegister = await requestJson(baseUrl, '/auth/register', {
        method: 'POST',
        body: {
          fullName: 'Regular Admin Candidate',
          email: 'regular-admin-candidate@example.com',
          password: 'pass1234'
        }
      });
      assert.equal(regularAdminRegister.res.status, 201);

      const deniedBearer = await requestJson(baseUrl, '/admin/users', {
        accessToken: regularAdminRegister.json.accessToken
      });
      assert.equal(deniedBearer.res.status, 403);
      assert.equal(deniedBearer.json.error.code, 'insufficient_admin_role');

      const promoted = await authStore.ensureUserRole({
        userId: regularAdminRegister.json.user.id,
        roleCode: 'super_admin'
      });
      assert.equal(promoted, true);

      const allowedBearer = await requestJson(baseUrl, '/admin/users?limit=20', {
        accessToken: regularAdminRegister.json.accessToken
      });
      assert.equal(allowedBearer.res.status, 200);
      assert.ok(allowedBearer.json.items.some((item) => item.email === 'permanent-admin@example.com'));
    },
    {
      adminApiKey: TEST_ADMIN_API_KEY,
      authService
    }
  );
});

test('admin application lifecycle updates are visible to user application endpoints', async () => {
  const authStore = new InMemoryAuthStore();
  const authService = createAuthService({ store: authStore });

  await withServer(
    async (baseUrl) => {
      const candidateRegister = await requestJson(baseUrl, '/auth/register', {
        method: 'POST',
        body: {
          fullName: 'Candidate Lifecycle',
          email: 'candidate-lifecycle@example.com',
          password: 'pass1234'
        }
      });
      assert.equal(candidateRegister.res.status, 201);
      const candidateToken = candidateRegister.json.accessToken;

      const apply = await requestJson(baseUrl, '/jobs/job_tokyo_senior_welder_001/applications', {
        method: 'POST',
        accessToken: candidateToken,
        body: {
          note: 'Ready for lifecycle test'
        }
      });
      assert.equal(apply.res.status, 201);
      const applicationId = apply.json.application.id;
      assert.equal(apply.json.application.status, 'SUBMITTED');

      const adminList = await requestJson(
        baseUrl,
        '/admin/applications?status=SUBMITTED&q=candidate-lifecycle@example.com&limit=20',
        {
          adminApiKey: TEST_ADMIN_API_KEY
        }
      );
      assert.equal(adminList.res.status, 200);
      assert.ok(adminList.json.items.some((item) => item.application.id === applicationId));

      const adminJourneyBefore = await requestJson(baseUrl, `/admin/applications/${applicationId}/journey`, {
        adminApiKey: TEST_ADMIN_API_KEY
      });
      assert.equal(adminJourneyBefore.res.status, 200);
      assert.equal(adminJourneyBefore.json.journey.length, 1);
      assert.equal(adminJourneyBefore.json.journey[0].status, 'SUBMITTED');

      const moveToReview = await requestJson(baseUrl, `/admin/applications/${applicationId}/status`, {
        method: 'PATCH',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          status: 'IN_REVIEW',
          reason: 'Initial screening complete',
          updatedBy: 'ops@senpaijepang.com'
        }
      });
      assert.equal(moveToReview.res.status, 200);
      assert.equal(moveToReview.json.updated, true);
      assert.equal(moveToReview.json.application.status, 'IN_REVIEW');
      assert.equal(moveToReview.json.journeyEvent.status, 'IN_REVIEW');

      const userListAfterReview = await requestJson(baseUrl, '/users/me/applications?status=IN_REVIEW', {
        accessToken: candidateToken
      });
      assert.equal(userListAfterReview.res.status, 200);
      assert.equal(userListAfterReview.json.items.length, 1);
      assert.equal(userListAfterReview.json.items[0].id, applicationId);
      assert.equal(userListAfterReview.json.items[0].status, 'IN_REVIEW');

      const userJourneyAfterReview = await requestJson(baseUrl, `/users/me/applications/${applicationId}/journey`, {
        accessToken: candidateToken
      });
      assert.equal(userJourneyAfterReview.res.status, 200);
      assert.equal(userJourneyAfterReview.json.journey.at(-1).status, 'IN_REVIEW');
      assert.match(userJourneyAfterReview.json.journey.at(-1).description, /Initial screening complete/);

      const invalidRollback = await requestJson(baseUrl, `/admin/applications/${applicationId}/status`, {
        method: 'PATCH',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          status: 'SUBMITTED'
        }
      });
      assert.equal(invalidRollback.res.status, 409);
      assert.equal(invalidRollback.json.error.code, 'invalid_application_transition');

      const regularBearer = await requestJson(baseUrl, '/auth/register', {
        method: 'POST',
        body: {
          fullName: 'Regular Ops',
          email: 'regular-ops@example.com',
          password: 'pass1234'
        }
      });
      assert.equal(regularBearer.res.status, 201);

      const deniedBearerPatch = await requestJson(baseUrl, `/admin/applications/${applicationId}/status`, {
        method: 'PATCH',
        accessToken: regularBearer.json.accessToken,
        body: {
          status: 'INTERVIEW'
        }
      });
      assert.equal(deniedBearerPatch.res.status, 403);
      assert.equal(deniedBearerPatch.json.error.code, 'insufficient_admin_role');

      const promoted = await authStore.ensureUserRole({
        userId: regularBearer.json.user.id,
        roleCode: 'super_admin'
      });
      assert.equal(promoted, true);

      const allowedBearerPatch = await requestJson(baseUrl, `/admin/applications/${applicationId}/status`, {
        method: 'PATCH',
        accessToken: regularBearer.json.accessToken,
        body: {
          status: 'INTERVIEW',
          reason: 'Interview slot assigned'
        }
      });
      assert.equal(allowedBearerPatch.res.status, 200);
      assert.equal(allowedBearerPatch.json.application.status, 'INTERVIEW');
      assert.equal(allowedBearerPatch.json.updated, true);

      const userJourneyAfterInterview = await requestJson(baseUrl, `/users/me/applications/${applicationId}/journey`, {
        accessToken: candidateToken
      });
      assert.equal(userJourneyAfterInterview.res.status, 200);
      assert.equal(userJourneyAfterInterview.json.journey.at(-1).status, 'INTERVIEW');

      const missingKeyOverview = await requestJson(baseUrl, '/admin/overview/summary');
      assert.equal(missingKeyOverview.res.status, 401);
      assert.equal(missingKeyOverview.json.error.code, 'missing_admin_api_key');

      const overviewSummary = await requestJson(baseUrl, '/admin/overview/summary', {
        adminApiKey: TEST_ADMIN_API_KEY
      });
      assert.equal(overviewSummary.res.status, 200);
      assert.ok(Number.isInteger(overviewSummary.json.pendingKyc));
      assert.ok(Number.isInteger(overviewSummary.json.activeApplications));
      assert.ok(Number.isInteger(overviewSummary.json.inReviewApplications));
      assert.ok(Number.isInteger(overviewSummary.json.interviewApplications));
      assert.equal(overviewSummary.json.activeApplications >= 1, true);
      assert.equal(overviewSummary.json.interviewApplications >= 1, true);
      assert.ok(typeof overviewSummary.json.lastUpdatedAt === 'string');

      const activityApplications = await requestJson(
        baseUrl,
        '/admin/activity-events?type=APPLICATION&limit=20',
        {
          adminApiKey: TEST_ADMIN_API_KEY
        }
      );
      assert.equal(activityApplications.res.status, 200);
      assert.equal(activityApplications.json.filters.type, 'APPLICATION');
      assert.ok(activityApplications.json.items.some((item) => item.entityId === applicationId));

      const activityWithCursor = await requestJson(
        baseUrl,
        '/admin/activity-events?type=APPLICATION&cursor=30&limit=25',
        {
          adminApiKey: TEST_ADMIN_API_KEY
        }
      );
      assert.equal(activityWithCursor.res.status, 200);
      assert.equal(activityWithCursor.json.pageInfo.cursor, '30');
      assert.equal(activityWithCursor.json.pageInfo.limit, 25);

      const kycSession = await requestJson(baseUrl, '/identity/kyc/sessions', {
        method: 'POST',
        accessToken: candidateToken,
        body: {
          provider: 'manual'
        }
      });
      assert.equal(kycSession.res.status, 201);
      const kycSessionId = kycSession.json.session.id;

      const uploadUrl = await requestJson(baseUrl, '/identity/kyc/upload-url', {
        method: 'POST',
        accessToken: candidateToken,
        body: {
          sessionId: kycSessionId,
          documentType: 'passport',
          fileName: 'candidate-passport.pdf',
          contentType: 'application/pdf',
          contentLength: 420000,
          checksumSha256: 'a3f9f6f30311d8e8860f5f5f5366f6544dc34e8e833b8f13294f129f0d4af167'
        }
      });
      assert.equal(uploadUrl.res.status, 201);

      const registerDocument = await requestJson(baseUrl, '/identity/kyc/documents', {
        method: 'POST',
        accessToken: candidateToken,
        body: {
          sessionId: kycSessionId,
          documentType: 'passport',
          objectKey: uploadUrl.json.upload.objectKey,
          checksumSha256: 'a3f9f6f30311d8e8860f5f5f5366f6544dc34e8e833b8f13294f129f0d4af167'
        }
      });
      assert.equal(registerDocument.res.status, 201);
      const documentId = registerDocument.json.document.id;

      const missingKeyPreview = await requestJson(baseUrl, `/admin/kyc/documents/${documentId}/preview-url`, {
        method: 'POST'
      });
      assert.equal(missingKeyPreview.res.status, 401);
      assert.equal(missingKeyPreview.json.error.code, 'missing_admin_api_key');

      const previewDefault = await requestJson(baseUrl, `/admin/kyc/documents/${documentId}/preview-url`, {
        method: 'POST',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {}
      });
      assert.equal(previewDefault.res.status, 200);
      assert.equal(previewDefault.json.documentId, documentId);
      assert.equal(previewDefault.json.kycSessionId, kycSessionId);
      assert.ok(typeof previewDefault.json.url === 'string' && previewDefault.json.url.length > 0);
      assert.ok(typeof previewDefault.json.expiresAt === 'string');

      const previewCustomTtl = await requestJson(baseUrl, `/admin/kyc/documents/${documentId}/preview-url`, {
        method: 'POST',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          expiresSec: 180
        }
      });
      assert.equal(previewCustomTtl.res.status, 200);

      const previewInvalidTtl = await requestJson(baseUrl, `/admin/kyc/documents/${documentId}/preview-url`, {
        method: 'POST',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          expiresSec: 10
        }
      });
      assert.equal(previewInvalidTtl.res.status, 400);
      assert.equal(previewInvalidTtl.json.error.code, 'invalid_expires_sec');

      const previewUnknownDoc = await requestJson(
        baseUrl,
        '/admin/kyc/documents/00000000-0000-0000-0000-000000000000/preview-url',
        {
          method: 'POST',
          adminApiKey: TEST_ADMIN_API_KEY,
          body: {}
        }
      );
      assert.equal(previewUnknownDoc.res.status, 404);
      assert.equal(previewUnknownDoc.json.error.code, 'document_not_found');

      const auditEvents = await requestJson(
        baseUrl,
        '/admin/audit/events?type=APPLICATION&entityType=JOB_APPLICATION&action=APPLICATION_STATUS_TRANSITION&limit=20',
        {
          adminApiKey: TEST_ADMIN_API_KEY
        }
      );
      assert.equal(auditEvents.res.status, 200);
      assert.equal(auditEvents.json.filters.type, 'APPLICATION');
      assert.equal(auditEvents.json.filters.entityType, 'JOB_APPLICATION');
      assert.equal(auditEvents.json.filters.action, 'APPLICATION_STATUS_TRANSITION');
      assert.ok(auditEvents.json.items.some((item) => item.entityId === applicationId));

      const auditFilteredByActorType = await requestJson(
        baseUrl,
        '/admin/audit/events?type=APPLICATION&actorType=ADMIN&limit=20',
        {
          adminApiKey: TEST_ADMIN_API_KEY
        }
      );
      assert.equal(auditFilteredByActorType.res.status, 200);
      assert.equal(auditFilteredByActorType.json.filters.actorType, 'ADMIN');
      assert.ok(
        auditFilteredByActorType.json.items.every((item) => String(item.actorType || '').toUpperCase() === 'ADMIN')
      );

      const auditInvalidActorType = await requestJson(baseUrl, '/admin/audit/events?actorType=INVALID', {
        adminApiKey: TEST_ADMIN_API_KEY
      });
      assert.equal(auditInvalidActorType.res.status, 400);
      assert.equal(auditInvalidActorType.json.error.code, 'invalid_actor_type');

      const invalidActivityType = await requestJson(baseUrl, '/admin/activity-events?type=INVALID', {
        adminApiKey: TEST_ADMIN_API_KEY
      });
      assert.equal(invalidActivityType.res.status, 400);
      assert.equal(invalidActivityType.json.error.code, 'invalid_activity_type');
    },
    {
      adminApiKey: TEST_ADMIN_API_KEY,
      authService
    }
  );
});

test('application documents can be uploaded by candidate and reviewed by admin', async () => {
  await withServer(
    async (baseUrl) => {
      const candidateRegister = await requestJson(baseUrl, '/auth/register', {
        method: 'POST',
        body: {
          fullName: 'Candidate Docs',
          email: 'candidate-docs@example.com',
          password: 'pass1234'
        }
      });
      assert.equal(candidateRegister.res.status, 201);
      const candidateToken = candidateRegister.json.accessToken;

      const apply = await requestJson(baseUrl, '/jobs/job_tokyo_senior_welder_001/applications', {
        method: 'POST',
        accessToken: candidateToken,
        body: {
          note: 'Ready to send documents'
        }
      });
      assert.equal(apply.res.status, 201);
      const applicationId = apply.json.application.id;

      const uploadUrl = await requestJson(
        baseUrl,
        `/users/me/applications/${applicationId}/documents/upload-url`,
        {
          method: 'POST',
          accessToken: candidateToken,
          body: {
            documentType: 'CV',
            fileName: 'candidate-cv.pdf',
            contentType: 'application/pdf',
            contentLength: 250000,
            checksumSha256: 'a3f9f6f30311d8e8860f5f5f5366f6544dc34e8e833b8f13294f129f0d4af167'
          }
        }
      );
      assert.equal(uploadUrl.res.status, 201);
      assert.ok(uploadUrl.json.upload.objectKey.includes(applicationId));

      const registerDocument = await requestJson(baseUrl, `/users/me/applications/${applicationId}/documents`, {
        method: 'POST',
        accessToken: candidateToken,
        body: {
          documentType: 'CV',
          fileName: 'candidate-cv.pdf',
          contentType: 'application/pdf',
          contentLength: 250000,
          objectKey: uploadUrl.json.upload.objectKey,
          checksumSha256: 'a3f9f6f30311d8e8860f5f5f5366f6544dc34e8e833b8f13294f129f0d4af167'
        }
      });
      assert.equal(registerDocument.res.status, 201);
      const documentId = registerDocument.json.document.id;

      const userDocuments = await requestJson(baseUrl, `/users/me/applications/${applicationId}/documents`, {
        accessToken: candidateToken
      });
      assert.equal(userDocuments.res.status, 200);
      assert.equal(userDocuments.json.total, 1);
      assert.equal(userDocuments.json.items[0].id, documentId);
      assert.equal(userDocuments.json.items[0].reviewStatus, 'PENDING');

      const missingKey = await requestJson(baseUrl, `/admin/applications/${applicationId}/documents`);
      assert.equal(missingKey.res.status, 401);
      assert.equal(missingKey.json.error.code, 'missing_admin_api_key');

      const adminDocuments = await requestJson(baseUrl, `/admin/applications/${applicationId}/documents`, {
        adminApiKey: TEST_ADMIN_API_KEY
      });
      assert.equal(adminDocuments.res.status, 200);
      assert.equal(adminDocuments.json.total, 1);
      assert.equal(adminDocuments.json.items[0].id, documentId);

      const reviewValid = await requestJson(baseUrl, `/admin/applications/${applicationId}/documents/${documentId}`, {
        method: 'PATCH',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          reviewStatus: 'VALID',
          reviewReason: 'Document quality is sufficient',
          reviewedBy: 'qa-admin@senpaijepang.com'
        }
      });
      assert.equal(reviewValid.res.status, 200);
      assert.equal(reviewValid.json.updated, true);
      assert.equal(reviewValid.json.document.reviewStatus, 'VALID');

      const preview = await requestJson(baseUrl, `/admin/applications/documents/${documentId}/preview-url`, {
        method: 'POST',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          expiresSec: 180
        }
      });
      assert.equal(preview.res.status, 200);
      assert.equal(preview.json.documentId, documentId);
      assert.ok(typeof preview.json.url === 'string' && preview.json.url.length > 0);

      const userDocumentsAfterReview = await requestJson(baseUrl, `/users/me/applications/${applicationId}/documents`, {
        accessToken: candidateToken
      });
      assert.equal(userDocumentsAfterReview.res.status, 200);
      assert.equal(userDocumentsAfterReview.json.items[0].reviewStatus, 'VALID');
    },
    { adminApiKey: TEST_ADMIN_API_KEY }
  );
});

test('offered applications must be accepted or declined by candidate', async () => {
  await withServer(
    async (baseUrl) => {
      const candidateRegister = await requestJson(baseUrl, '/auth/register', {
        method: 'POST',
        body: {
          fullName: 'Candidate Offer',
          email: 'candidate-offer@example.com',
          password: 'pass1234'
        }
      });
      assert.equal(candidateRegister.res.status, 201);
      const candidateToken = candidateRegister.json.accessToken;

      const apply = await requestJson(baseUrl, '/jobs/job_tokyo_senior_welder_001/applications', {
        method: 'POST',
        accessToken: candidateToken,
        body: {
          note: 'Offer flow test'
        }
      });
      assert.equal(apply.res.status, 201);
      const applicationId = apply.json.application.id;

      const offer = await requestJson(baseUrl, `/admin/applications/${applicationId}/status`, {
        method: 'PATCH',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          status: 'OFFERED',
          reason: 'Offer issued'
        }
      });
      assert.equal(offer.res.status, 200);
      assert.equal(offer.json.application.status, 'OFFERED');

      const directFinalize = await requestJson(baseUrl, `/admin/applications/${applicationId}/status`, {
        method: 'PATCH',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          status: 'HIRED'
        }
      });
      assert.equal(directFinalize.res.status, 409);
      assert.equal(directFinalize.json.error.code, 'offer_decision_required');

      const acceptOffer = await requestJson(baseUrl, `/users/me/applications/${applicationId}/offer/accept`, {
        method: 'POST',
        accessToken: candidateToken,
        body: {
          reason: 'I accept this offer'
        }
      });
      assert.equal(acceptOffer.res.status, 200);
      assert.equal(acceptOffer.json.application.status, 'HIRED');
      assert.equal(acceptOffer.json.journeyEvent.status, 'HIRED');

      const acceptAgain = await requestJson(baseUrl, `/users/me/applications/${applicationId}/offer/accept`, {
        method: 'POST',
        accessToken: candidateToken,
        body: {}
      });
      assert.equal(acceptAgain.res.status, 409);
      assert.equal(acceptAgain.json.error.code, 'offer_not_available');

      const secondApply = await requestJson(baseUrl, '/jobs/job_osaka_cnc_operator_002/applications', {
        method: 'POST',
        accessToken: candidateToken,
        body: {
          note: 'Second offer flow test'
        }
      });
      assert.equal(secondApply.res.status, 201);
      const secondApplicationId = secondApply.json.application.id;

      const secondOffer = await requestJson(baseUrl, `/admin/applications/${secondApplicationId}/status`, {
        method: 'PATCH',
        adminApiKey: TEST_ADMIN_API_KEY,
        body: {
          status: 'OFFERED'
        }
      });
      assert.equal(secondOffer.res.status, 200);

      const declineOffer = await requestJson(baseUrl, `/users/me/applications/${secondApplicationId}/offer/decline`, {
        method: 'POST',
        accessToken: candidateToken,
        body: {
          reason: 'Need to postpone relocation'
        }
      });
      assert.equal(declineOffer.res.status, 200);
      assert.equal(declineOffer.json.application.status, 'REJECTED');

      const journey = await requestJson(baseUrl, `/users/me/applications/${secondApplicationId}/journey`, {
        accessToken: candidateToken
      });
      assert.equal(journey.res.status, 200);
      assert.equal(journey.json.journey.at(-1).status, 'REJECTED');
      assert.match(journey.json.journey.at(-1).description, /Need to postpone relocation/);
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
