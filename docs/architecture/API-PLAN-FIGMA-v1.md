# API Plan from Figma v1 (Draft)

Date: 2026-02-28
Status: Draft for validation

## Access Note
Link Figma yang diberikan saat ini tidak bisa diakses dari environment ini (`403/404` via non-interactive fetch).

Karena itu, plan ini disusun dari:
- konteks produk SenpaiJepang di repo,
- flow yang sudah ada di runtime API,
- pola screen umum untuk onboarding, KYC, dan review admin.

Jika kamu kirim screenshot/frame list, plan ini bisa dipetakan 1:1 ke tiap screen.

Update:
- Screenshot bundle lokal sudah diterima di `/Users/ichsan/Downloads/stitch_job_detail_view`.
- Mapping per-screen yang lebih detail tersedia di `docs/architecture/API-PLAN-STITCH-SCREENS-v1.md`.

## 1. Planning Assumptions (to validate)
Asumsi UI utama di Figma:
- Auth screens: register, login, session refresh/logout.
- User onboarding & profile.
- KYC flow: create session, upload docs, submit, status tracking.
- Admin/Ops flow: review queue, review decision, audit timeline.
- Basic metrics/health for internal monitoring.

## 2. API Domain Map

### Domain A: Auth & Session
Goal:
- User bisa masuk dan mempertahankan sesi aman.

