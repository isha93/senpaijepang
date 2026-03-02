# Dashboard Stitch Prompt v1 (React Admin Ops)

Date: 2026-03-02
Owner: Product + Frontend

## 1. Scope Context
Project state saat ini:
- API runtime sudah live dan siap dipakai staging.
- Belum ada frontend web production di repo.
- Endpoint admin yang sudah tersedia:
  - `GET/POST/PATCH/DELETE /admin/jobs`
  - `GET/POST/PATCH/DELETE /admin/feed/posts`
  - `GET /admin/organizations`
  - `PATCH /admin/organizations/{orgId}/verification`
  - `GET /admin/kyc/review-queue`
  - `POST /admin/kyc/review`
- Auth tersedia:
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `GET /auth/me`
- Health/metrics tersedia:
  - `GET /health`
  - `GET /metrics`

Target dashboard:
- Internal Ops/Admin console berbasis React.
- Fokus MVP web: moderation dan content/business operations.

## 1.1 Coverage Check (iOS App + Runtime API)
Berikut modul dashboard yang harus ada supaya selaras dengan app iOS user flow dan endpoint runtime yang sudah live:
- `Auth & Session`:
  - Login + refresh handling + session expired handling (`/auth/login`, `/auth/refresh`, `/auth/me`).
- `KYC Review Ops`:
  - Review queue + decision workflow (`/admin/kyc/review-queue`, `/admin/kyc/review`).
  - Dampak ke iOS: status/trust user pada profile verification.
- `Organizations Verification Ops`:
  - List/filter organization + update verification status (`/admin/organizations`, `/admin/organizations/{orgId}/verification`).
  - Dampak ke iOS: employer/org trust signals.
- `Jobs Management`:
  - CRUD penuh jobs (`/admin/jobs`, `/admin/jobs/{jobId}`).
  - Dampak ke iOS: tab Jobs, Job Detail, Saved Jobs, Apply flow.
- `Feed Posts Management`:
  - CRUD penuh posts (`/admin/feed/posts`, `/admin/feed/posts/{postId}`).
  - Dampak ke iOS: Home/Feed tab dan kategori konten (Visa Info, Safety, Job Market, Living Guide, Community).
- `System Status`:
  - Health + route metrics monitoring (`/health`, `/metrics`).

Tambahan yang direkomendasikan untuk dashboard (read-only QA panel):
- `Public Surface Preview`:
  - Preview hasil publish jobs via `/jobs`.
  - Preview hasil publish feed via `/feed/posts`.
  - Tujuan: admin bisa cek apakah konten yang di-manage tampil benar untuk user app.

Batasan runtime saat ini (supaya prompt tidak over-scope):
- Belum ada admin endpoint untuk melihat seluruh user saved jobs/saved posts.
- Belum ada admin endpoint untuk global applications moderation/journey monitoring lintas user.
- Kalau mau fitur itu di dashboard, perlu tambah endpoint admin baru dulu.

## 2. Copy-Paste Prompt For Stitch AI
Use this prompt directly in Stitch AI:

