#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

function run(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env
  });
  if (result.status !== 0 && !allowFailure) {
    process.exit(result.status || 1);
  }
  return result.status || 0;
}

const skipCi = process.argv.includes('--skip-ci');
const skipMigrate = process.argv.includes('--skip-migrate');

if (!skipCi) {
  console.log('[deploy:staging] Running quality gates (npm run ci)');
  run('npm', ['run', 'ci']);
} else {
  console.log('[deploy:staging] Skipping quality gates (--skip-ci)');
}

console.log('[deploy:staging] Starting infrastructure (docker compose up -d)');
run('docker', ['compose', 'up', '-d']);

if (!skipMigrate) {
  console.log('[deploy:staging] Applying API migrations (npm run migrate:api)');
  run('npm', ['run', 'migrate:api']);
} else {
  console.log('[deploy:staging] Skipping migration step (--skip-migrate)');
}

console.log('[deploy:staging] Completed. Next: start app runtimes for staging target.');