Endpoints (target):
- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`
- `GET /v1/auth/me`

Data objects:
- `users`, `sessions`, `roles`, `user_roles`

### Domain B: Identity & KYC Intake
Goal:
- User bisa kirim dokumen identitas sampai siap direview.

Endpoints (target):
- `POST /v1/identity/kyc/sessions`
- `POST /v1/identity/kyc/upload-url`
- `POST /v1/identity/kyc/documents`
- `POST /v1/identity/kyc/sessions/{sessionId}/submit`
- `GET /v1/identity/kyc/status`
- `GET /v1/identity/kyc/history`
- `POST /v1/identity/kyc/sessions/{sessionId}/provider-metadata`
- `POST /v1/identity/kyc/provider-webhook`

Data objects:
- `kyc_sessions`, `identity_documents`, `kyc_status_events`

### Domain C: Admin Review Operations
Goal:
- Admin bisa memproses antrean verifikasi secara audit-able.

Endpoints (target):
- `GET /v1/admin/kyc/review-queue`
- `POST /v1/admin/kyc/review`

Data objects:
- `kyc_sessions` (status transitions)
- `kyc_status_events` (who/when/why)

### Domain D: Platform & Observability
Goal:
- Tim bisa tahu API sehat dan perubahan bisa ditelusuri.

Endpoints (target):
- `GET /v1/health`
- `GET /v1/metrics`

Cross-cutting:
- `x-request-id`
- structured logs
- basic counters/latency metrics

### Domain E: Jobs & Applications
Goal:
- User bisa melihat detail lowongan, simpan lowongan, dan apply.

Endpoints (target):
- `GET /v1/jobs/{jobId}`
- `POST /v1/users/me/saved-jobs`
- `DELETE /v1/users/me/saved-jobs/{jobId}`
- `POST /v1/jobs/{jobId}/applications`

Data objects:
- `employers`, `employer_verifications`
- `jobs`, `job_requirements`, `job_locations`
- `saved_jobs`, `job_applications`

## 3. Suggested Rollout Phases

### Phase 0: Contract Freeze (2-3 days)
Deliverables:
- freeze OpenAPI runtime untuk semua endpoint aktif
- error response format seragam
- status enum final untuk KYC

Exit criteria:
- semua endpoint runtime terdokumentasi
- `check:openapi` pass

### Phase 1: Auth Complete (3-5 days)
Deliverables:
- auth endpoints final + test negative cases
- role assignment default stabil
- memory/postgres parity

Exit criteria:
- auth test pass
- token refresh flow tervalidasi

### Phase 2: KYC Intake Complete (5-7 days)
Deliverables:
- session creation + upload-url + documents + submit
- guardrails file size/content type/checksum
- status/history endpoint siap

Exit criteria:
- e2e KYC intake test pass
- duplicate checksum rejected

### Phase 3: Admin Review Complete (3-5 days)
Deliverables:
- review queue with filters
- decision endpoint (`MANUAL_REVIEW|VERIFIED|REJECTED`)
- audit event for every status transition

Exit criteria:
- review decision reflected in queue + history
- unauthorized admin calls rejected

### Phase 4: Hardening & Release Candidate (3-5 days)
Deliverables:
- smoke local stable
- improved timeout/retry behavior
- observability baseline finalized

Exit criteria:
- `npm run ci` pass
- `npm run smoke:local` pass
- `npm run check:dev-all` pass

## 4. UI-to-API Mapping Template
Gunakan tabel ini untuk mapping final per frame Figma:

| UI Frame | User Action | Endpoint | Method | Notes |
|---|---|---|---|---|
| Login | submit credential | `/v1/auth/login` | `POST` | returns access + refresh token |
| KYC Upload | request pre-signed URL | `/v1/identity/kyc/upload-url` | `POST` | include checksum + content type |
| KYC Submit | submit session | `/v1/identity/kyc/sessions/{id}/submit` | `POST` | requires uploaded docs |
| Admin Queue | load pending | `/v1/admin/kyc/review-queue` | `GET` | filter by status |
| Admin Decision | approve/reject | `/v1/admin/kyc/review` | `POST` | writes audit event |

## 5. Security Plan
Current:
- user auth: Bearer access token
- admin auth: Bearer token + role check (fallback `x-admin-api-key`)

Recommended upgrade path:
- pertahankan fallback `ADMIN_API_KEY` hanya untuk bootstrap/compatibility
- lanjutkan hardening agar admin flow full Bearer role-only
- tambah orkestrasi webhook per provider (event mapping + retry/reconciliation)

## 6. Data & Migration Plan
- keep incremental SQL migration files (already in place)
- add migration only when feature is tied to a new endpoint or enum/state change
- every migration must have backward-compatible rollout notes

## 7. Testing Plan
Minimum test stack:
- unit tests for service layer
- API integration tests for auth/KYC/review
- contract validation against OpenAPI runtime
- local smoke script for critical happy path

Critical regression suite:
- auth flow
- KYC upload+submit
- admin review transitions
- webhook idempotency

## 8. Definition of Ready / Done
Ready:
- Figma frame has clear action + payload requirements
- endpoint spec exists in OpenAPI
- auth model for endpoint decided

Done:
- endpoint implemented + tested
- docs updated (`openapi-runtime`, impl status)
- CI green

## 9. What I Need From You to Make This 1:1 With Figma
Please share one of these:
1. public Figma access for the file, or
2. exported screenshots per flow (Auth, KYC, Admin), or
3. frame list + user journey order.

Setelah itu saya bisa finalize jadi:
- endpoint-by-screen matrix lengkap,
- payload schema per action,
- sprint-level API task breakdown yang langsung assignable.

## 10. Screen Mapping: Job Details (Validated from screenshot)
Observed UI components:
- Job title: `Senior Welder`
- Employer name + verified badge
- Chips: `Full-time`, `Visa Sponsored`, `Tokyo, JP`
- `About the Role` (long text)
- `Requirements` (bullet list)
- Map preview
- Bookmark icon
- CTA `Login to apply`

### 10.1 Required API response (Job Detail)
Endpoint:
- `GET /v1/jobs/{jobId}`

Suggested response shape:
```json
{
  "job": {
    "id": "job_123",
    "title": "Senior Welder",
    "employmentType": "FULL_TIME",
    "visaSponsorship": true,
    "description": "Long-form role description...",
    "requirements": [
      "Minimum 3 years welding experience",
      "Basic Japanese language proficiency"
    ],
    "location": {
      "countryCode": "JP",
      "city": "Tokyo",
      "displayLabel": "Tokyo, JP",
      "latitude": 35.6762,
      "longitude": 139.6503,
      "mapPreviewUrl": "https://..."
    },
    "employer": {
      "id": "emp_123",
      "name": "Tokyo Construction Co.",
      "logoUrl": "https://...",
      "verificationStatus": "VERIFIED",
      "isVerifiedEmployer": true
    }
  },
  "viewerState": {
    "authenticated": false,
    "bookmarked": false,
    "canApply": false,
    "applyAction": "LOGIN_REQUIRED"
  }
}
```

### 10.2 Bookmark behavior
For authenticated user:
- `POST /v1/users/me/saved-jobs` with body `{ "jobId": "job_123" }`
- `DELETE /v1/users/me/saved-jobs/{jobId}`

Rules:
- Idempotent write/delete.
- Return current bookmark state for instant UI toggle.

### 10.3 Apply CTA behavior
Current screenshot menunjukkan guest state (`Login to apply`), berarti:
- `viewerState.authenticated=false`
- `viewerState.applyAction=LOGIN_REQUIRED`

When authenticated:
- CTA berubah jadi `Apply now`
- submit to `POST /v1/jobs/{jobId}/applications`

Minimal payload:
```json
{
  "source": "JOB_DETAIL_SCREEN",
  "profileSnapshotVersion": 1
}
```

### 10.4 Data model additions for this screen
New tables (planned):
- `employers`
- `employer_verifications`
- `jobs`
- `job_requirements`
- `saved_jobs`
- `job_applications`

Minimum indexes:
- `jobs (status, published_at desc)`
- `saved_jobs (user_id, job_id unique)`
- `job_applications (job_id, user_id, created_at desc)`

### 10.5 Implementation slices (recommended)
Slice J1 (read-only detail):
- Implement `GET /v1/jobs/{jobId}`
- include employer verification + map fields

Slice J2 (bookmark):
- Implement save/unsave endpoints
- include `viewerState.bookmarked` in detail response

Slice J3 (apply gate + submit):
- Add `viewerState.canApply` and `applyAction`
- Implement application submit endpoint for authenticated users
