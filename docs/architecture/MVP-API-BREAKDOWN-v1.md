# MVP API Breakdown v1 (API-First)

Date: 2026-02-28
Owner: Backend Track

## 1. Executive Summary
Kita sengaja mengunci fase ini ke API-only agar fondasi trust dan audit kuat dulu sebelum ekspansi frontend.

Outcome yang ditargetkan dari MVP API:
- proses identity verification bisa dijalankan end-to-end,
- keputusan review bisa ditelusuri,
- kualitas perubahan terjaga lewat CI gates.

## 2. Scope Lock
In scope (MVP API):
- Auth + session lifecycle.
- KYC session, document ingestion, submit, review queue, review decision.
- Provider metadata hook + webhook stub dengan idempotency.
- Observability + audit events untuk alur trust-critical.
- OpenAPI runtime contract + CI quality gates.

Out of scope (post-MVP API):
- UI/Frontend implementation.
- Payment/escrow.
- Multi-country policy engine.
- Full vendor-specific KYC webhook signature verification.

## 3. Capability Map

### 3.1 Auth & Access
Feature:
- Register/login/refresh/logout/me.
- Default role assignment (`AUTH_DEFAULT_ROLE_CODE`).
- Store adapter memory/postgres.

Definition of done:
- Semua endpoint auth lulus test.
- Token lifecycle valid (access + refresh).
- Postgres adapter parity dengan memory adapter.

### 3.2 Identity KYC Intake
Feature:
- Create KYC session.
- Generate upload URL.
- Register document metadata.
- Submit session untuk review.
- Get status + history.

Definition of done:
- Guardrail size/content-type/checksum aktif.
- Ownership object key tervalidasi.
- Duplicate checksum dalam 1 session ditolak.

### 3.3 KYC Review Operations API
Feature:
- Review queue endpoint (filter status + limit).
- Review decision endpoint (`MANUAL_REVIEW|VERIFIED|REJECTED`).
- Status transition audit events.

Definition of done:
- Decision menghasilkan event audit konsisten.
- Queue menampilkan dokumen + ringkasan user + flags.
- Endpoint dilindungi `x-admin-api-key`.

### 3.4 Provider Integration Stub
Feature:
- Update provider metadata per session.
- Webhook intake stub (`x-kyc-webhook-secret`, `x-idempotency-key`).

Definition of done:
- Idempotency webhook bekerja.
- Payload metadata tersimpan aman.
- Webhook disabled behavior jelas saat secret tidak di-set.

### 3.5 Operability & Quality
Feature:
- `/health`, `/metrics`, `x-request-id`, structured logs.
- CI: lint, typecheck, test, SAST, secrets scan, OpenAPI check.
- Local smoke flow.

Definition of done:
- Semua gate CI hijau di branch utama.
- Smoke flow lulus di local baseline.
- OpenAPI runtime sinkron dengan endpoint runtime.

## 4. MVP Milestones (API)
| Milestone | Fokus | Deliverables |
|---|---|---|
| M0 Foundation | Infra + guardrails | docker compose, CI baseline, dev orchestration |
| M1 Auth Ready | Identity basic | auth endpoints + role assignment + tests |
| M2 KYC Intake Ready | Document pipeline | session/upload/documents/submit/history |
| M3 Review Ops Ready | Manual moderation | review queue + decision + audit events |
| M4 Hardening | Reliability | smoke flow, observability improvements, contract freeze |

## 5. Prioritized Backlog
### P0 (Must Have)
- Auth lifecycle stabil (memory + postgres).
- KYC intake end-to-end (upload-url -> documents -> submit).
- Admin review queue + decision + audit trail.
- Runtime OpenAPI + CI gates konsisten.

### P1 (Should Have)
- Provider metadata enrichment yang konsisten.
- Webhook idempotency TTL tuning + replay handling policy.
- Extended error catalog dan response normalization.

### P2 (After Freeze)
- Admin auth migration dari shared key ke RBAC token.
- Vendor-specific webhook signature verification.
- Queue pagination cursor + advanced filtering.

## 6. Acceptance Gates (Release Candidate API)
- `npm run ci` pass.
- `npm run smoke:local` pass.
- `npm run check:dev-all` pass.
- Tidak ada endpoint runtime undocumented di `openapi-runtime-v0.yaml`.
- Tidak ada perubahan trust-critical endpoint tanpa test update.

## 7. Change Control
- Setiap perubahan endpoint runtime wajib update:
  - `docs/architecture/openapi-runtime-v0.yaml`
  - `docs/architecture/API-IMPLEMENTATION-STATUS-v0.md`
- Perubahan scope MVP API wajib update file ini pada commit yang sama.

## 8. Document Links
- Non-tech summary: `docs/architecture/MVP-API-NON-TECH-GUIDE-v1.md`
- Runtime status: `docs/architecture/API-IMPLEMENTATION-STATUS-v0.md`
