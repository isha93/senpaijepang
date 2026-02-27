#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function loadTemplate(configPath) {
  const raw = await fs.readFile(configPath, 'utf8');
  return JSON.parse(raw);
}

async function trelloRequest({ method, endpoint, payload, key, token }) {
  const params = new URLSearchParams({ key, token });
  for (const [k, v] of Object.entries(payload || {})) {
    if (v === undefined || v === null || v === '') continue;
    params.append(k, String(v));
  }

  const url = `https://api.trello.com/1${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  };

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trello API ${method} ${endpoint} failed: ${res.status} ${text}`);
  }

  return res.json();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = Boolean(args['dry-run']);

  const defaultConfig = path.resolve(__dirname, '../tracking/trello/mvp-board-template.json');
  const configPath = args.config ? path.resolve(process.cwd(), args.config) : defaultConfig;

  const template = await loadTemplate(configPath);

  if (dryRun) {
    console.log('Dry-run mode enabled. No Trello API calls will be made.');
    console.log(`Template: ${configPath}`);
    console.log(`Board: ${template.board?.name || 'N/A'}`);
    console.log(`Lists: ${(template.lists || []).length}`);
    console.log(`Labels: ${(template.labels || []).length}`);
    console.log(`Cards: ${(template.cards || []).length}`);
    return;
  }

  const key = requiredEnv('TRELLO_KEY');
  const token = requiredEnv('TRELLO_TOKEN');
  const workspaceId = process.env.TRELLO_WORKSPACE_ID || process.env.TRELLO_ORG_ID;

  console.log(`Creating Trello board: ${template.board.name}`);

  const boardPayload = {
    name: template.board.name,
    desc: template.board.description || '',
    defaultLists: template.board.defaultLists === false ? 'false' : 'true'
  };

  if (workspaceId) {
    boardPayload.idOrganization = workspaceId;
  }

  const board = await trelloRequest({
    method: 'POST',
    endpoint: '/boards',
    payload: boardPayload,
    key,
    token
  });

  const listIdByName = {};
  for (const listName of template.lists || []) {
    const list = await trelloRequest({
      method: 'POST',
      endpoint: '/lists',
      payload: {
        idBoard: board.id,
        name: listName,
        pos: 'bottom'
      },
      key,
      token
    });
    listIdByName[listName] = list.id;
    console.log(`Created list: ${listName}`);
  }

  const labelIdByName = {};
  for (const label of template.labels || []) {
    const created = await trelloRequest({
      method: 'POST',
      endpoint: '/labels',
      payload: {
        idBoard: board.id,
        name: label.name,
        color: label.color || 'null'
      },
      key,
      token
    });
    labelIdByName[label.name] = created.id;
  }
  console.log(`Created labels: ${(template.labels || []).length}`);

  for (const card of template.cards || []) {
    const idList = listIdByName[card.list];
    if (!idList) {
      throw new Error(`Card references unknown list: ${card.list}`);
    }

    const idLabels = (card.labels || [])
      .map((labelName) => labelIdByName[labelName])
      .filter(Boolean)
      .join(',');

    const createdCard = await trelloRequest({
      method: 'POST',
      endpoint: '/cards',
      payload: {
        idList,
        name: card.name,
        desc: card.desc || '',
        idLabels,
        due: card.due || ''
      },
      key,
      token
    });

    if (card.checklist && card.checklist.length > 0) {
      const checklist = await trelloRequest({
        method: 'POST',
        endpoint: `/cards/${createdCard.id}/checklists`,
        payload: { name: 'Acceptance Checklist' },
        key,
        token
      });

      for (const item of card.checklist) {
        await trelloRequest({
          method: 'POST',
          endpoint: `/checklists/${checklist.id}/checkItems`,
          payload: {
            name: item,
            checked: 'false'
          },
          key,
          token
        });
      }
    }
  }

  console.log(`Created cards: ${(template.cards || []).length}`);
  console.log(`Board URL: ${board.url}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
