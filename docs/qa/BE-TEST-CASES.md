# BE Test Cases (API Runtime v0) — Senpai Jepang

Format: **Given / When / Then** + edge cases.

> Scope default: `docs/architecture/openapi-runtime-v0.yaml` (runtime yang live).
>
> Note penting:
> - Prefix `/v1/*` saat ini alias kompatibilitas ke runtime path tanpa prefix.
> - `docs/architecture/openapi-v1.yaml` adalah target contract future state, bukan baseline smoke production saat ini.

---

## A. HEALTH & AUTH

### A1 Health check
- **When** GET `/health` dan GET `/v1/health`
- **Then** 200 + `{ status: "ok" }`

### A2 Register SDM
- **Given** email belum terdaftar
- **When** POST `/v1/auth/register` payload valid
- **Then** 201 + `user` + `accessToken` + `refreshToken`

**Edge**
- duplicate email -> 409
- password tidak memenuhi policy -> 400
- missing required field -> 400

### A3 Login (SDM/Admin)
- **Given** akun aktif
- **When** POST `/v1/auth/login` credential valid
- **Then** 200 + access/refresh token

**Edge**
- password salah -> 401
- akun tidak ditemukan -> 401
- payload malformed -> 400

### A4 Refresh token
- **Given** refresh token valid
- **When** POST `/v1/auth/refresh`
- **Then** 200 + token baru

**Edge**
- refresh token invalid/expired -> 401
- refresh token missing -> 400

### A5 Get current user
- **Given** access token valid
- **When** GET `/v1/auth/me`
- **Then** 200 + profile user

**Edge**
- missing/invalid bearer token -> 401

### A6 Logout
- **Given** refresh token valid
- **When** POST `/v1/auth/logout`
- **Then** 204

---

## B. JOBS, SAVED JOBS, APPLICATIONS

### B1 List jobs
- **When** GET `/v1/jobs`
- **Then** 200 + paginated list

**Edge**
- invalid filter/cursor/limit -> 400

### B2 Job detail
- **When** GET `/v1/jobs/{jobId}`
- **Then** 200 + detail

**Edge**
- jobId tidak ada -> 404

### B3 Apply job
- **Given** user login
- **When** POST `/v1/jobs/{jobId}/applications`
- **Then** 201 jika baru, 200 jika idempotent retry

**Edge**
- jobId invalid -> 404
- note > 1000 chars -> 400 (`invalid_note`)
- missing/invalid bearer token -> 401

### B4 List my applications
- **Given** user login
- **When** GET `/v1/users/me/applications`
- **Then** 200 + items + pageInfo

**Edge**
- status filter invalid -> 400 (`invalid_application_status`)

### B5 Application journey ownership
- **Given** ada `applicationId`
- **When** GET `/v1/users/me/applications/{applicationId}/journey`
- **Then** owner dapat 200

**Edge**
- user lain akses application yang bukan miliknya -> 404 (`application_not_found`)

### B6 Saved jobs flow
- **Given** user login
- **When** POST `/v1/users/me/saved-jobs` -> GET `/v1/users/me/saved-jobs` -> DELETE `/v1/users/me/saved-jobs/{jobId}`
- **Then** semuanya 200 dan state sinkron

### B7 Application documents upload flow
- **Given** user login dan sudah punya `applicationId`
- **When** POST `/v1/users/me/applications/{applicationId}/documents/upload-url` lalu POST `/v1/users/me/applications/{applicationId}/documents`
- **Then** 201 + dokumen tercatat di aplikasi tersebut

**Edge**
- content type / content length invalid -> 400
- checksum duplicate pada aplikasi yang sama -> 409 (`duplicate_application_document`)
- objectKey bukan milik user+application -> 403 (`invalid_object_key_ownership`)

### B8 Candidate offer decision flow
- **Given** status aplikasi `OFFERED`
- **When** POST `/v1/users/me/applications/{applicationId}/offer/accept` atau `/offer/decline`
- **Then** 200 + status berubah ke `HIRED` (accept) atau `REJECTED` (decline)

**Edge**
- status belum `OFFERED` -> 409 (`offer_not_available`)
- admin mencoba `OFFERED -> HIRED/REJECTED` via `/admin/applications/{applicationId}/status` -> 409 (`offer_decision_required`)

---

## C. FEED & SAVED POSTS

### C1 List feed posts
- **When** GET `/v1/feed/posts`
- **Then** 200 + paginated list

### C2 Saved posts flow
- **Given** user login
- **When** POST `/v1/users/me/saved-posts` -> GET `/v1/users/me/saved-posts` -> DELETE `/v1/users/me/saved-posts/{postId}`
- **Then** 200 + state sinkron

