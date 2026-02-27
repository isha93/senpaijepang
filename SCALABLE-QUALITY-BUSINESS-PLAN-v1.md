# SenpaiJepang - Scalable Quality Plan v1.0

## 1. Intent
Dokumen ini mengubah arsitektur MVP menjadi rencana scale-up yang tetap konsisten dengan filosofi:
- `Quality more than quantity`
- `Trust > growth`
- `Critical consent, not passive consent`

Prinsip operasional utama:
- Tidak scale traffic kalau trust/control belum stabil.
- Pertumbuhan wilayah/partner mengikuti quality gate, bukan target vanity.
- Setiap keputusan growth harus punya dampak terukur ke keamanan SDM dan kesehatan ekosistem.

## 2. North Star, Guardrails, and Success Definition

### 2.1 North Star
`Verified Safe Placement Rate (VSPR)` = jumlah kandidat verified yang masuk proses kerja legal tanpa incident fraud mayor dalam 90 hari / total kandidat verified yang match.

### 2.2 Non-negotiable guardrails
- Satu identitas satu akun (`1 person = 1 account`).
- Semua entitas publik (TSK/LPK/job) harus punya jejak verifikasi dan timestamp sinkronisasi.
- Tidak ada trust score tanpa faktor penjelas.
- Fraud report harus selalu punya status tracking transparan.

### 2.3 Scale gates (wajib lolos sebelum ekspansi)
- KYC false-accept rate <= 0.50%.
- Median case resolution <= 72 jam.
- p95 latency API critical <= 500 ms.
- Verified entity ratio (TSK/LPK aktif) >= 85%.
- Trust NPS (rasa aman) >= 50.

Jika satu gate gagal selama 2 sprint berturut-turut, ekspansi dibekukan dan tim pindah ke reliability sprint.

## 3. Scalability Strategy (Stage-Based)

| Stage | Target skala | Fokus produk | Strategi arsitektur | Trigger naik stage |
|---|---|---|---|---|
| Stage A - MVP Stable | <=100k users, <=1k concurrent | KYC, verifikasi TSK, matching dasar, fraud report | Modular monolith + async queue + read replicas | SLA stabil 8 minggu |
| Stage B - Growth Controlled | 100k-1M users, multi wilayah | Trust profile mature, case ops otomatis, quality analytics | Mulai ekstraksi service prioritas + CDC/event bus lebih kuat | 2 kuartal KPI trust konsisten |
| Stage C - Regional Scale | >1M users, multi-country workflows | Policy engine, partner API, compliance automation | Domain services terpisah, multi-region read strategy | Margin sehat + compliance lulus audit |

## 4. Target Architecture Evolution

### 4.1 Architecture pattern by stage
- Stage A: modular monolith (NestJS) dengan domain modules ketat (Auth, Identity, Verification, Matching, Trust, Evidence).
- Stage B: pisahkan service yang paling berat/volatil terlebih dulu:
  - `Identity/KYC Service`
  - `Evidence/Case Service`
  - `Search/Matching Read Service`
- Stage C: event-driven domain services + policy engine + partner integration gateway.

### 4.2 Service extraction triggers
Ekstraksi service dilakukan hanya jika terpenuhi minimal dua kondisi berikut:
- Modul tertentu menyumbang >35% total CPU atau >30% deploy risk.
- Perubahan release cadence modul berbeda signifikan dari modul lain.
- p95 endpoint domain itu > target selama >=14 hari.
- Team ownership sudah jelas (min. 1 tech lead + 3 engineers).

### 4.3 Data scaling strategy
- PostgreSQL sebagai source of truth.
- Read replica untuk query dashboard dan reporting.
- Partitioning bertahap:
  - `audit_logs`, `notifications`, `fraud_reports` by month.
- Search index (OpenSearch) untuk listing/filtering berat.
- Redis untuk hot cache, rate-limit, dan idempotency keys.
- Object storage lifecycle policy untuk evidence (tiering dan retention).

### 4.4 Integration resilience
- KYC dan provider eksternal wajib lewat adapter internal.
- Circuit breaker + retry policy + dead-letter queue.
- Fallback manual review jika vendor outage > threshold.

## 5. Coding and Engineering Operating System

### 5.1 Repo and architecture discipline
- Monorepo (`apps/`, `services/`, `packages/`) agar share contract dan types.
- Domain contract first: OpenAPI + event schema versioning.
- ADR (Architecture Decision Record) wajib untuk keputusan struktural besar.

### 5.2 Quality gates in CI/CD
- Lint + type check wajib pass.
- Unit test coverage minimal:
  - domain logic >= 85%
  - adapters/integrations >= 70%
- Contract test untuk endpoint public dan event payload.
- SAST + dependency scan + secret scan.
- Migration check (forward/backward safe) untuk schema changes.

### 5.3 Release policy
- Trunk-based development + short-lived branch.
- Canary release untuk endpoint/high-risk flows (KYC, verification, payment-related evidence).
- Feature flag + kill switch untuk semua fitur eksperimen.

### 5.4 Reliability engineering
- SLO per domain:
  - Auth availability 99.95%
  - KYC workflow completion success >= 99.0% (excluding provider-reject)
  - Evidence upload success >= 99.5%
- Error budget policy:
  - jika error budget habis, freeze fitur non-kritis.
