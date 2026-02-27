# SenpaiJepang MVP Sprint Plan v1 (Web + Dashboard First)

## 0. Progress Snapshot (2026-02-27)
Delivered baseline in repository:
- Sprint 0 foundation:
  - monorepo setup for `api`, `web-sdm`, `dashboard`, `admin`
  - CI pipeline gates (`lint`, `typecheck`, `test`, `scan:sast`, `scan:secrets`, `check:openapi`)
  - local infra setup (`PostgreSQL`, `Redis`, `MinIO`)
  - RBAC skeleton + default role assignment (`sdm`)
  - observability baseline (`/metrics`, `x-request-id`, JSON request logs)
  - staging bootstrap command (`npm run deploy:staging`)
- Sprint 1 partial:
  - auth flow (`register`, `login`, `refresh`, `logout`, `me`)
  - KYC session flow (`create`, `status`)
  - KYC document metadata ingestion
  - admin review endpoint with audit trail events
  - migration files for auth and KYC (`001`, `002`, `003`)

Current references:
- Runtime contract: `openapi-runtime-v0.yaml`
- Runtime status: `API-IMPLEMENTATION-STATUS-v0.md`
- Target contract: `openapi-v1.yaml`

## 1. MVP Goal (12 Weeks)
Deliver MVP yang siap pilot terbatas dengan fokus:
- SDM mobile-web onboarding + KYC + apply + report fraud.
- TSK/LPK dashboard untuk verifikasi legal + job posting + applicant management.
- Ops/Admin console untuk review KYC, case handling, blacklist, audit.

Filosofi eksekusi:
- `Quality > Quantity`
- `Trust > Growth`
- Tidak ekspansi jika quality gates belum hijau.

## 2. Scope Lock (MVP)
In scope:
- Website SDM (mobile-web first / responsive), bukan native app.
- Dashboard TSK/LPK (web).
- Admin/Ops console (web internal).
- Core anti-fraud layer: KYC, verifikasi TSK, evidence/case, trust factors.

Out of scope (post-MVP):
- Native Android/iOS.
- Escrow payment.
- Multi-country policy engine.

## 3. Team Assumption (minimum)
- 1 Product Manager
- 1 Tech Lead
- 3 Backend Engineers
- 2 Frontend Engineers (Web)
- 1 QA Engineer
- 1 DevOps/SRE (shared)
- 1 Ops/Compliance Lead

## 4. Cadence and Calendar
Durasi sprint: 2 minggu.

| Sprint | Date Range (2026) | Objective |
|---|---|---|
| Sprint 0 | Mar 2 - Mar 13 | Foundation, governance, CI/CD quality gates |
| Sprint 1 | Mar 16 - Mar 27 | Identity + KYC + consent + manual review v1 |
| Sprint 2 | Mar 30 - Apr 10 | TSK/LPK verification + dashboard baseline |
| Sprint 3 | Apr 13 - Apr 24 | Matching + jobs + applications |
| Sprint 4 | Apr 27 - May 8 | Evidence/case management + trust profile |
| Sprint 5 | May 11 - May 22 | Hardening, UAT pilot, go/no-go |

## 5. Global Quality Gates (every sprint)
Semua sprint wajib memenuhi:
- Unit test and contract test pass.
- Change failure rate sprint < 15%.
- p95 API critical <= 500 ms (stage target).
- 0 unresolved SEV1.
- Security scan and secret scan pass.
- Critical audit logs emitted for new flows.

Jika gagal 2 sprint berturut-turut, freeze fitur dan pindah reliability sprint.

## 6. Sprint-by-Sprint Plan

### Sprint 0 (Mar 2 - Mar 13): Foundation
Product outcomes:
- Domain model, API boundary, dan legal boundary terkunci.
- Team siap delivery cepat tanpa menurunkan quality.

Engineering deliverables:
- Monorepo setup (`web-sdm`, `dashboard`, `admin`, `api`).
- CI pipeline: lint, typecheck, tests, SAST, secret scan.
- Baseline auth service + RBAC skeleton.
- Observability baseline: logs, metrics, traces.
- OpenAPI linting and schema versioning rules.

Business/Ops deliverables:
- Trust policy v1 (verification language, disclaimer, consent copy).
- Partner onboarding checklist (TSK/LPK).
- KPI dashboard spec (trust + engineering + business).

Definition of done:
- 1-click deploy to staging.
- Audit trail events visible in log explorer.
- API contract freeze for Sprint 1 scope.

### Sprint 1 (Mar 16 - Mar 27): Identity and KYC
Product outcomes:
- SDM bisa register, consent aktif, submit KYC, dan lihat status.

Engineering deliverables:
- Register/login/refresh/logout + MFA optional hooks.
- KYC session flow (create, upload docs, submit).
- KYC provider adapter v1 + webhook intake.
- Manual review queue v1 untuk admin.
- Consent ledger with versioned policy.

Business/Ops deliverables:
- SOP manual review (SLA + escalation).
- Fraud red-flag checklist for reviewers.