---

## D. PROFILE & FINAL VERIFICATION

### D1 Get profile
- **Given** user login
- **When** GET `/v1/users/me/profile`
- **Then** 200 + `{ profile: ... }`

### D2 Patch profile
- **Given** user login
- **When** PATCH `/v1/users/me/profile`
- **Then** 200 + profile updated

**Edge**
- payload invalid -> 400

### D3 Verification documents
- **Given** user login
- **When** GET `/v1/users/me/verification-documents`
- **Then** 200 + checklist dokumen

### D4 Final verification request
- **Given** user login
- **When** POST `/v1/users/me/verification/final-request`
- **Then** 201 jika baru, 200 jika idempotent repeat

**Edge**
- payload invalid (mis. note terlalu panjang) -> 400

---

## E. IDENTITY / KYC

### E1 KYC status
- **Given** user login
- **When** GET `/v1/identity/kyc/status`
- **Then** 200 + status (`NOT_STARTED/IN_PROGRESS/MANUAL_REVIEW/VERIFIED/REJECTED`)

### E2 Create KYC session
- **Given** user login
- **When** POST `/v1/identity/kyc/sessions`
- **Then** 201 + `session.id`

### E3 Request upload URL
- **Given** session aktif
- **When** POST `/v1/identity/kyc/upload-url`
- **Then** 201 + `uploadUrl` + `objectKey`

**Edge**
- content type invalid -> 400
- content length invalid -> 400

### E4 Register uploaded document
- **Given** objectKey valid untuk user+session
- **When** POST `/v1/identity/kyc/documents`
- **Then** 201

**Edge**
- duplicate checksum per session -> 409 (`duplicate_document`)
- objectKey bukan milik user/session -> 400 (`invalid_object_key`)

### E5 Submit KYC session
- **Given** minimal 1 dokumen
- **When** POST `/v1/identity/kyc/sessions/{sessionId}/submit`
- **Then** 200, status jadi `SUBMITTED` (trust status `IN_PROGRESS`)

**Edge**
- tanpa dokumen -> 409 (`kyc_session_incomplete`)
- submit ulang status `SUBMITTED`/`MANUAL_REVIEW` -> 200 (idempotent)
- status final `VERIFIED`/`REJECTED` -> 409 (`kyc_session_locked`)

### E6 KYC history
- **Given** user login
- **When** GET `/v1/identity/kyc/history?sessionId=<id>`
- **Then** 200 + timeline events

---

## F. ORGANIZATIONS (TSK/LPK/EMPLOYER)

### F1 Create organization
- **Given** user login
- **When** POST `/v1/organizations`
- **Then** 201 + organization

### F2 Submit organization verification
- **Given** owner organization
- **When** POST `/v1/organizations/{orgId}/verification`
- **Then** 202 + status pending

### F3 Organization verification status
- **Given** owner organization
- **When** GET `/v1/organizations/{orgId}/verification/status`
- **Then** 200 + status

**Edge**
- org tidak ditemukan / bukan owner -> 404

---

## G. ADMIN OPS (BEARER TOKEN ADMIN)

> Recommended auth mode: `Authorization: Bearer <adminAccessToken>`.
>
> `x-admin-api-key` hanya fallback bootstrap/compatibility, dan bisa nonaktif/invalid di production.

### G1 Overview summary
- **When** GET `/v1/admin/overview/summary`
- **Then** 200

### G2 Activity events
- **When** GET `/v1/admin/activity-events`
- **Then** 200 + list + filter support

### G3 Admin users management
- **When** GET `/v1/admin/users`, POST `/v1/admin/users`, PATCH `/v1/admin/users/{userId}`
- **Then** 200/201
- **When** GET `/v1/admin/users/{userId}`
- **Then** 200 + user detail
- **When** GET `/v1/admin/users/{userId}/profile`
- **Then** 200 + profile aggregate target user
- **When** GET `/v1/admin/users/{userId}/kyc/history?sessionId=<optional>`
- **Then** 200 + history target user

**Edge**
- non-`super_admin` untuk create/update admin user -> 403
- userId tidak ditemukan -> 404

### G4 Admin applications ops
- **When** GET `/v1/admin/applications`
- **Then** 200
- **When** GET `/v1/admin/applications/{applicationId}`
- **Then** 200
- **When** GET `/v1/admin/applications/{applicationId}/journey`
- **Then** 200
- **When** PATCH `/v1/admin/applications/{applicationId}/status`
- **Then** 200 + transition valid

