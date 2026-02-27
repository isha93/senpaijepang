#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'https://api.clickup.com/api/v2';
const DEFAULT_FOLDER_NAME = 'MVP 1.0 Sprint Execution';
const DEFAULT_HTTP_TIMEOUT_MS = Number(process.env.CLICKUP_HTTP_TIMEOUT_MS || 20000);
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
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function findByName(items, targetName) {
  const normalizedTarget = normalizeName(targetName);
  return (items || []).find((item) => normalizeName(item.name) === normalizedTarget);
}

async function loadTemplate(configPath) {
  const raw = await fs.readFile(configPath, 'utf8');
  return JSON.parse(raw);
}

async function clickupRequest({ method, endpoint, token, body, query }) {
  const queryString = query
    ? `?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null)).toString()}`
    : '';
  const url = `${API_BASE}${endpoint}${queryString}`;

  const headers = {
    Authorization: token
  };

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_HTTP_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`ClickUp API ${method} ${endpoint} timed out after ${DEFAULT_HTTP_TIMEOUT_MS}ms`);
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

async function getTeamId({ token, preferredTeamId }) {
  if (preferredTeamId) return preferredTeamId;

  const teamsRes = await clickupRequest({
    method: 'GET',
    endpoint: '/team',
    token
  });

  const teams = teamsRes.teams || [];
  if (teams.length === 0) {
    throw new Error('No ClickUp workspace/team found for this token.');
  }

  console.log(`No CLICKUP_TEAM_ID provided. Using first team: ${teams[0].name} (${teams[0].id})`);
  return teams[0].id;
}

async function getSpaces({ token, teamId }) {
  const res = await clickupRequest({
    method: 'GET',
    endpoint: `/team/${teamId}/space`,
    token
  });
  return res.spaces || [];
}

async function createSpace({ token, teamId, name, description }) {
  const payload = {
    name,
    multiple_assignees: true,
    features: {
      due_dates: {
        enabled: true,
        start_date: true,
        remap_due_dates: false,
        remap_closed_due_date: false
      },
      time_tracking: { enabled: false },
      tags: { enabled: true },
      custom_fields: { enabled: true },
      checklists: { enabled: true },
      remap_dependencies: { enabled: false },
      dependency_warning: { enabled: true },
      portfolios: { enabled: false }
    }
  };

  if (description) {
    payload.description = description;
  }

  return clickupRequest({
    method: 'POST',
    endpoint: `/team/${teamId}/space`,
    token,
    body: payload
  });
}

async function getFolders({ token, spaceId }) {
  const res = await clickupRequest({
    method: 'GET',
    endpoint: `/space/${spaceId}/folder`,
    token
  });
  return res.folders || [];
}

async function createFolder({ token, spaceId, name }) {
  return clickupRequest({
    method: 'POST',
    endpoint: `/space/${spaceId}/folder`,
    token,
    body: { name }
  });
}

async function getLists({ token, folderId }) {
  const res = await clickupRequest({
    method: 'GET',
    endpoint: `/folder/${folderId}/list`,
    token
  });
  return res.lists || [];
}

async function createList({ token, folderId, name, content }) {
  return clickupRequest({
    method: 'POST',
    endpoint: `/folder/${folderId}/list`,
    token,
    body: {
      name,
      content: content || ''
    }
  });
}

async function getTasks({ token, listId }) {
  const allTasks = [];
  const pageLimit = Number.isFinite(DEFAULT_MAX_TASK_PAGES) && DEFAULT_MAX_TASK_PAGES > 0 ? DEFAULT_MAX_TASK_PAGES : 10;
  let page = 0;
  let previousFirstTaskId = null;

  while (page < pageLimit) {
    const res = await clickupRequest({
      method: 'GET',
      endpoint: `/list/${listId}/task`,
      token,
      query: {
        archived: 'false',
        page
      }
    });

    const tasks = res.tasks || [];
    allTasks.push(...tasks);

    if (tasks.length === 0) break;
    if (tasks[0]?.id && tasks[0].id === previousFirstTaskId) break;

    const lastPage = Number.isFinite(Number(res.last_page)) ? Number(res.last_page) : null;
    if (lastPage !== null && page >= lastPage) break;
    if (tasks.length < 100) break;

    previousFirstTaskId = tasks[0]?.id || null;
    page += 1;
  }

  return allTasks;
}

async function createTask({ token, listId, task }) {
  return clickupRequest({
    method: 'POST',
    endpoint: `/list/${listId}/task`,
    token,
    body: {
      name: task.name,
      description: task.desc || '',
      tags: task.labels || []
    }
  });
}

async function createChecklist({ token, taskId, name }) {
  return clickupRequest({
    method: 'POST',
    endpoint: `/task/${taskId}/checklist`,
    token,
    body: { name }
  });
}

function extractChecklistId(response) {
  return response?.id || response?.checklist?.id || null;
}

async function createChecklistItem({ token, checklistId, name }) {
  return clickupRequest({
    method: 'POST',
    endpoint: `/checklist/${checklistId}/checklist_item`,
    token,
    body: { name, resolved: false }
  });
}

