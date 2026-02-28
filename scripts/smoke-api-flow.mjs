#!/usr/bin/env node

import { createHmac } from 'node:crypto';

const base = String(process.env.SMOKE_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');
const adminKey = String(process.env.SMOKE_ADMIN_KEY || process.env.ADMIN_API_KEY || 'smoke-admin-key');
const webhookSecret = String(process.env.SMOKE_WEBHOOK_SECRET || '').trim();
const email = `smoke-${Date.now()}@example.com`;

async function request(path, { method = 'GET', token, body, headers: extraHeaders } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (path.startsWith('/admin/')) headers['x-admin-api-key'] = adminKey;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (extraHeaders) Object.assign(headers, extraHeaders);

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  return { res, json };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function step(label) {
  process.stdout.write(`- ${label}\n`);
}

async function main() {
  step('GET /health');
  const health = await request('/health');
  assert(health.res.status === 200, `health status ${health.res.status}`);
  assert(health.json?.status === 'ok', 'health payload invalid');
  assert(health.res.headers.get('x-request-id'), 'x-request-id missing');

  step('POST /auth/register');
  const register = await request('/auth/register', {
    method: 'POST',
    body: {
      fullName: 'Smoke User',
      email,
      password: 'pass1234'
    }
  });
  assert(register.res.status === 201, `register status ${register.res.status}`);
  assert(Array.isArray(register.json?.user?.roles), 'roles missing');
  assert(register.json.user.roles.includes('sdm'), 'default role sdm missing');

  const accessToken = register.json.accessToken;

  step('GET /auth/me');
  const me = await request('/auth/me', { token: accessToken });
  assert(me.res.status === 200, `me status ${me.res.status}`);
  assert(me.json?.user?.email === email, 'me email mismatch');

  step('GET /jobs');
  const jobs = await request('/jobs?limit=2', { token: accessToken });
  assert(jobs.res.status === 200, `jobs status ${jobs.res.status}`);
  assert(Array.isArray(jobs.json?.items) && jobs.json.items.length > 0, 'jobs list empty');
  const targetJobId = jobs.json.items[0].id;

  step('POST /users/me/saved-jobs');
  const saveJob = await request('/users/me/saved-jobs', {
    method: 'POST',
    token: accessToken,
    body: { jobId: targetJobId }
  });
  assert(saveJob.res.status === 200, `save job status ${saveJob.res.status}`);
  assert(saveJob.json?.saved === true, 'save job should return saved=true');

  step('GET /users/me/saved-jobs');
  const savedJobs = await request('/users/me/saved-jobs?limit=5', { token: accessToken });
  assert(savedJobs.res.status === 200, `saved jobs status ${savedJobs.res.status}`);
  assert(savedJobs.json?.items?.some((item) => item.id === targetJobId), 'saved jobs should include target job');

  step('POST /jobs/{jobId}/applications');
  const applyJob = await request(`/jobs/${targetJobId}/applications`, {
    method: 'POST',
    token: accessToken,
    body: { note: 'smoke apply note' }
  });
  assert(applyJob.res.status === 201 || applyJob.res.status === 200, `apply status ${applyJob.res.status}`);
  assert(applyJob.json?.application?.id, 'application id missing');
  const applicationId = applyJob.json.application.id;

  step('GET /users/me/applications');
  const applications = await request('/users/me/applications?limit=5', { token: accessToken });
  assert(applications.res.status === 200, `applications status ${applications.res.status}`);
  assert(applications.json?.items?.some((item) => item.id === applicationId), 'application should be listed');

  step('GET /users/me/applications/{applicationId}/journey');
  const applicationJourney = await request(`/users/me/applications/${applicationId}/journey`, {
    token: accessToken
  });
  assert(applicationJourney.res.status === 200, `journey status ${applicationJourney.res.status}`);
  assert(Array.isArray(applicationJourney.json?.journey), 'application journey should be array');

  step('GET /feed/posts');
  const feed = await request('/feed/posts?limit=2', { token: accessToken });
  assert(feed.res.status === 200, `feed status ${feed.res.status}`);
  assert(Array.isArray(feed.json?.items) && feed.json.items.length > 0, 'feed list empty');
  const targetPostId = feed.json.items[0].id;

  step('POST /users/me/saved-posts');
  const savePost = await request('/users/me/saved-posts', {
    method: 'POST',
    token: accessToken,
    body: { postId: targetPostId }
  });
  assert(savePost.res.status === 200, `save post status ${savePost.res.status}`);
  assert(savePost.json?.saved === true, 'save post should return saved=true');

  step('GET /users/me/saved-posts');
  const savedPosts = await request('/users/me/saved-posts?limit=5', { token: accessToken });
  assert(savedPosts.res.status === 200, `saved posts status ${savedPosts.res.status}`);
  assert(savedPosts.json?.items?.some((item) => item.id === targetPostId), 'saved posts should include target post');

  step('POST /identity/kyc/sessions');
  const session = await request('/identity/kyc/sessions', {
    method: 'POST',
    token: accessToken,
    body: { provider: 'sumsub' }
  });
  assert(session.res.status === 201, `kyc session status ${session.res.status}`);
  const sessionId = session.json.session.id;

  step('POST /identity/kyc/sessions/{sessionId}/provider-metadata');
  const providerMetadata = await request(`/identity/kyc/sessions/${sessionId}/provider-metadata`, {
    method: 'POST',
    token: accessToken,
    body: {
      providerRef: `smoke-provider-${sessionId}`,
      metadata: { source: 'smoke' }
    }
  });
  assert(providerMetadata.res.status === 200, `provider-metadata status ${providerMetadata.res.status}`);
  assert(providerMetadata.json?.session?.providerRef, 'providerRef missing after provider-metadata');

  const checksum = 'a3f9f6f30311d8e8860f5f5f5366f6544dc34e8e833b8f13294f129f0d4af167';

  step('POST /identity/kyc/upload-url');
  const uploadUrl = await request('/identity/kyc/upload-url', {
    method: 'POST',
    token: accessToken,
    body: {
      sessionId,
      documentType: 'KTP',
      fileName: 'ktp-front.jpg',
      contentType: 'image/jpeg',
      contentLength: 512000,
      checksumSha256: checksum
    }
  });
  assert(uploadUrl.res.status === 201, `upload-url status ${uploadUrl.res.status}`);
  const objectKey = uploadUrl.json?.upload?.objectKey;
  assert(objectKey, 'objectKey missing in upload-url response');

  step('POST /identity/kyc/documents');
  const uploadDocument = await request('/identity/kyc/documents', {
    method: 'POST',
    token: accessToken,
    body: {
      sessionId,
      documentType: 'KTP',
      objectKey,
      checksumSha256: checksum,
      metadata: { side: 'front' }
    }
  });
  assert(uploadDocument.res.status === 201, `documents status ${uploadDocument.res.status}`);
  assert(uploadDocument.json?.session?.status === 'CREATED', 'expected CREATED after document upload');

  step('POST /identity/kyc/sessions/{sessionId}/submit');
  const submit = await request(`/identity/kyc/sessions/${sessionId}/submit`, {
    method: 'POST',
    token: accessToken,
    body: {}
  });
  assert(submit.res.status === 200, `submit status ${submit.res.status}`);
  assert(submit.json?.session?.status === 'SUBMITTED', 'expected SUBMITTED');

  if (webhookSecret) {
    step('POST /identity/kyc/provider-webhook');
    const idempotencyKey = `smoke-webhook-${sessionId}`;
    const timestampMs = Date.now();
    const webhookPayload = {
      sessionId,
      providerRef: `smoke-provider-${sessionId}`,
      metadata: { signal: 'provider_stub' }
    };
    const payloadRaw = JSON.stringify(webhookPayload);
    const signature = createHmac('sha256', webhookSecret)
      .update(`${timestampMs}.${idempotencyKey}.${payloadRaw}`)
      .digest('hex');
    const webhook = await request('/identity/kyc/provider-webhook', {
      method: 'POST',
      body: webhookPayload,
      headers: {
        'x-kyc-webhook-secret': webhookSecret,
        'x-idempotency-key': idempotencyKey,
        'x-kyc-webhook-signature': `sha256=${signature}`,
        'x-kyc-webhook-timestamp': String(timestampMs)
      }
    });
    assert(webhook.res.status === 202, `provider-webhook status ${webhook.res.status}`);
    assert(webhook.json?.accepted === true, 'provider-webhook accepted should be true');
  }

  step('GET /admin/kyc/review-queue');
  const queue = await request('/admin/kyc/review-queue?status=SUBMITTED&limit=10');
  assert(queue.res.status === 200, `queue status ${queue.res.status}`);
  assert(queue.json?.count >= 1, 'queue should have at least one item');

  step('POST /admin/kyc/review');
  const review = await request('/admin/kyc/review', {
    method: 'POST',
    body: {
      sessionId,
      decision: 'VERIFIED',
      reviewedBy: 'ops@senpaijepang.com',
      reason: 'smoke_test'
    }
  });
  assert(review.res.status === 200, `review status ${review.res.status}`);
  assert(review.json?.session?.status === 'VERIFIED', 'expected VERIFIED');

  step('GET /admin/jobs');
  const adminJobs = await request('/admin/jobs?limit=5');
  assert(adminJobs.res.status === 200, `admin jobs status ${adminJobs.res.status}`);
  assert(Array.isArray(adminJobs.json?.items), 'admin jobs items invalid');

  step('POST /admin/jobs');
  const createJob = await request('/admin/jobs', {
    method: 'POST',
    body: {
      title: 'Smoke API Machinist',
      employmentType: 'FULL_TIME',
      visaSponsorship: true,
      description: 'Position created by smoke flow for admin CRUD verification.',
      requirements: ['Minimum 2 years experience', 'Able to work in shifts'],
      location: {
        countryCode: 'JP',
        city: 'Yokohama',
        displayLabel: 'Yokohama, JP',
        latitude: 35.4437,
        longitude: 139.638
      },
      employer: {
        id: 'emp_smoke_admin',
        name: 'Smoke Admin Industries',
        logoUrl: null,
        isVerifiedEmployer: true
      }
    }
  });
  assert(createJob.res.status === 201, `admin create job status ${createJob.res.status}`);
  const smokeJobId = createJob.json?.job?.id;
  assert(smokeJobId, 'admin create job id missing');

  step('PATCH /admin/jobs/{jobId}');
  const patchJob = await request(`/admin/jobs/${smokeJobId}`, {
    method: 'PATCH',
    body: {
      title: 'Smoke API Machinist Updated'
    }
  });
  assert(patchJob.res.status === 200, `admin patch job status ${patchJob.res.status}`);
  assert(patchJob.json?.job?.title === 'Smoke API Machinist Updated', 'admin patch job title mismatch');

  step('DELETE /admin/jobs/{jobId}');
  const deleteJob = await request(`/admin/jobs/${smokeJobId}`, { method: 'DELETE' });
  assert(deleteJob.res.status === 200, `admin delete job status ${deleteJob.res.status}`);
  assert(deleteJob.json?.removed === true, 'admin delete job should return removed=true');

  step('GET /admin/feed/posts');
  const adminPosts = await request('/admin/feed/posts?limit=5');
  assert(adminPosts.res.status === 200, `admin feed status ${adminPosts.res.status}`);
  assert(Array.isArray(adminPosts.json?.items), 'admin feed items invalid');

  step('POST /admin/feed/posts');
  const createPost = await request('/admin/feed/posts', {
    method: 'POST',
    body: {
      title: 'Smoke Admin Feed',
      excerpt: 'Post created by smoke flow for admin CRUD verification.',
      category: 'ANNOUNCEMENT',
      author: 'Smoke Ops'
    }
  });
  assert(createPost.res.status === 201, `admin create feed status ${createPost.res.status}`);
  const smokePostId = createPost.json?.post?.id;
  assert(smokePostId, 'admin create feed post id missing');

  step('PATCH /admin/feed/posts/{postId}');
  const patchPost = await request(`/admin/feed/posts/${smokePostId}`, {
    method: 'PATCH',
    body: {
      title: 'Smoke Admin Feed Updated'
    }
  });
  assert(patchPost.res.status === 200, `admin patch feed status ${patchPost.res.status}`);
  assert(patchPost.json?.post?.title === 'Smoke Admin Feed Updated', 'admin patch feed title mismatch');

  step('DELETE /admin/feed/posts/{postId}');
  const deletePost = await request(`/admin/feed/posts/${smokePostId}`, { method: 'DELETE' });
  assert(deletePost.res.status === 200, `admin delete feed status ${deletePost.res.status}`);
  assert(deletePost.json?.removed === true, 'admin delete feed should return removed=true');

  step('GET /metrics');
  const metrics = await request('/metrics');
  assert(metrics.res.status === 200, `metrics status ${metrics.res.status}`);
  assert(Number.isInteger(metrics.json?.totalRequests), 'metrics totalRequests invalid');

  process.stdout.write(`SMOKE_OK (${email})\n`);
}

main().catch((error) => {
  process.stderr.write(`SMOKE_FAILED: ${error.message}\n`);
  process.exit(1);
});