### G5 Admin monitoring dokumen lamaran
- **When** GET `/v1/admin/applications/{applicationId}/documents`
- **Then** 200 + daftar dokumen lamaran kandidat
- **When** PATCH `/v1/admin/applications/{applicationId}/documents/{documentId}`
- **Then** 200 + review status (`PENDING/VALID/INVALID`) terupdate
- **When** POST `/v1/admin/applications/documents/{documentId}/preview-url`
- **Then** 200 + signed preview URL sementara

**Edge**
- dokumen tidak ditemukan -> 404 (`application_document_not_found`)
- `reviewStatus` invalid -> 400 (`invalid_review_status`)
- `expiresSec` di luar range -> 400 (`invalid_expires_sec`)

**Edge**
- status transition invalid -> 409

### G5 Admin jobs CRUD
- **When** GET/POST/PATCH/DELETE `/v1/admin/jobs...`
- **Then** 200/201
- **When** POST `/v1/admin/jobs/{jobId}/publish`
- **Then** 200 + `job.lifecycle.status=PUBLISHED`
- **When** POST `/v1/admin/jobs/{jobId}/unpublish`
- **Then** 200 + `job.lifecycle.status=DRAFT`
- **When** POST `/v1/admin/jobs/{jobId}/schedule` dengan `scheduledAt`
- **Then** 200 + `job.lifecycle.status=SCHEDULED`
- **When** POST `/v1/admin/jobs/bulk` dengan `action` dan `jobIds`
- **Then** 200 + ringkasan `successCount/failureCount/results`

### G6 Admin feed CRUD
- **When** GET/POST/PATCH/DELETE `/v1/admin/feed/posts...`
- **Then** 200/201
- **When** POST `/v1/admin/feed/posts/{postId}/publish`
- **Then** 200 + `post.lifecycle.status=PUBLISHED`
- **When** POST `/v1/admin/feed/posts/{postId}/unpublish`
- **Then** 200 + `post.lifecycle.status=DRAFT`
- **When** POST `/v1/admin/feed/posts/{postId}/schedule` dengan `scheduledAt`
- **Then** 200 + `post.lifecycle.status=SCHEDULED`
- **When** POST `/v1/admin/feed/posts/bulk` dengan `action` dan `postIds`
- **Then** 200 + ringkasan `successCount/failureCount/results`

### G7 Admin organizations verification
- **When** GET `/v1/admin/organizations`
- **Then** 200
- **When** PATCH `/v1/admin/organizations/{orgId}/verification`
- **Then** 200

### G8 Admin KYC review queue + decision
- **When** GET `/v1/admin/kyc/review-queue`
- **Then** 200 + `pageInfo`
- **When** POST `/v1/admin/kyc/review`
- **Then** 200 + status updated

### G9 Admin KYC document preview URL
- **When** POST `/v1/admin/kyc/documents/{documentId}/preview-url`
- **Then** 200 + signed URL + `expiresAt`

**Edge**
- documentId tidak ditemukan -> 404
- `expiresSec` di luar batas -> 400 (`invalid_expires_sec`)

### G10 Admin audit events query
- **When** GET `/v1/admin/audit/events`
- **Then** 200 + `items` + `filters` + `pageInfo`
- **When** GET `/v1/admin/audit/events?type=APPLICATION&entityType=JOB_APPLICATION&action=APPLICATION_STATUS_TRANSITION`
- **Then** 200 + hasil terfilter

**Edge**
- `actorType` invalid -> 400 (`invalid_actor_type`)

---

## H. Legacy Compatibility Aliases

Route berikut sekarang tersedia sebagai alias kompatibilitas runtime:
- `/v1/trust/profile` -> payload sama dengan `/v1/users/me/profile`
- `/v1/admin/cases` -> alias ke `/v1/admin/kyc/review-queue`
- `/v1/admin/cases/{caseId}/action` -> alias ke `/v1/admin/kyc/review` (sessionId dari `{caseId}`)

Catatan:
- Tetap prefer route canonical (`/users/me/profile`, `/admin/kyc/review-queue`, `/admin/kyc/review`) untuk integrasi baru.
- `/v1/admin/cases` menerima status legacy (`OPEN/IN_REVIEW/WAITING_EVIDENCE/RESOLVED/REJECTED`) dan otomatis dimapping ke status KYC runtime.

---

## Global Edge Cases (all endpoints)
- Missing Authorization header -> 401
- Invalid/expired Bearer token -> 401
- Malformed JSON body -> 400
- Invalid query param format -> 400
- Unhandled server failure -> 500
