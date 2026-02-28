# MVP API Breakdown v1 (API-First)

Date: 2026-03-01
Owner: Backend Track

## 1. Executive Summary
Fase API core sudah berjalan dan runtime contract sudah cukup stabil untuk integrasi iOS bertahap.

Outcome yang ditargetkan dari MVP API:
- proses identity verification bisa dijalankan end-to-end,
- keputusan review bisa ditelusuri,
- alur jobs/feed/profile siap dikonsumsi mobile,
- kualitas perubahan terjaga lewat CI gates.

## 2. Scope Lock
In scope (MVP API):
- Auth + session lifecycle.
- KYC session, document ingestion, submit, review queue, review decision.
- Jobs/feed/profile + saved/apply/journey runtime endpoints.
- Organization verification + admin operations endpoints.
- Provider metadata hook + webhook intake hardened (signature, timestamp, idempotency).
- Observability + audit events untuk alur trust-critical.
- OpenAPI runtime contract + CI quality gates.

Out of scope (post-MVP API):
- UI/Frontend implementation.
- Payment/escrow.
- Multi-country policy engine.
- Vendor-specific orchestration mendalam (retry/reconciliation policy per provider).
- Unified ops console lintas domain (bukan hanya endpoint API).

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
- Endpoint dilindungi Bearer token + role check (fallback `x-admin-api-key` untuk bootstrap).

### 3.4 Provider Integration Runtime
Feature:
- Update provider metadata per session.
- Webhook intake hardened (`x-idempotency-key`, signature HMAC, timestamp skew guard).

Definition of done:
- Idempotency webhook bekerja.
- Payload metadata tersimpan aman.
- Signature/timestamp verification behavior jelas dan terdokumentasi.

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
| M4 Domain Expansion Ready | Product parity API | jobs/feed/profile + admin CRUD + org verification |
| M5 Hardening | Reliability | smoke flow, observability improvements, contract freeze |
| M6 Integration Ready | Mobile + staging prep | iOS integration checklist + hosting plan |

## 5. Prioritized Backlog
### P0 (Must Have)
- Auth lifecycle stabil (memory + postgres).
- KYC intake end-to-end (upload-url -> documents -> submit -> review).
- Jobs/feed/profile flow stabil untuk consumer iOS.
- Runtime OpenAPI + CI gates konsisten.

### P1 (Should Have)
- Provider metadata enrichment yang konsisten.
- Webhook idempotency TTL tuning + replay handling policy.
- Extended error catalog dan response normalization.
- Hosting staging runbook dan rollback checklist.

### P2 (After Freeze)
- Remove `ADMIN_API_KEY` fallback (Bearer role-only).
- Vendor-specific webhook orchestration (mapping + retry semantics).
- Queue pagination cursor + advanced filtering.

## 6. Acceptance Gates (Release Candidate API)
- `npm run ci` pass.
- `npm run smoke:local` pass.
- `npm run check:dev-all` pass.
- Tidak ada endpoint runtime undocumented di `openapi-runtime-v0.yaml`.
- Tidak ada perubahan trust-critical endpoint tanpa test update.
- Checklist integrasi iOS endpoint core terverifikasi.

## 7. Change Control
- Setiap perubahan endpoint runtime wajib update:
  - `docs/architecture/openapi-runtime-v0.yaml`
  - `docs/architecture/API-IMPLEMENTATION-STATUS-v0.md`
- Perubahan scope MVP API wajib update file ini pada commit yang sama.

## 8. Document Links
- Non-tech summary: `docs/architecture/MVP-API-NON-TECH-GUIDE-v1.md`
- Runtime status: `docs/architecture/API-IMPLEMENTATION-STATUS-v0.md`
- Execution lock terbaru: `docs/architecture/EXECUTION-LOCK-API-FIRST-v1.md`
- Hosting plan MVP: `docs/architecture/HOSTING-OPTIONS-MVP-v1.md`
