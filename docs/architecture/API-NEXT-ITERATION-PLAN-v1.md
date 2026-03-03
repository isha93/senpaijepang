# API Next Iteration Plan v1 (Dashboard Enablement)

Date: 2026-03-03
Owner: API + Web Admin
Status: In Progress (Iteration A completed)

## 1. Objective
Menambahkan endpoint yang belum ada agar dashboard admin bisa naik dari CRUD dasar ke operasi harian yang lengkap (monitoring, moderation, audit, dan quality check).

## 2. Current Baseline
Sudah tersedia di runtime:
- Admin jobs CRUD
- Admin feed posts CRUD
- Admin organizations verification update
- Admin KYC review queue + decision
- Admin applications list/detail/journey + status transition update
- Auth login/refresh/me
- Health + metrics

Referensi:
- `docs/architecture/openapi-runtime-v0.yaml`
- `docs/architecture/API-IMPLEMENTATION-STATUS-v0.md`

## 3. Gaps To Close
Yang belum tersedia dan dibutuhkan dashboard iterasi berikutnya:
- User investigation endpoints untuk support/compliance.
- Secure preview URL untuk dokumen KYC.
- Queryable audit event endpoint untuk traceability.

## 4. Endpoint Backlog (Proposed)
Priority P0 (remaining):
1. `POST /admin/kyc/documents/{documentId}/preview-url`
- Purpose: signed short-lived preview URL untuk dokumen KYC.
- Body/Query:
  - `expiresSec` (optional, capped)
- Response:
  - `url`
  - `expiresAt`

2. `GET /admin/audit/events`
- Purpose: audit log queryable untuk compliance.
- Query:
  - `cursor`, `limit`
  - `entityType`, `entityId`
  - `actorType`, `actorId`
  - `action`
  - `from`, `to`

Priority P1 (setelah P0 stabil):
1. `GET /admin/users`
2. `GET /admin/users/{userId}`
3. `GET /admin/users/{userId}/profile`
4. `GET /admin/users/{userId}/kyc/history`
5. Bulk endpoints:
- `POST /admin/jobs/bulk`
- `POST /admin/feed/posts/bulk`
6. Content lifecycle endpoints:
- publish/unpublish/schedule for jobs/posts

Completed this iteration (2026-03-03):
1. `GET /admin/overview/summary`
2. `GET /admin/activity-events`
3. `GET /admin/applications`
4. `GET /admin/applications/{applicationId}`
5. `GET /admin/applications/{applicationId}/journey`
6. `PATCH /admin/applications/{applicationId}/status`

## 5. Data Model Additions (Proposed)
Tambahan schema di `openapi-runtime-v0.yaml`:
- `AdminOverviewSummaryResponse`
- `AdminActivityEvent`
- `AdminActivityEventListResponse`
- `AdminApplicationListResponse`
- `AdminApplicationDetailResponse`
- `AdminApplicationStatusUpdateRequest`
- `AdminAuditEvent`
- `AdminAuditEventListResponse`
- `AdminKycDocumentPreviewUrlResponse`

## 6. Security And Access Rules
- Semua endpoint `/admin/*` tetap dukung:
  - Bearer token with admin role
  - fallback `x-admin-api-key` untuk emergency ops
- Enforce least privilege:
  - read-only vs write scopes (role code based)
- KYC document preview URL:
  - TTL pendek (contoh 60-300 detik)
  - no public permanent URL
  - audit log setiap issue URL

## 7. Implementation Sequence
Iteration A (fast unblock dashboard):
1. `GET /admin/overview/summary` (done)
2. `GET /admin/activity-events` (done; current sources: `KYC` + `APPLICATION`)
3. `GET /admin/applications` (done)

Iteration B (detail + actions):
1. `GET /admin/applications/{applicationId}` (done)
2. `GET /admin/applications/{applicationId}/journey` (done)
3. `PATCH /admin/applications/{applicationId}/status` (done)

Iteration C (compliance hardening):
1. `POST /admin/kyc/documents/{documentId}/preview-url`
2. `GET /admin/audit/events`

Iteration D (expansion):
1. Admin users investigation endpoints
2. Bulk and content lifecycle endpoints

## 8. Docs Update Checklist Per Iteration
Setiap iterasi endpoint wajib update file berikut dalam commit yang sama:
1. `docs/architecture/openapi-runtime-v0.yaml`
2. `docs/architecture/API-IMPLEMENTATION-STATUS-v0.md`
3. `docs/architecture/WEB-ADMIN-IMPLEMENTATION-PLAN-v1.md` (dependency map)
4. Changelog ringkas di PR description (what/why/how/test)

## 9. Definition Of Ready (Before Coding)
- UI dependency jelas dari desain dashboard terbaru.
- Enum status final disepakati (application + audit action).
- Policy akses role admin disepakati.
- Contoh response payload disepakati untuk QA.

## 10. Definition Of Done
- Endpoint berjalan di mode `AUTH_STORE=postgres`.
- Unit/integration tests untuk happy path + auth failure + not found.
- Metrics + structured logs terpasang di endpoint baru.
- Contract docs sinkron, tidak ada endpoint undocumented.
