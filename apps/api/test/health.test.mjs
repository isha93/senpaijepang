import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

test('GET /health returns 200', async () => {
  const server = createServer();

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  const res = await fetch(`http://127.0.0.1:${port}/health`);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.status, 'ok');
  assert.ok(res.headers.get('x-request-id'));

  const metricsRes = await fetch(`http://127.0.0.1:${port}/metrics`);
  const metricsBody = await metricsRes.json();
  assert.equal(metricsRes.status, 200);
  assert.ok(Number.isInteger(metricsBody.totalRequests));
  assert.ok(metricsBody.totalRequests >= 1);
  assert.ok(typeof metricsBody.byStatus === 'object');

  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});
