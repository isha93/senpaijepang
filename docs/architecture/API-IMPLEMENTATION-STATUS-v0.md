# API Implementation Status (Runtime v0)

Date: 2026-02-27

## 1. Purpose
- Menjadi referensi kondisi API yang benar-benar sudah hidup di codebase saat ini.
- Mengurangi gap antara dokumen target `v1` dan implementasi runtime bertahap.

## 2. Contract Sources
- Target product contract (future state): `openapi-v1.yaml` (prefix `/v1`).
- Current runtime contract (implemented): `openapi-runtime-v0.yaml` (tanpa prefix `/v1`).

## 3. Implemented Endpoints
Auth:
- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

Identity/KYC:
- `POST /identity/kyc/sessions`
- `GET /identity/kyc/status`
- `POST /identity/kyc/documents`
- `GET /identity/kyc/history`

Admin:
- `POST /admin/kyc/review` (shared key header `x-admin-api-key`)

## 4. Implemented Data Model (Migration-backed)
- `001_auth_tables.sql`:
  - `users`
  - `sessions`
- `002_kyc_tables.sql`:
  - `kyc_sessions`
  - `identity_documents`
- `003_kyc_status_events.sql`:
  - `kyc_status_events`
  - unique constraint `(kyc_session_id, checksum_sha256)` in `identity_documents`

## 5. KYC Status Model
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

## 6. Current Security Model
- User endpoints: Bearer access token.
- Admin review endpoint: shared secret `ADMIN_API_KEY`.
- Note: `ADMIN_API_KEY` adalah sementara untuk MVP bootstrap; target next step adalah RBAC admin account + scoped permissions.

## 7. Known Gaps vs `openapi-v1.yaml`
- Runtime belum pakai prefix `/v1`.
- KYC submit endpoint terpisah (`/identity/kyc/sessions/{id}/submit`) belum ada.
- Admin model masih shared key, belum role-based auth.
- Provider webhook intake belum diimplementasi.

## 8. Change Control
- Setiap perubahan endpoint runtime wajib update `openapi-runtime-v0.yaml` dan file ini di commit yang sama.
- Setiap fitur yang sudah production-ready dipromosikan ke `openapi-v1.yaml`.
