#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    out[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}

function collectFiles(dir, exts, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      collectFiles(full, exts, acc);
    } else if (exts.includes(path.extname(entry.name))) {
      acc.push(full);
    }
  }
  return acc;
}

const args = parseArgs(process.argv.slice(2));
const task = String(args.task || 'lint');
const scope = String(args.scope || '.');
const cwd = process.cwd();
const target = path.resolve(cwd, scope);

if (!fs.existsSync(target)) {
  console.error(`Scope does not exist: ${scope}`);
  process.exit(1);
}

if (task === 'lint') {
  const files = collectFiles(target, ['.js', '.mjs', '.cjs']);
  for (const file of files) {
    const res = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
    if (res.status !== 0) process.exit(res.status || 1);
  }
  console.log(`[lint] OK: ${scope} (${files.length} JS files checked)`);
  process.exit(0);
}

if (task === 'typecheck') {
  console.log(`[typecheck] Placeholder OK: ${scope}`);
  process.exit(0);
}

if (task === 'test') {
  console.log(`[test] Placeholder OK: ${scope}`);
  process.exit(0);
}

console.log(`[${task}] No rule configured for ${scope}`);
process.exit(0);
