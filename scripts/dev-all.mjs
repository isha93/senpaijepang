#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const runtimeDir = path.join(rootDir, '.dev-runtime');
const logsDir = path.join(runtimeDir, 'logs');
const statePath = path.join(runtimeDir, 'dev-all-state.json');

const services = [
  {
    name: 'api',
    npmScript: 'dev:api',
    url: 'http://localhost:4000/health'
  },
  {
    name: 'web-sdm',
    npmScript: 'dev:web-sdm',
    url: 'http://localhost:3000'
  },
  {
    name: 'dashboard',
    npmScript: 'dev:dashboard',
    url: 'http://localhost:3001'
  },
  {
    name: 'admin',
    npmScript: 'dev:admin',
    url: 'http://localhost:3002'
  }
];

function log(message) {
  process.stdout.write(`[dev:all] ${message}\n`);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function ensureRuntimeDirs() {
  fs.mkdirSync(logsDir, { recursive: true });
}

function isProcessRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readState() {
  if (!fs.existsSync(statePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(statePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeState(state) {
  ensureRuntimeDirs();
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function removeState() {
  if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
  }
}

function runDockerCompose(args) {
  const result = spawnSync('docker', ['compose', ...args], {
    cwd: rootDir,
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    throw new Error(`docker compose ${args.join(' ')} failed`);
  }
}

function startService(service) {
  ensureRuntimeDirs();
  const logPath = path.join(logsDir, `${service.name}.log`);
  fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] starting ${service.npmScript}\n`);
  const logFd = fs.openSync(logPath, 'a');
  const child = spawn('npm', ['run', service.npmScript], {
    cwd: rootDir,
    detached: true,
    env: process.env,
    stdio: ['ignore', logFd, logFd]
  });
  fs.closeSync(logFd);

  if (!child.pid) {
    throw new Error(`failed to spawn ${service.npmScript}`);
  }
  child.unref();

  return {
    name: service.name,
    npmScript: service.npmScript,
    pid: child.pid,
    url: service.url,
    logPath
  };
}

async function waitUntilHealthy(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok) {
        return true;
      }
    } catch {}

    await sleep(500);
  }
  return false;
}

async function killProcessGroup(pid) {
  if (!isProcessRunning(pid)) {
    return;
  }

  const termTarget = process.platform === 'win32' ? pid : -pid;
  const killTarget = process.platform === 'win32' ? pid : -pid;

  try {
    process.kill(termTarget, 'SIGTERM');
  } catch {}

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (!isProcessRunning(pid)) {
      return;
    }
    await sleep(200);
  }

  try {
    process.kill(killTarget, 'SIGKILL');
  } catch {}
}

async function stopServices(serviceState) {
  for (const service of serviceState) {
    await killProcessGroup(Number(service.pid));
  }
}

function getAliveServicesFromState(state) {
  if (!state || !Array.isArray(state.services)) {
    return [];
  }
  return state.services.filter((service) => isProcessRunning(Number(service.pid)));
}

async function startAll() {
  const existing = readState();
  const aliveServices = getAliveServicesFromState(existing);

  if (aliveServices.length > 0) {
    log('service dev:all sudah berjalan. jalankan `npm run stop:all` dulu.');
    for (const service of aliveServices) {
      log(`- ${service.name} pid=${service.pid}`);
    }
    process.exit(1);
  }

  if (existing) {
    removeState();
  }

  log('starting local infra (docker compose up -d)');
  runDockerCompose(['up', '-d']);

  const started = [];

  try {
    for (const service of services) {
      const record = startService(service);
      started.push(record);
      log(`started ${service.name} (pid ${record.pid})`);
    }

    writeState({
      startedAt: new Date().toISOString(),
      services: started
    });

    log('waiting for services...');
    const readiness = await Promise.all(
      started.map(async (service) => ({
        service,
        ok: await waitUntilHealthy(service.url)
      }))
    );

    const failed = readiness.filter((entry) => !entry.ok);
    if (failed.length > 0) {
      log('some services did not become healthy in time; stopping all started services');
      await stopServices(started);
      removeState();
      process.exit(1);
    }

    log('all services are ready');
    for (const service of started) {
      log(`- ${service.name}: ${service.url} (log: ${path.relative(rootDir, service.logPath)})`);
    }
  } catch (error) {
    await stopServices(started);
    removeState();
    throw error;
  }
}

async function stopAll() {
  const state = readState();
  const aliveServices = getAliveServicesFromState(state);

  if (aliveServices.length === 0) {
    log('no dev:all process state found or all processes already stopped');
  } else {
    log('stopping app services');
    await stopServices(aliveServices);
  }

  removeState();

  log('stopping local infra (docker compose stop)');
  runDockerCompose(['stop']);
  log('all services stopped');
}

async function main() {
  const command = String(process.argv[2] || 'start')
    .trim()
    .toLowerCase();

  if (command === 'start') {
    await startAll();
    return;
  }

  if (command === 'stop') {
    await stopAll();
    return;
  }

  process.stderr.write(`Unknown command '${command}'. Use 'start' or 'stop'.\n`);
  process.exit(1);
}

main().catch((error) => {
  process.stderr.write(`[dev:all] ERROR: ${error.message}\n`);
  process.exit(1);
});
