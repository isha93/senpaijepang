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

test('feed posts listing works for guest with pagination', async () => {
  await withServer(async (baseUrl) => {
    const firstPage = await getJson(baseUrl, '/feed/posts?limit=2');
    assert.equal(firstPage.res.status, 200);
    assert.equal(firstPage.body.items.length, 2);
    assert.equal(firstPage.body.items[0].viewerState.authenticated, false);
    assert.equal(firstPage.body.items[0].viewerState.saved, false);
    assert.ok(firstPage.body.pageInfo.nextCursor);

    const secondPage = await getJson(baseUrl, `/feed/posts?cursor=${firstPage.body.pageInfo.nextCursor}&limit=2`);
    assert.equal(secondPage.res.status, 200);
    assert.ok(secondPage.body.items.length >= 1);
  });
});

test('saved posts flow: save, list, unsave', async () => {
  await withServer(async (baseUrl) => {
    const register = await postJson(baseUrl, '/auth/register', {
      fullName: 'Feed User',
      email: 'feed-user@example.com',
      password: 'pass1234'
    });
    assert.equal(register.res.status, 201);
    const accessToken = register.body.accessToken;

    const feed = await getJson(baseUrl, '/feed/posts', { accessToken });
    assert.equal(feed.res.status, 200);
    const postId = feed.body.items[0].id;
    assert.equal(feed.body.items[0].viewerState.saved, false);

    const save = await postJson(baseUrl, '/users/me/saved-posts', { postId }, { accessToken });
    assert.equal(save.res.status, 200);
    assert.equal(save.body.saved, true);
    assert.equal(save.body.postId, postId);

    const feedAfterSave = await getJson(baseUrl, '/feed/posts', { accessToken });
    const savedItem = feedAfterSave.body.items.find((item) => item.id === postId);
    assert.equal(savedItem.viewerState.saved, true);

    const savedPosts = await getJson(baseUrl, '/users/me/saved-posts', { accessToken });
    assert.equal(savedPosts.res.status, 200);
    assert.equal(savedPosts.body.items.length, 1);
    assert.equal(savedPosts.body.items[0].id, postId);

    const unsaveRes = await fetch(`${baseUrl}/users/me/saved-posts/${postId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const unsaveBody = await unsaveRes.json();
    assert.equal(unsaveRes.status, 200);
    assert.equal(unsaveBody.saved, false);
    assert.equal(unsaveBody.postId, postId);

    const savedPostsAfterUnsave = await getJson(baseUrl, '/users/me/saved-posts', { accessToken });
    assert.equal(savedPostsAfterUnsave.res.status, 200);
    assert.equal(savedPostsAfterUnsave.body.items.length, 0);
  });
});

test('saved posts endpoints require auth and validate input', async () => {
  await withServer(async (baseUrl) => {
    const missingToken = await postJson(baseUrl, '/users/me/saved-posts', { postId: 'post_jp_work_culture_001' });
    assert.equal(missingToken.res.status, 401);
    assert.equal(missingToken.body.error.code, 'missing_access_token');

    const register = await postJson(baseUrl, '/auth/register', {
      fullName: 'Feed User 2',
      email: 'feed-user-2@example.com',
      password: 'pass1234'
    });
    assert.equal(register.res.status, 201);
    const accessToken = register.body.accessToken;

    const invalid = await postJson(baseUrl, '/users/me/saved-posts', { postId: 'post_unknown_404' }, { accessToken });
    assert.equal(invalid.res.status, 404);
    assert.equal(invalid.body.error.code, 'post_not_found');

    const invalidCursor = await getJson(baseUrl, '/feed/posts?cursor=abc');
    assert.equal(invalidCursor.res.status, 400);
    assert.equal(invalidCursor.body.error.code, 'invalid_cursor');
  });
});