Definition of done:
- >= 90% KYC submissions diproses end-to-end di staging.
- Manual review action tercatat di audit log.
- Consent evidence dapat diekspor.

### Sprint 2 (Mar 30 - Apr 10): TSK/LPK Verification + Dashboard
Product outcomes:
- TSK/LPK bisa onboarding dan submit verifikasi legal.

Engineering deliverables:
- Organization profile + membership roles.
- TSK registry sync worker + snapshot table.
- Verification status engine (`VERIFIED`, `MISMATCH`, `NOT_FOUND`).
- Dashboard shell v1 (overview, verification tab, org settings).
- Access policy enforcement by org role.

Business/Ops deliverables:
- Legal review script untuk mismatch resolution.
- Partner communication template untuk status verifikasi.

Definition of done:
- Registry sync job berjalan otomatis sesuai schedule.
- Status verifikasi tampil real-time di dashboard.
- Escalation path untuk mismatch aktif.

### Sprint 3 (Apr 13 - Apr 24): Matching and Applications
Product outcomes:
- TSK verified bisa posting job, SDM verified bisa apply.

Engineering deliverables:
- Job posting CRUD + publish/close lifecycle.
- SDM job discovery page (mobile-web responsive).
- Application flow + critical consent checkpoint sebelum submit.
- Eligibility checks (kyc status, blacklist checks, org verification).
- Notification service (email/SMS basic).

Business/Ops deliverables:
- Pilot partner onboarding 5-10 TSK/LPK.
- Service-level promise draft untuk response applicant.

Definition of done:
- End-to-end apply flow sukses tanpa bypass trust gate.
- Funnel metrics tersedia (view -> apply -> shortlisted).
- Critical consent completion >= 95%.

### Sprint 4 (Apr 27 - May 8): Evidence and Trust Layer
Product outcomes:
- User bisa report fraud, admin bisa proses case sampai resolusi.

Engineering deliverables:
- Fraud report intake + evidence upload.
- Case ticket engine + SLA tracking + escalation rules.
- Blacklist service + enforcement hook ke matching flow.
- Trust profile endpoint dengan factor explanation.
- Ops dashboard: backlog, aging, SLA breach alerts.

Business/Ops deliverables:
- Incident response playbook v1 (SEV1-SEV3).
- Public trust FAQ (how verification works).

Definition of done:
- Median case triage <= 24 jam di pilot env.
- Blacklisted entity tidak bisa interaksi pada flow kritis.
- Trust score tampil dengan reason code (no black box).

### Sprint 5 (May 11 - May 22): Hardening and Pilot Launch
Product outcomes:
- MVP siap pilot terbatas dengan kualitas operasi stabil.

Engineering deliverables:
- Performance and load test untuk API critical paths.
- Security hardening (headers, rate limit, abuse detection basics).
- Backup/restore drill + DR rehearsal.
- Bug bash + regression suite.
- Production runbook + on-call handbook.

Business/Ops deliverables:
- Pilot contracts and escalation matrix final.
- Go/No-Go review with quality gates.
- Launch checklist and communication pack.

Definition of done:
- Semua go-live checklist hijau.
- No open SEV1/SEV2.
- Go/No-Go decision paper signed by Product + Tech + Compliance.

## 7. KPI Targets for MVP Exit (by May 22, 2026)
- KYC completion rate >= 70% from sign-up.
- KYC false-accept rate <= 0.50%.
- Verified organization ratio >= 85% (active pilot entities).
- Median fraud case resolution <= 72 jam.
- p95 latency critical APIs <= 500 ms.
- Trust NPS (safety sentiment) >= 50.

## 8. Execution Rituals
- Weekly Trust Review Board (Product, Tech Lead, Compliance, Ops).
- Sprint planning + daily standup + weekly demo.
- Sprint retro wajib menghasilkan 1 reliability improvement item.
- Monthly business review: unit economics + partner quality.

## 9. Risks and Pre-emptive Mitigation
- Legal ambiguity on labor placement boundary:
  - Mitigation: legal counsel checkpoint di Sprint 0, 2, 5.
- KYC vendor instability:
  - Mitigation: adapter architecture + fallback manual review.
- Ops backlog overload:
  - Mitigation: SLA dashboard + triage priority + queue ownership.
- Shipping pressure reducing quality:
  - Mitigation: non-negotiable quality gates and release veto.

## 10. Tracking Policy
- Semua task wajib punya owner, due date, acceptance criteria.
- Task tanpa acceptance criteria tidak boleh masuk `In Progress`.
- Setiap card perubahan status harus update evidence (PR link, test proof, demo link).

Companion docs:
- `ARCHITECTURE-HLD-LLD-v1.md`
- `SCALABLE-QUALITY-BUSINESS-PLAN-v1.md`
- `API-IMPLEMENTATION-STATUS-v0.md`
- `openapi-runtime-v0.yaml`
- `openapi-v1.yaml`
- `erd-v1.dbml`
