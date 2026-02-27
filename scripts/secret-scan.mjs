#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const MAX_BYTES = 1024 * 1024;

const RULES = [
  {
    id: 'clickup_token',
    pattern: /\bpk_[A-Za-z0-9]{30,}\b/g,
    message: 'Potential ClickUp personal token'
  },
  {
    id: 'github_pat',
    pattern: /\bghp_[A-Za-z0-9]{30,}\b/g,
    message: 'Potential GitHub personal access token'
  },
  {
    id: 'openai_key',
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
    message: 'Potential OpenAI API key'
  },
  {
    id: 'aws_access_key',
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    message: 'Potential AWS access key id'
  },
  {
    id: 'private_key',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    message: 'Potential private key material'
  }
];

const ALLOWLIST_PATHS = new Set([
  '.env.example'
]);

function getTrackedFiles() {
  const output = execSync('git ls-files', { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8');
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const binaryLike = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.pdf',
    '.zip',
    '.gz',
    '.ico',
    '.woff',
    '.woff2',
    '.ttf',
    '.mp4'
  ]);
  return !binaryLike.has(ext);
}

const findings = [];
const files = getTrackedFiles();

for (const relativePath of files) {
  if (ALLOWLIST_PATHS.has(relativePath)) {
    continue;
  }
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    continue;
  }
  if (!isTextFile(relativePath)) {
    continue;
  }
  const stat = fs.statSync(absolutePath);
  if (stat.size > MAX_BYTES) {
    continue;
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  const lines = content.split('\n');

  for (const rule of RULES) {
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (rule.pattern.test(line)) {
        findings.push({
          file: relativePath,
          line: i + 1,
          rule: rule.id,
          message: rule.message,
          snippet: line.trim().slice(0, 160)
        });
      }
      rule.pattern.lastIndex = 0;
    }
  }
}

if (findings.length > 0) {
  console.error(`[secret-scan] FAILED: ${findings.length} finding(s)`);
  for (const finding of findings.slice(0, 50)) {
    console.error(
      `- ${finding.file}:${finding.line} [${finding.rule}] ${finding.message} :: ${finding.snippet}`
    );
  }
  process.exit(1);
}

console.log(`[secret-scan] OK: scanned ${files.length} tracked files`);
