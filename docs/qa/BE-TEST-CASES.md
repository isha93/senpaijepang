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

**Edge**
- non-`super_admin` untuk create/update admin user -> 403

### G4 Admin applications ops
- **When** GET `/v1/admin/applications`
- **Then** 200
- **When** GET `/v1/admin/applications/{applicationId}`
- **Then** 200
- **When** GET `/v1/admin/applications/{applicationId}/journey`
- **Then** 200
- **When** PATCH `/v1/admin/applications/{applicationId}/status`
- **Then** 200 + transition valid

**Edge**
- status transition invalid -> 409

### G5 Admin jobs CRUD
- **When** GET/POST/PATCH/DELETE `/v1/admin/jobs...`
- **Then** 200/201

### G6 Admin feed CRUD
- **When** GET/POST/PATCH/DELETE `/v1/admin/feed/posts...`
- **Then** 200/201

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

---

## H. Route Mapping Guardrail (avoid 404 false negatives)

Route berikut **bukan** bagian runtime v0 live saat ini:
- `/v1/trust/profile`
- `/v1/admin/cases`
- `/v1/admin/cases/{caseId}/action`

Gunakan route runtime pengganti:
- `trust/profile` -> `/v1/users/me/profile`
- `admin/cases` queue -> `/v1/admin/kyc/review-queue`
- `admin/cases action` -> `/v1/admin/kyc/review`

---

## Global Edge Cases (all endpoints)
- Missing Authorization header -> 401
- Invalid/expired Bearer token -> 401
- Malformed JSON body -> 400
- Invalid query param format -> 400
- Unhandled server failure -> 500
