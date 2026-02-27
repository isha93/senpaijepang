#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const API_BASE = 'https://api.clickup.com/api/v2';
const DEFAULT_TIMEOUT_MS = Number(process.env.CLICKUP_HTTP_TIMEOUT_MS || 20000);
const DEFAULT_MAX_TASK_PAGES = Number(process.env.CLICKUP_MAX_TASK_PAGES || 10);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function requiredArg(args, name) {
  const value = args[name];
  if (!value) throw new Error(`Missing required argument: --${name}`);
  return value;
}

function toMs(dateStr) {
  const date = new Date(`${dateStr}T23:59:59.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}. Use YYYY-MM-DD`);
  }
  return String(date.getTime());
}

function parseAssignees(value) {
  return String(value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function extractSprintFromTaskName(name) {
  const match = String(name || '').match(/^\[(S\d+)\]/i);
  return match ? match[1].toUpperCase() : null;
}

async function clickupRequest({ method, endpoint, token, body, query }) {
  const queryString = query
    ? `?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null)).toString()}`
    : '';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}${queryString}`, {
      method,
      headers: {
        Authorization: token,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`ClickUp API ${method} ${endpoint} timed out after ${DEFAULT_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ClickUp API ${method} ${endpoint} failed: ${res.status} ${text}`);
  }

  return res.json();
}

async function getListsInFolder({ token, folderId }) {
  const res = await clickupRequest({
    method: 'GET',
    endpoint: `/folder/${folderId}/list`,
    token
  });
  return res.lists || [];
}

async function getTasksInList({ token, listId }) {
  const allTasks = [];
  const pageLimit = Number.isFinite(DEFAULT_MAX_TASK_PAGES) && DEFAULT_MAX_TASK_PAGES > 0 ? DEFAULT_MAX_TASK_PAGES : 10;
  let page = 0;

  while (page < pageLimit) {
    const res = await clickupRequest({
      method: 'GET',
      endpoint: `/list/${listId}/task`,
      token,
      query: { archived: 'false', page }
    });

    const tasks = res.tasks || [];
    allTasks.push(...tasks);

    if (tasks.length === 0) break;
    const lastPage = Number.isFinite(Number(res.last_page)) ? Number(res.last_page) : null;
    if (lastPage !== null && page >= lastPage) break;
    if (tasks.length < 100) break;

    page += 1;
  }

  return allTasks;
}

async function updateTask({ token, taskId, dueDateMs, assignees, replaceAssignees, existingAssigneeIds }) {
  const assigneePayload = replaceAssignees
    ? {
        add: assignees,
        rem: (existingAssigneeIds || []).filter((id) => !assignees.includes(id))
      }
    : {
        add: assignees,
        rem: []
      };

  return clickupRequest({
    method: 'PUT',
    endpoint: `/task/${taskId}`,
    token,
    body: {
      due_date: dueDateMs,
      assignees: assigneePayload
    }
  });
}

async function loadRules(args) {
  if (args.config) {
    const configPath = path.resolve(process.cwd(), args.config);
    const raw = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw);

    return {
      folderId: parsed.folderId,
      rules: (parsed.rules || []).map((rule) => ({
        sprint: String(rule.sprint || '').toUpperCase(),
        dueDateMs: toMs(rule.dueDate),
        assignees: rule.assignees || []
      }))
    };
  }

  const folderId = requiredArg(args, 'folder-id');
  const sprint = String(requiredArg(args, 'sprint')).toUpperCase();
  const dueDate = requiredArg(args, 'due-date');
  const assignees = parseAssignees(requiredArg(args, 'assignees'));

  return {
    folderId,
    rules: [
      {
        sprint,
        dueDateMs: toMs(dueDate),
        assignees
      }
    ]
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = Boolean(args['dry-run']);
  const replaceAssignees = Boolean(args['replace-assignees']);

  const token = requiredEnv('CLICKUP_TOKEN');
  const { folderId, rules } = await loadRules(args);

  if (!folderId) {
    throw new Error('Missing folderId in config or --folder-id');
  }
  if (!rules.length) {
    throw new Error('No sprint rules provided.');
  }

  const ruleBySprint = new Map(rules.map((r) => [r.sprint, r]));

  console.log(`Folder: ${folderId}`);
  console.log(`Rules: ${rules.map((r) => `${r.sprint} (due ${new Date(Number(r.dueDateMs)).toISOString().slice(0, 10)})`).join(', ')}`);

  const lists = await getListsInFolder({ token, folderId });
  let updated = 0;
  let skippedNoRule = 0;
  let skippedNoSprintPrefix = 0;

  for (const list of lists) {
    const tasks = await getTasksInList({ token, listId: list.id });
    console.log(`Scanning list "${list.name}": ${tasks.length} tasks`);

    for (const task of tasks) {
      const sprint = extractSprintFromTaskName(task.name);
      if (!sprint) {
        skippedNoSprintPrefix += 1;
        continue;
      }

      const rule = ruleBySprint.get(sprint);
      if (!rule) {
        skippedNoRule += 1;
        continue;
      }

      const existingAssigneeIds = (task.assignees || []).map((a) => String(a.id));
      if (dryRun) {
        console.log(`[DRY-RUN] ${task.name} -> due ${new Date(Number(rule.dueDateMs)).toISOString().slice(0, 10)}, assignees: ${rule.assignees.join(',')}`);
        continue;
      }

      await updateTask({
        token,
        taskId: task.id,
        dueDateMs: rule.dueDateMs,
        assignees: rule.assignees,
        replaceAssignees,
        existingAssigneeIds
      });
      updated += 1;
    }
  }

  console.log(`Updated tasks: ${updated}`);
  console.log(`Skipped (no sprint prefix): ${skippedNoSprintPrefix}`);
  console.log(`Skipped (no rule for sprint): ${skippedNoRule}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
