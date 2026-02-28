# ClickUp Tracking Setup (API MVP)

This folder maps API MVP planning docs into an executable ClickUp board.

## Files
- `tracking/clickup/mvp-workspace-template.json`: API-first board template (lists, labels, cards, acceptance checklist).
- `scripts/setup-clickup-workspace.mjs`: create/reuse Space, Folder, Lists, and tasks via ClickUp API v2.
- `scripts/set-clickup-sprint-owners-due.mjs`: bulk set assignee and due date by sprint prefix.
- `tracking/clickup/sprint-owners-due.sample.json`: sample config for owner + due mapping.

## Source plans linked by template
- `docs/architecture/MVP-API-BREAKDOWN-v1.md`
- `docs/architecture/MVP-API-NON-TECH-GUIDE-v1.md`
- `docs/architecture/API-PLAN-FIGMA-v1.md`
- `docs/architecture/API-PLAN-STITCH-SCREENS-v1.md`

## What provisioning creates
- Space: `SenpaiJepang MVP API Delivery`
- Folder: `MVP 1.0 Sprint Execution` (or `CLICKUP_FOLDER_NAME` if provided)
- Lists:
  - `Backlog - API MVP`
  - `Sprint Ready`
  - `In Progress`
  - `Review/QA`
  - `Blocked`
  - `Done`
- Cards: 14 API MVP tasks with acceptance checklists.
- Labels from template become task tags.

## Environment variables
Required for real sync:
- `CLICKUP_TOKEN`: personal API token.

Optional:
- `CLICKUP_TEAM_ID`: target workspace/team id.
- `CLICKUP_SPACE_ID`: force existing Space id.
- `CLICKUP_FOLDER_ID`: force existing Folder id.
- `CLICKUP_FOLDER_NAME`: folder name override (default: `MVP 1.0 Sprint Execution`).
- `CLICKUP_MAX_TASK_PAGES`: max pagination page while scanning list tasks (default: `10`).
- `CLICKUP_HTTP_TIMEOUT_MS`: request timeout in milliseconds (default: `20000`).

## 1) Dry-run first

```bash
cd /Users/ichsan/Documents/senpaijepang
node scripts/setup-clickup-workspace.mjs --dry-run
```

Expected dry-run output includes:
- workspace name
- folder name
- list count
- cards/tasks count
- label count

## 2) Sync to ClickUp (real run)

```bash
cd /Users/ichsan/Documents/senpaijepang
export CLICKUP_TOKEN='<your_clickup_token>'
# optional:
# export CLICKUP_TEAM_ID='<team_id>'
# export CLICKUP_SPACE_ID='<space_id>'
# export CLICKUP_FOLDER_ID='<folder_id>'
node scripts/setup-clickup-workspace.mjs
```

The script is idempotent by task name per list:
- existing tasks are skipped
- only missing tasks are created

## 3) Verify connection is correct
Run the real sync twice:
1. first run should create missing lists/tasks
2. second run should mostly show `skipped` and near-zero new `created` tasks

That confirms template <-> ClickUp is connected and in sync.

## 4) Set sprint owner and due date (optional)

```bash
cp tracking/clickup/sprint-owners-due.sample.json tracking/clickup/sprint-owners-due.json
node scripts/set-clickup-sprint-owners-due.mjs --config tracking/clickup/sprint-owners-due.json --dry-run
node scripts/set-clickup-sprint-owners-due.mjs --config tracking/clickup/sprint-owners-due.json
```

Use `--replace-assignees` to replace current assignees instead of adding.
