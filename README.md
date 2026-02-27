# SenpaiJepang MVP Monorepo

Trust-first platform for verified migration infrastructure (Indonesia -> Japan).

## Structure
- `apps/api`: backend API starter (health endpoint + test).
- `apps/web-sdm`: SDM website starter (mobile-web first placeholder).
- `apps/dashboard`: TSK/LPK dashboard starter.
- `apps/admin`: Ops/Admin console starter.
- `packages/types`: shared domain constants/types placeholder.
- `packages/config`: shared runtime config placeholder.
- `packages/ui`: shared UI/brand constants placeholder.
- `tracking/clickup`: ClickUp setup docs + templates for sprint execution.
- `tracking/trello`: Trello fallback templates.

## Local Setup
1. `cp .env.example .env`
2. `npm install`
3. `docker compose up -d`

## Development Commands
- Build/check: `npm run ci`
- Test: `npm run test`
- Lint: `npm run lint`
- API dev: `npm run dev:api`
- SDM web dev: `npm run dev:web-sdm`
- Dashboard dev: `npm run dev:dashboard`
- Admin dev: `npm run dev:admin`

## Planning and Architecture Docs
- `docs/architecture/ARCHITECTURE-HLD-LLD-v1.md`
- `docs/architecture/SCALABLE-QUALITY-BUSINESS-PLAN-v1.md`
- `docs/architecture/MVP-SPRINT-PLAN-v1.md`
- `docs/architecture/erd-v1.dbml`
- `docs/architecture/openapi-v1.yaml`

## Delivery Tracking
- Primary: `tracking/clickup/README.md`
- Fallback: `tracking/trello/README.md`