- On-call rotation + incident severity playbook (SEV1-SEV3).

## 6. Trust and Compliance Operating Model

### 6.1 Data governance
- Data classification: Public/Internal/Confidential/Restricted.
- PII minimal collection dan masking by default.
- Access via least privilege + time-bound elevated access.

### 6.2 Auditability
- Audit log immutable untuk aksi kritis:
  - KYC decision
  - Org verification status change
  - Case resolution/blacklist
- Semua event kritis punya `trace_id`, `actor_id`, `reason_code`.

### 6.3 Regulatory readiness
- Indonesia PDP compliance pack: consent registry, data subject request workflow, retention policy.
- Jepang APPI readiness: cross-border transfer notice dan lawful processing basis.
- Evidence chain-of-custody untuk sengketa.

## 7. Business Architecture (Scale with Quality)

### 7.1 Business model evolution
- Phase 1 (MVP):
  - B2B subscription ringan untuk TSK/LPK verified.
  - Tidak membebani SDM dengan biaya utama.
- Phase 2 (Growth):
  - Tiered subscription (compliance analytics, priority matching).
  - Verification API fee untuk partner institusi.
- Phase 3 (Scale):
  - Risk and compliance SaaS layer (enterprise).

### 7.2 Unit economics guardrails
- CAC payback <= 6 bulan.
- Gross margin >= 60%.
- Cost per Verified Safe Match turun 20% YoY.
- Fraud loss as % of GMV/processing value <= 0.30%.

### 7.3 Growth strategy constraints
- Ekspansi sektor/prefektur hanya jika quality gate lulus.
- No paid growth blitz tanpa kapasitas trust ops.
- Partner onboarding wajib risk scoring dan legal verification.

## 8. KPI Tree (Engineering x Business)

### 8.1 Trust KPIs (primary)
- Verified Safe Placement Rate (North Star).
- KYC false-accept rate.
- Incident rate per 1,000 interactions.
- Median time to case resolution.

### 8.2 Product KPIs
- Verification completion rate (SDM/TSK/LPK).
- Verified match-to-offer conversion.
- Critical consent completion rate.
- 30/90-day retention untuk user verified.

### 8.3 Engineering KPIs
- Deployment frequency (healthy, not reckless).
- Change failure rate.
- MTTR.
- p95/p99 latency for critical APIs.

### 8.4 Business KPIs
- MRR dari B2B verified partners.
- Net revenue retention (NRR).
- CAC, LTV, payback period.
- Contribution margin per segment.

## 9. Team and Governance Design
- Squad by domain:
  - Squad Identity and Trust
  - Squad Matching and Growth Control
  - Squad Evidence and Safety Ops
  - Platform and SRE
- Weekly forum:
  - Trust Review Board (produk + compliance + ops)
  - Architecture Review (tech leads)
- Decision rights:
  - Compliance veto untuk fitur berisiko legal tinggi.
  - SRE veto untuk launch saat SLO merah.

## 10. 24-Month Roadmap

### Q1-Q2 (Foundation)
- Stabilkan MVP flow end-to-end.
- Bentuk quality gates di CI/CD.
- Bentuk trust dashboard realtime.

### Q3-Q4 (Controlled Growth)
- Tambah 2-3 sektor TG dan prefektur terbatas.
- Otomasi case triage berbasis rule engine.
- Mulai service extraction untuk KYC dan Case.

### Year 2 H1 (Scale Infrastructure)
- Multi-tenant partner capabilities.
- Advanced anomaly detection untuk fraud/evidence.
- Compliance export automation.

### Year 2 H2 (Regional Expansion Readiness)
- Partner API platform.
- Policy engine lintas negara.
- Multi-region read architecture + DR drills berkala.

## 11. Risk Register (Top 10)
1. Regulatory misclassification as labor placement operator.
2. KYC vendor outage or quality drop.
3. False trust perception from opaque scoring.
4. Case handling backlog and trust erosion.
5. Data breach / privacy incident.
6. Over-scaling infra before proven demand.
7. Partner fraud collusion patterns.
8. Internal quality debt from rushed releases.
9. Cost creep from unmanaged external API usage.
10. Market trust shock due to one high-profile incident.

Mitigasi wajib: legal counsel cadence, vendor dual-track plan, transparent trust factors, SLO governance, breach tabletop exercise, and staged rollout.

## 12. 90-Day Execution Plan (Immediate)

### Track A - Engineering Foundations
- Implement CI quality gates and branch policy.
- Add observability baseline (logs, metrics, traces, alerting).
- Finalize API and event schema versioning conventions.

### Track B - Trust Operations
- Define manual review SOP untuk KYC dan case handling.
- Build SLA dashboard + escalation routing.
- Build explainable trust factor API responses.

### Track C - Business and Risk
- Finalize partner verification policy and commercial terms.
- Build KPI review ritual (weekly trust, monthly unit economics).
- Build expansion scorecard per sektor/prefektur.

## 13. Go/No-Go Checklist for Any Scale-Up Decision
- Semua quality gate lulus 2 sprint berturut-turut.
- Tidak ada SEV1 unresolved.
- Trust NPS tidak turun signifikan.
- Case backlog dalam batas SLA.
- Unit economics positif sesuai target stage.

Jika checklist gagal, keputusan default adalah `NO-GO`.
