# API Implementation Status (Runtime v0)

Date: 2026-02-28

## 1. Purpose
- Menjadi referensi kondisi API yang benar-benar sudah hidup di codebase saat ini.
- Mengurangi gap antara dokumen target `v1` dan implementasi runtime bertahap.
- Menegaskan bahwa fase delivery saat ini adalah API-only.

## 2. Contract Sources
- Target product contract (future state): `openapi-v1.yaml` (prefix `/v1`).
- Current runtime contract (implemented): `openapi-runtime-v0.yaml` (tanpa prefix `/v1`).

## 3. Current Scope Mode
- Active mode: **API-only**.
- Frontend user/admin tidak menjadi bagian delivery repo saat ini.
- Semua validasi fungsional dilakukan lewat endpoint API + test/smoke.

## 4. Implemented Endpoints
Auth:
- `GET /health`
- `GET /metrics`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

Jobs:
- `GET /jobs`
- `GET /jobs/{jobId}`
- `POST /jobs/{jobId}/applications`
- `GET /users/me/saved-jobs`
- `POST /users/me/saved-jobs`
- `DELETE /users/me/saved-jobs/{jobId}`
- `GET /users/me/applications`
- `GET /users/me/applications/{applicationId}/journey`

Feed:
- `GET /feed/posts`
- `GET /users/me/saved-posts`
- `POST /users/me/saved-posts`
- `DELETE /users/me/saved-posts/{postId}`

Profile:
- `GET /users/me/profile`
- `GET /users/me/verification-documents`
- `POST /users/me/verification/final-request`

Identity/KYC:
- `POST /identity/kyc/sessions`
- `POST /identity/kyc/sessions/{sessionId}/submit`
- `POST /identity/kyc/sessions/{sessionId}/provider-metadata`
- `GET /identity/kyc/status`
- `POST /identity/kyc/upload-url`
- `POST /identity/kyc/documents`
- `GET /identity/kyc/history`
- `POST /identity/kyc/provider-webhook` (header `x-kyc-webhook-secret`, `x-idempotency-key`)

Admin:
- `POST /admin/kyc/review` (header `x-admin-api-key`)
- `GET /admin/kyc/review-queue` (header `x-admin-api-key`)

## 5. Implemented Data Model (Migration-backed)
- `001_auth_tables.sql`:
  - `users`
  - `sessions`
- `004_rbac_tables.sql`:
  - `roles`
  - `user_roles`
- `002_kyc_tables.sql`:
  - `kyc_sessions`
  - `identity_documents`
- `003_kyc_status_events.sql`:
  - `kyc_status_events`
  - unique constraint `(kyc_session_id, checksum_sha256)` in `identity_documents`
- `005_kyc_provider_metadata.sql`:
  - `kyc_sessions.provider_ref`
  - `kyc_sessions.provider_metadata_json`

## 6. KYC Status Model
Raw session statuses:
- `CREATED`
- `SUBMITTED`
- `MANUAL_REVIEW`
- `VERIFIED`
- `REJECTED`

Trust status (API response):
- `NOT_STARTED`
- `IN_PROGRESS`
- `MANUAL_REVIEW`
- `VERIFIED`
- `REJECTED`

## 7. Current Security Model
- User endpoints: Bearer access token.
- Admin review endpoint: shared secret `ADMIN_API_KEY`.
- Role baseline: user gets default role `sdm` at registration (`AUTH_DEFAULT_ROLE_CODE`).
- `ADMIN_API_KEY` masih model bootstrap; target berikutnya RBAC admin token-based.
- Development CORS headers enabled untuk integrasi client (`Authorization`, `x-admin-api-key`).

## 8. Observability Baseline
- Structured JSON logs (`LOG_LEVEL`) untuk request start/finish.
- Audit event KYC transition (`audit.kyc.status_transition`).
- Request correlation via `x-request-id`.
- `GET /metrics` untuk in-memory counters + latency summary.

## 9. Current KYC Upload Model
- API generate pre-signed upload URL via `POST /identity/kyc/upload-url`.
- Client upload file langsung ke object storage (`PUT`).
- Client confirm metadata via `POST /identity/kyc/documents`.
- Optional provider metadata via `POST /identity/kyc/sessions/{sessionId}/provider-metadata`.
- Client submit session via `POST /identity/kyc/sessions/{sessionId}/submit`.
- Provider webhook stub via `POST /identity/kyc/provider-webhook`.

API guardrails yang aktif:
- content type whitelist,
- max file size,
- checksum SHA256 format,
- duplicate checksum protection per session,
- object key ownership prefix (`kyc/{userId}/{sessionId}/`).

## 10. Known Gaps vs `openapi-v1.yaml`
- Runtime belum pakai prefix `/v1`.
- Admin model masih shared key, belum role-based auth.
- Webhook processing masih stub (belum vendor-specific signature verification).
- Jobs, applications, and feed data source masih seed/in-memory (belum persistence DB + admin CRUD).
- Profile update endpoint (`PATCH /users/me/profile`) belum ada; saat ini profile masih read-only aggregation.

## 11. Change Control
- Setiap perubahan endpoint runtime wajib update `openapi-runtime-v0.yaml` dan file ini di commit yang sama.
- Setiap fitur yang production-ready dipromosikan ke `openapi-v1.yaml`.
