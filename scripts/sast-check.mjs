#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = ['apps', 'packages'];
const TARGET_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx']);

const RULES = [
  {
    id: 'no_eval',
    pattern: /\beval\s*\(/,
    message: 'Avoid eval() in application code.'
  },
  {
    id: 'no_new_function',
    pattern: /\bnew Function\s*\(/,
    message: 'Avoid dynamic Function constructor in application code.'
  },
  {
    id: 'no_shell_exec',
    pattern: /\bchild_process\.exec\s*\(/,
    message: 'Avoid child_process.exec in application code.'
  },
  {
    id: 'no_shell_exec_sync',
    pattern: /\bexecSync\s*\(/,
    message: 'Avoid execSync in application code.'
  }
];

function collectFiles(startDir, out = []) {
  if (!fs.existsSync(startDir)) return out;
  const entries = fs.readdirSync(startDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(startDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }
      collectFiles(fullPath, out);
      continue;
    }
    if (TARGET_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(fullPath);
    }
  }
  return out;
}

function getLine(text, lineNo) {
  return text.split('\n')[lineNo - 1] || '';
}

const files = TARGET_DIRS.flatMap((dir) => collectFiles(path.join(ROOT, dir)));
const findings = [];

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        findings.push({
          file: path.relative(ROOT, filePath),
          line: i + 1,
          rule: rule.id,
          message: rule.message,
          snippet: getLine(content, i + 1).trim()
        });
      }
    }
  }
}

if (findings.length > 0) {
  console.error(`[sast] FAILED: ${findings.length} finding(s)`);
  for (const finding of findings.slice(0, 50)) {
    console.error(
      `- ${finding.file}:${finding.line} [${finding.rule}] ${finding.message} :: ${finding.snippet}`
    );
  }
  process.exit(1);
}

console.log(`[sast] OK: scanned ${files.length} files`);
