# ClickUp Tracking Setup (MVP)

## Files
- `tracking/clickup/mvp-workspace-template.json`: template (lists, labels-as-tags, tasks, checklists).
- `scripts/setup-clickup-workspace.mjs`: provisioning script using ClickUp API v2.
- `scripts/set-clickup-sprint-owners-due.mjs`: bulk set owner and due date by sprint prefix (`[S0]`, `[S1]`, etc.).
- `tracking/clickup/sprint-owners-due.sample.json`: sample config for sprint owner/due-date mapping.

## What the script creates
Default structure:
- Space: `SenpaiJepang MVP 1.0 Delivery`
- Folder: `MVP 1.0 Sprint Execution`
- Lists:
  - `Backlog - MVP`
  - `Sprint Ready`
  - `In Progress`
  - `Review/QA`
  - `Blocked`
  - `Done`
- Tasks: 30 MVP tasks with checklist items.
- Labels from template are applied as task tags.

## 1) Prepare ClickUp credentials
Required:
- `CLICKUP_TOKEN` (personal API token)

Optional:
- `CLICKUP_TEAM_ID` (workspace/team id; if omitted script will use first accessible team)
- `CLICKUP_SPACE_ID` (reuse an existing Space)
- `CLICKUP_FOLDER_ID` (reuse an existing Folder)
- `CLICKUP_MAX_TASK_PAGES` (default `10`, pagination safety limit per list)
- `CLICKUP_HTTP_TIMEOUT_MS` (default `20000`)

## 2) Dry-run (recommended)

```bash
cd /Users/isanf/Documents/LAB/senpaijepang
node scripts/setup-clickup-workspace.mjs --dry-run
```

## 3) Create workspace structure and tasks

```bash
cd /Users/isanf/Documents/LAB/senpaijepang
export CLICKUP_TOKEN='<your_clickup_token>'
# optional
# export CLICKUP_TEAM_ID='<your_team_id>'
# export CLICKUP_SPACE_ID='<existing_space_id>'
# export CLICKUP_FOLDER_ID='<existing_folder_id>'
node scripts/setup-clickup-workspace.mjs
```

## 4) Custom template path (optional)

```bash
node scripts/setup-clickup-workspace.mjs --config tracking/clickup/mvp-workspace-template.json
```

## 5) Set owner + due date for Sprint 0 and Sprint 1 (bulk)

Get user IDs first:

```bash
curl -s -H "Authorization: $CLICKUP_TOKEN" https://api.clickup.com/api/v2/team/90182493856 | jq '.team.members[] | {id: .user.id, username: .user.username, email: .user.email}'
```

Copy sample config and edit assignee IDs:

```bash
cd /Users/isanf/Documents/LAB/senpaijepang
cp tracking/clickup/sprint-owners-due.sample.json tracking/clickup/sprint-owners-due.json
```

Dry-run first:

```bash
node scripts/set-clickup-sprint-owners-due.mjs --config tracking/clickup/sprint-owners-due.json --dry-run
```

Apply:

```bash
node scripts/set-clickup-sprint-owners-due.mjs --config tracking/clickup/sprint-owners-due.json
```

Optional:
- add `--replace-assignees` if you want to replace existing assignees instead of only adding.

## Notes
- Script can reuse existing Space/Folder/List by name when IDs are not provided.
- Task creation is idempotent by task name per list (existing names are skipped).
- You can still pin a target by setting `CLICKUP_SPACE_ID` and `CLICKUP_FOLDER_ID`.