function groupCardsByList(cards) {
  const grouped = new Map();
  for (const card of cards || []) {
    if (!grouped.has(card.list)) {
      grouped.set(card.list, []);
    }
    grouped.get(card.list).push(card);
  }
  return grouped;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = Boolean(args['dry-run']);

  const defaultConfig = path.resolve(__dirname, '../tracking/clickup/mvp-workspace-template.json');
  const configPath = args.config ? path.resolve(process.cwd(), args.config) : defaultConfig;

  const template = await loadTemplate(configPath);
  const workspaceMeta = template.workspace || template.board || {};
  const workspaceName = workspaceMeta.name || 'SenpaiJepang MVP Delivery';
  const folderName = process.env.CLICKUP_FOLDER_NAME || DEFAULT_FOLDER_NAME;

  if (dryRun) {
    console.log('Dry-run mode enabled. No ClickUp API calls will be made.');
    console.log(`Template: ${configPath}`);
    console.log(`Workspace: ${workspaceName}`);
    console.log(`Folder: ${folderName}`);
    console.log(`Lists: ${(template.lists || []).length}`);
    console.log(`Cards/Tasks: ${(template.cards || []).length}`);
    console.log(`Unique labels/tags: ${(template.labels || []).length}`);
    return;
  }

  const token = requiredEnv('CLICKUP_TOKEN');
  const preferredTeamId = process.env.CLICKUP_TEAM_ID;
  const teamId = await getTeamId({ token, preferredTeamId });

  const existingSpaceId = process.env.CLICKUP_SPACE_ID;
  const existingFolderId = process.env.CLICKUP_FOLDER_ID;

  let spaceId = existingSpaceId;
  if (!spaceId) {
    const spaces = await getSpaces({ token, teamId });
    const existingSpace = findByName(spaces, workspaceName);

    if (existingSpace) {
      spaceId = existingSpace.id;
      console.log(`Reusing existing space: ${existingSpace.name} (${existingSpace.id})`);
    } else {
      const createdSpace = await createSpace({
        token,
        teamId,
        name: workspaceName,
        description: workspaceMeta.description || ''
      });
      spaceId = createdSpace.id;
      console.log(`Created space: ${createdSpace.name} (${createdSpace.id})`);
    }
  } else {
    console.log(`Using existing space: ${spaceId}`);
  }

  let folderId = existingFolderId;
  if (!folderId) {
    const folders = await getFolders({ token, spaceId });
    const existingFolder = findByName(folders, folderName);

    if (existingFolder) {
      folderId = existingFolder.id;
      console.log(`Reusing existing folder: ${existingFolder.name} (${existingFolder.id})`);
    } else {
      const createdFolder = await createFolder({
        token,
        spaceId,
        name: folderName
      });
      folderId = createdFolder.id;
      console.log(`Created folder: ${createdFolder.name} (${createdFolder.id})`);
    }
  } else {
    console.log(`Using existing folder: ${folderId}`);
  }

  const existingLists = await getLists({ token, folderId });
  const listIdByName = {};

  for (const listName of template.lists || []) {
    const existingList = findByName(existingLists, listName);
    if (existingList) {
      listIdByName[listName] = existingList.id;
      console.log(`Reusing existing list: ${existingList.name} (${existingList.id})`);
      continue;
    }

    const createdList = await createList({
      token,
      folderId,
      name: listName,
      content: `Auto-provisioned from template: ${workspaceName}`
    });
    listIdByName[listName] = createdList.id;
    console.log(`Created list: ${listName} (${createdList.id})`);
  }

  const cardsByList = groupCardsByList(template.cards || []);
  let createdTaskCount = 0;
  let skippedTaskCount = 0;

  for (const [listName, cards] of cardsByList.entries()) {
    const listId = listIdByName[listName];
    if (!listId) {
      throw new Error(`Task references unknown list: ${listName}`);
    }

    const existingTasks = await getTasks({ token, listId });
    console.log(`Scanning list "${listName}": found ${existingTasks.length} existing tasks`);
    const existingTaskNames = new Set(existingTasks.map((task) => normalizeName(task.name)));

    let listCreated = 0;
    let listSkipped = 0;
    for (const card of cards) {
      if (existingTaskNames.has(normalizeName(card.name))) {
        skippedTaskCount += 1;
        listSkipped += 1;
        continue;
      }

      const task = await createTask({ token, listId, task: card });
      createdTaskCount += 1;
      listCreated += 1;
      existingTaskNames.add(normalizeName(card.name));
      console.log(`Created task: ${card.name}`);

      if (Array.isArray(card.checklist) && card.checklist.length > 0) {
        const checklistResponse = await createChecklist({
          token,
          taskId: task.id,
          name: 'Acceptance Checklist'
        });
        const checklistId = extractChecklistId(checklistResponse);

        if (!checklistId) {
          throw new Error(
            `Checklist created but no checklist id found for task "${card.name}". ` +
              `Response shape: ${JSON.stringify(checklistResponse)}`
          );
        }

        for (const item of card.checklist) {
          await createChecklistItem({
            token,
            checklistId,
            name: item
          });
        }
      }
    }
    console.log(`List summary "${listName}": created ${listCreated}, skipped ${listSkipped}`);
  }

  console.log(`Created tasks: ${createdTaskCount}`);
  console.log(`Skipped existing tasks: ${skippedTaskCount}`);
  console.log(`Done. Space ID: ${spaceId}, Folder ID: ${folderId}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
