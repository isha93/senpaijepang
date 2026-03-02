# Web Admin Implementation Plan v1 (React Responsive)

Date: 2026-03-02
Owner: Web Dashboard Track
Status: Draft Active

## 1. Design Asset Scan Result
Source folder scanned:
- `/Users/isanf/Downloads/stitch_job_detail_view`

Found screens:
- `admin_ops_dashboard_overview`
- `jobs_management_editor`
- `kyc_review_queue_drawer`
- `system_health_metrics_monitoring`

Asset format:
- each screen has `code.html` + `screen.png`

Key findings:
- Export is static HTML (Tailwind CDN), not app code.
- Data is hardcoded mock content.
- Responsive behavior is partial; some layouts are mobile-locked (`max-w-md`).
- There is no routing/state/auth/API integration yet.

Conclusion:
- Assets are good for visual reference.
- Need full React implementation with adaptive layout system so one codebase works for web desktop and mobile browser.

## 2. Product Target
Build an internal Admin Ops dashboard that adapts by viewport:
- Desktop web: full sidebar + dense table/workflow layout.
- Mobile web: stacked cards + bottom-sheet/detail pattern.
- Same routes and same API contracts for both modes.

## 3. Technical Stack (Proposed)
- React + TypeScript + Vite
- React Router
- TanStack Query
- Axios (or fetch wrapper) + Zod runtime validation
- React Hook Form + Zod resolver
- Tailwind CSS (project-local, no CDN)
- Optional: Zustand for local UI state (drawer/filter preferences)

## 4. App Structure (Proposed)
New workspace:
- `apps/web-admin`

Core modules:
- `src/app` (router, providers, auth guard)
- `src/layout` (desktop shell, mobile shell)
- `src/features/auth`
- `src/features/overview`
- `src/features/kyc-review`
- `src/features/jobs-admin`
- `src/features/feed-admin`
- `src/features/organizations-admin`
- `src/features/system-health`
- `src/features/public-surface-preview`
- `src/shared/api`
- `src/shared/ui`
- `src/shared/utils`

## 5. Responsive Strategy (Dynamic Web/Mobile)
Breakpoints:
- mobile: `<768`
- tablet: `768-1023`
- desktop: `>=1024`

Adaptive behavior rules:
- Navigation:
  - desktop: persistent left sidebar
  - mobile: top bar + bottom navigation or compact menu
- Lists:
  - desktop: dense table with sticky header
  - mobile: card list with collapsible details
- Detail actions:
  - desktop: right-side drawer
  - mobile: full-width bottom sheet
- Forms:
  - desktop: 2-column sections
  - mobile: 1-column stacked sections

## 6. API Integration Scope (Runtime v0)
Auth:
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`

Overview/System:
- `GET /health`
- `GET /metrics`

KYC review:
- `GET /admin/kyc/review-queue`
- `POST /admin/kyc/review`

Jobs admin:
- `GET /admin/jobs`
- `POST /admin/jobs`
- `PATCH /admin/jobs/{jobId}`
- `DELETE /admin/jobs/{jobId}`

Feed admin:
- `GET /admin/feed/posts`
- `POST /admin/feed/posts`
- `PATCH /admin/feed/posts/{postId}`
- `DELETE /admin/feed/posts/{postId}`

Organizations admin:
- `GET /admin/organizations`
- `PATCH /admin/organizations/{orgId}/verification`

Public surface preview (read-only QA):
- `GET /jobs`
- `GET /feed/posts`

## 7. Delivery Plan (Execution Order)

Phase 0 - Bootstrap (Day 1)
- Create `apps/web-admin` scaffold.
- Setup router, providers, env handling.
- Setup Tailwind local build.
- Setup API client + auth token storage.

Phase 1 - Shell + Auth (Day 1-2)
- Build responsive app shell (desktop/mobile variants).
- Implement login page and protected routes.
- Implement session refresh flow and unauthorized handling.

Phase 2 - KYC Review Core (Day 2-4)
- Build KYC queue list with filters.
- Build detail drawer/bottom sheet adaptive.
- Build decision modal/form (`MANUAL_REVIEW|VERIFIED|REJECTED`).

Phase 3 - Jobs + Feed Admin CRUD (Day 4-6)
- Implement jobs list/search/pagination + create/edit/delete.
- Implement feed list/filter + create/edit/delete.
- Add consistent form validation and optimistic UX where safe.

Phase 4 - Organizations + System Health + Public Preview (Day 6-7)
- Organizations list + verification update flow.
- Health/metrics page with compact charts and route metrics table.
- Public jobs/feed preview panel so ops can validate user-facing output after content updates.

Phase 5 - Hardening + QA (Day 7-8)
- Empty/loading/error states for all screens.
- Role guard and fallback auth behavior checks.
- Regression pass across desktop + mobile web.

## 8. Definition of Done (MVP Web Dashboard)
- All pages render from real API responses (no hardcoded data).
- Desktop and mobile web both usable from same codebase.
- Auth/session flow stable.
- Critical admin actions have confirmation and error feedback.
- No blocker P0/P1 for KYC review + jobs/feed/org workflows.
- Public preview panel works for jobs/feed query/filter QA.

## 9. Immediate Next Action
Start implementation from Phase 0:
- scaffold `apps/web-admin`
- setup route skeleton and responsive shell
- wire login + `/auth/me` check

## 10. API Dependency Companion
Untuk endpoint tambahan yang dibutuhkan iterasi dashboard berikutnya, refer ke:
- `docs/architecture/API-NEXT-ITERATION-PLAN-v1.md`