```text
Design a production-ready web dashboard UI for "SenpaiJepang Admin Ops Console" that will be implemented in React.

Product context:
- This is an internal operations dashboard for a trust-first migration platform (Indonesia -> Japan).
- The API already exists and is live in staging.
- The dashboard must prioritize operational clarity, decision traceability, and fast moderation actions.

Primary users:
- Ops Admin
- Compliance reviewer
- Content/Business admin

Main goals:
- Process KYC review queue quickly with clear risk context.
- Manage jobs catalog and feed posts (CRUD).
- Review and update organization verification status.
- Monitor basic API health and request metrics.
- Give ops/admin a quick "what user sees" preview for jobs and feed after content updates.

Required pages and key modules:
1) Auth
- Login page (email + password)
- Session state handling patterns in UI
- "Not authorized" and "session expired" states

2) Overview Dashboard
- KPI cards: pending KYC, manual review count, verified today, rejected today
- Activity timeline panel (recent admin decisions)
- Quick actions panel (Go to KYC Queue, Create Job, Create Feed Post)
- API health widget and mini metrics sparkline

3) KYC Review Queue
- Table/list with filters:
  - status: DEFAULT, ALL, SUBMITTED, MANUAL_REVIEW, VERIFIED, REJECTED, CREATED
  - limit
- Queue row data blocks:
  - user summary (name, email)
  - trust status
  - document count
  - risk flags chips
  - last event timestamp
- Detail side panel/drawer:
  - session detail
  - documents preview list metadata
  - status events timeline
  - decision form
- Decision modal:
  - decision enum: MANUAL_REVIEW, VERIFIED, REJECTED
  - optional reviewedBy
  - reason text

4) Organizations Verification
- List view with filters:
  - orgType
  - verificationStatus
  - cursor/limit pagination
- Row detail:
  - organization profile
  - owner info
  - current verification data
- Verification update action:
  - status selector
  - reason codes input

5) Jobs Management
- Jobs list with search q + pagination cursor/limit
- Create job form
- Edit job form
- Delete confirm flow
- Form sections:
  - basic: title, employment type, visa sponsorship
  - description + requirements
  - location: countryCode, city, displayLabel, latitude, longitude
  - employer: id, name, logoUrl, verified employer boolean

6) Feed Posts Management
- Posts list with search q + category + cursor/limit
- Create post form
- Edit post form
- Delete confirm flow
- Form fields:
  - title, excerpt, category, author, imageUrl, publishedAt

7) System Status
- Health card from /health
- Metrics table and charts from /metrics:
  - totalRequests
  - totalErrors
  - byStatus
  - top routes with avg/min/max duration

8) Public Surface Preview (Read-only QA)
- Jobs preview card/table from `/jobs`:
  - q
  - employmentType
  - visaSponsored
  - location
  - cursor/limit
- Feed preview list from `/feed/posts`:
  - q
  - category
  - cursor/limit
- Compare mode hint:
  - admin draft/edit result vs public listing result (manual QA workflow)

UX requirements:
- Dense-but-readable ops layout for desktop first (1440 baseline), responsive down to tablet width.
- Fast scanning table design with sticky headers and compact row variants.
- Strong state design for loading, empty, error, and partial data.
- Clear destructive-action safeguards (delete/reject confirmations).
- Keyboard-friendly admin flow for repetitive moderation work.

Visual direction:
- Must be visually aligned with Senpai iOS app theme (do not invent a new theme direction).
- Typography should feel iOS-native: SF Pro Text/Display style (web fallback: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif).
- Use these exact core tokens from mobile `AppTheme.swift`:
  - accent: #34C759
  - accentLight: rgba(52, 199, 89, 0.12)
  - accentDark: #269947
  - backgroundPrimary: #F7FAF7
  - backgroundCard: #FFFFFF
  - textPrimary: #1F242B
  - textSecondary: #707880
  - textTertiary: #A6ABB2
  - border: #E8EBED
  - warning/pending: orange semantic
  - destructive: red semantic
- Apply same radii scale as mobile:
  - small 8, medium 12, large 16, xl 20
- Apply same spacing scale as mobile:
  - 4, 8, 12, 16, 20, 24
- Motion tone must match mobile:
  - default easeInOut 0.2s
  - soft easeOut 0.25s
  - spring-like press feedback for action buttons
- Keep it clean and trustworthy (light mint surfaces + white cards), with compact ops density for desktop and adaptive mobile layout.

Component expectations:
- Sidebar navigation
- Top command/search bar
- KPI cards
- Data table with filters
- Status chips and risk flag chips
- Timeline component
- Right-side detail drawer
- Form sections with validation hints
- Toast and inline alert patterns

Data/auth behavior assumptions:
- Admin endpoints can use bearer token auth.
- Handle fallback API-key mode in UI settings pattern (optional admin troubleshooting panel).
- Show role-aware access hints for non-admin users.
- Public preview modules (`/jobs`, `/feed/posts`) can be called without auth but should still support bearer mode for realistic viewer-state checks.

Output format required from Stitch:
- Information architecture map
- Full page wireframes
- One polished high-fidelity design system direction
- Component inventory
- Interaction notes per page
- Handoff notes for React implementation

Tone:
- Operational, trustworthy, efficient, and compliance-friendly.
```

## 3. Optional Prompt Variant (Faster Start)
If you want faster rough draft first, use:

```text
Design only 3 screens for a React admin dashboard MVP:
1) KYC Review Queue with detail drawer and decision modal
2) Jobs Management list + create/edit modal
3) Organizations Verification list + status update modal
Keep visual style aligned with existing iOS app theme tokens (mint background, #34C759 accent, iOS-native typography, radius 8/12/16/20), desktop-first with robust loading/empty/error states and clear moderation action hierarchy.
```

## 4. Implementation Note
Setelah design dari Stitch keluar:
- Finalize page map dan component list.
- Baru scaffold app React (`apps/web-admin`) dan mapping endpoint per screen.
- Data contract wajib refer ke `docs/architecture/openapi-runtime-v0.yaml`.
