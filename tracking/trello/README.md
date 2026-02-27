# Trello Tracking Setup (MVP)

## Files
- `tracking/trello/mvp-board-template.json`: board template (lists, labels, cards).
- `scripts/setup-trello-board.mjs`: provisioning script using Trello API.

## 1) Prepare Trello credentials
- Get API key from `https://trello.com/app-key`
- Generate token with this URL format:

```text
https://trello.com/1/authorize?expiration=never&name=SenpaiJepangMVP&scope=read,write&response_type=token&key=<YOUR_TRELLO_KEY>
```

Optional:
- Set workspace ID if you want board created inside a specific workspace:
  - `TRELLO_WORKSPACE_ID=<workspace_id>`

## 2) Dry-run (recommended)
Run from project folder:

```bash
cd /Users/isanf/Documents/LAB/senpaijepang
node scripts/setup-trello-board.mjs --dry-run
```

## 3) Create the board

```bash
cd /Users/isanf/Documents/LAB/senpaijepang
export TRELLO_KEY='<your_key>'
export TRELLO_TOKEN='<your_token>'
# optional
# export TRELLO_WORKSPACE_ID='<workspace_id>'
node scripts/setup-trello-board.mjs
```

## 4) Use a custom template path (optional)

```bash
node scripts/setup-trello-board.mjs --config tracking/trello/mvp-board-template.json
```

## Notes
- Script creates a **new board** every run.
- All cards are created in `Backlog - MVP` list first.
- Sprint tracking uses labels: `Sprint S0` to `Sprint S5`.
- You can edit `mvp-board-template.json` before provisioning.
