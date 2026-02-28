# API Implementation Status (Runtime v0)

Date: 2026-03-01

## 1. Purpose
- Menjadi referensi kondisi API yang benar-benar sudah hidup di codebase saat ini.
- Mengurangi gap antara dokumen target `v1` dan implementasi runtime bertahap.
- Menegaskan fase delivery saat ini: API release-candidate hardening + integrasi iOS bertahap.

## 2. Contract Sources
- Target product contract (future state): `openapi-v1.yaml` (prefix `/v1`).
- Current runtime contract (implemented): `openapi-runtime-v0.yaml` (canonical tanpa prefix `/v1`, dengan alias `/v1/*`).

## 3. Current Delivery Mode
- Active mode: **API-first completed, iOS integration enabled (incremental)**.
- Frontend web user/admin tidak menjadi bagian delivery repo saat ini.
- Validasi fungsional dilakukan lewat endpoint API + test/smoke + consumer integration checks.

## 4. Implemented Endpoints
Auth:
- `GET /health`
- `GET /metrics`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

Organizations:
- `POST /organizations`
- `POST /organizations/{orgId}/verification`
- `GET /organizations/{orgId}/verification/status`

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
- `PATCH /users/me/profile`
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
- `POST /identity/kyc/provider-webhook` (header `x-kyc-webhook-secret`, `x-idempotency-key`, `x-kyc-webhook-signature`, `x-kyc-webhook-timestamp`)

Admin:
- `GET /admin/jobs` (Bearer admin role, fallback header `x-admin-api-key`)
- `POST /admin/jobs` (Bearer admin role, fallback header `x-admin-api-key`)
- `PATCH /admin/jobs/{jobId}` (Bearer admin role, fallback header `x-admin-api-key`)
- `DELETE /admin/jobs/{jobId}` (Bearer admin role, fallback header `x-admin-api-key`)
- `GET /admin/feed/posts` (Bearer admin role, fallback header `x-admin-api-key`)
- `POST /admin/feed/posts` (Bearer admin role, fallback header `x-admin-api-key`)
- `PATCH /admin/feed/posts/{postId}` (Bearer admin role, fallback header `x-admin-api-key`)
- `DELETE /admin/feed/posts/{postId}` (Bearer admin role, fallback header `x-admin-api-key`)
- `GET /admin/organizations` (Bearer admin role, fallback header `x-admin-api-key`)
- `PATCH /admin/organizations/{orgId}/verification` (Bearer admin role, fallback header `x-admin-api-key`)
- `POST /admin/kyc/review` (Bearer admin role, fallback header `x-admin-api-key`)
- `GET /admin/kyc/review-queue` (Bearer admin role, fallback header `x-admin-api-key`)

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
- `006_user_profile_fields.sql`:
  - `users.avatar_url`
  - `users.updated_at`
- `007_organizations_tables.sql`:
  - `organizations`
  - `organization_verifications`
- `008_jobs_feed_tables.sql`:
  - `jobs`
  - `feed_posts`
- `009_jobs_feed_user_interactions.sql`:
  - `user_saved_jobs`
  - `user_saved_posts`
  - `job_applications`
  - `job_application_journey_events`

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
- Admin endpoints: Bearer access token + role check (default role `super_admin`), fallback shared secret `ADMIN_API_KEY`.
- Role baseline: user gets default role `sdm` at registration (`AUTH_DEFAULT_ROLE_CODE`).
- Role admin yang diizinkan bisa diatur via `ADMIN_ROLE_CODES` (comma-separated), default `super_admin`.
- `ADMIN_API_KEY` dipertahankan sebagai fallback bootstrap/compatibility.
- KYC webhook hardened by default: `x-kyc-webhook-signature` (HMAC SHA256), `x-kyc-webhook-timestamp` (max skew via `KYC_PROVIDER_WEBHOOK_MAX_SKEW_SEC`), dan idempotency key payload conflict detection.
- Signature verification default enabled (`KYC_PROVIDER_WEBHOOK_REQUIRE_SIGNATURE=true`).
- Development CORS headers enabled untuk integrasi client (`Authorization`, `x-admin-api-key`, `x-kyc-webhook-secret`, `x-kyc-webhook-signature`, `x-kyc-webhook-timestamp`, `x-idempotency-key`).

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
- Provider webhook ingestion via `POST /identity/kyc/provider-webhook`.

API guardrails yang aktif:
- content type whitelist,
- max file size,
- checksum SHA256 format,
- duplicate checksum protection per session,
- object key ownership prefix (`kyc/{userId}/{sessionId}/`),
- webhook signature + timestamp verification,
- webhook replay protection via idempotency key,
- idempotency key conflict rejection when same key uses different payload.

## 10. iOS Integration Readiness (2026-03-01)
Siap integrasi bertahap untuk flow:
- Auth (`register/login/refresh/logout/me`).
- Jobs (`list/detail/saved/apply/journey`).
- Feed (`list/saved`).
- Profile (`get/patch` + docs/final request).
- KYC (`session/upload/document/submit/status/history`) termasuk hasil review admin.

Aturan integrasi:
- Gunakan contract runtime aktif: `docs/architecture/openapi-runtime-v0.yaml`.
- Perubahan payload endpoint yang sudah dikonsumsi iOS harus backward compatible.
- Setiap drift contract wajib disinkronkan pada commit yang sama dengan implementasi.

## 11. Hosting Readiness (MVP Staging)
Prerequisite infrastruktur minimum:
- API compute runtime Node.js.
- PostgreSQL managed (`AUTH_STORE=postgres`).
- S3-compatible object storage (`OBJECT_STORAGE_PROVIDER=s3`).
- Optional Redis untuk evolusi feature async/non-critical caching.

Environment minimum untuk staging:
- `AUTH_STORE=postgres`
- `DATABASE_URL=postgresql://...`
- `OBJECT_STORAGE_PROVIDER=s3`
- `OBJECT_STORAGE_BUCKET=...`
- `OBJECT_STORAGE_REGION=...`
- `OBJECT_STORAGE_ENDPOINT=...` (opsional untuk provider non-AWS)
- `OBJECT_STORAGE_ACCESS_KEY_ID=...`
- `OBJECT_STORAGE_SECRET_ACCESS_KEY=...`
- `ADMIN_API_KEY=...` (opsional jika bootstrap admin belum full token role)
- `KYC_PROVIDER_WEBHOOK_SECRET=...`
- `KYC_PROVIDER_WEBHOOK_REQUIRE_SIGNATURE=true`
- `KYC_PROVIDER_WEBHOOK_MAX_SKEW_SEC=300`

Referensi hosting options:
- `docs/architecture/HOSTING-OPTIONS-MVP-v1.md`

## 12. Known Gaps vs `openapi-v1.yaml`
- Runtime canonical paths masih unversioned; prefix `/v1` saat ini alias kompatibilitas (belum v1-only).
- Vendor-specific webhook orchestration (retry semantics, event schema mapping per provider) belum diimplementasikan.
- Job catalog, feed content, saved jobs/posts, dan job applications sudah dipersist ke Postgres saat mode `AUTH_STORE=postgres`.
- Journey/event status aplikasi kandidat dari sisi admin workflow terpisah dari endpoint KYC review queue, belum ada unified ops console.

## 13. Change Control
- Setiap perubahan endpoint runtime wajib update `openapi-runtime-v0.yaml` dan file ini di commit yang sama.
- Setiap fitur yang production-ready dipromosikan ke `openapi-v1.yaml`.
