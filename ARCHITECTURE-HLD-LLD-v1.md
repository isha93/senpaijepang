# SenpaiJepang - System Architecture Plan v1.0

## 1. Scope and Objective
- Build a trust-first migration platform for Indonesia to Japan.
- Deliver MVP 1.0 with anti-fraud core: identity verification, legal entity verification, safe matching, evidence/reporting.
- Support 3 surfaces: SDM app, TSK/LPK dashboard, internal Ops/Admin console.

## 2. Roles
- SDM: candidate user, onboarding, KYC, apply, report issues.
- TSK: registered support organization, post demand, review candidate, compliance upload.
- LPK: training institution, provide training data and candidate endorsement.
- Admin Ops: manual review, dispute handling, blacklist, policy actions.
- Compliance Officer: audit, policy changes, regulator-facing exports.

## 3. Architecture Principles
- Trust over growth: every key action is identity-bound and auditable.
- Explainable trust: no black-box score without reason codes.
- Compliance-by-design: explicit consent logs and data minimization.
- API-first platform: mobile/web/internal clients consume same contracts.
- Modular monolith for MVP, service split after product-market fit.

## 4. High-Level Architecture (HLD)

```mermaid
graph TD
    A[SDM Mobile App\nReact Native] --> G[API Gateway / BFF]
    B[TSK-LPK Dashboard\nNext.js] --> G
    C[Ops Admin Console\nNext.js] --> G

    G --> S1[Auth and Access Service]
    G --> S2[Identity and KYC Service]
    G --> S3[Org Verification Service]
    G --> S4[Matching Service]
    G --> S5[Trust Score Service]
    G --> S6[Evidence and Case Service]
    G --> S7[Notification Service]

    S1 --> D1[(PostgreSQL)]
    S2 --> D1
    S3 --> D1
    S4 --> D1
    S5 --> D1
    S6 --> D1
    S7 --> D1

    S2 --> O1[(Object Storage S3)]
    S6 --> O1

    S4 --> X1[(OpenSearch)]
    S5 --> X1

    S1 --> R1[(Redis)]
    S4 --> R1
    S7 --> R1

    S2 --> T1[KYC Vendor Adapter]
    S3 --> T2[Japan TSK Registry Sync]
    S7 --> T3[SMS-Email-WhatsApp Provider]

    S1 --> E1[Event Bus / Queue]
    S2 --> E1
    S3 --> E1
    S4 --> E1
    S5 --> E1
    S6 --> E1
    S7 --> E1
```

## 5. Deployment View

```mermaid
graph LR
    U[Users] --> CF[CloudFront + WAF]
    CF --> ALB[Load Balancer]
    ALB --> ECS[ECS Fargate\nNestJS API]
    ECS --> RDS[RDS PostgreSQL]
    ECS --> REDIS[ElastiCache Redis]
    ECS --> S3[S3 Evidence Bucket]
    ECS --> OS[OpenSearch]
    ECS --> KMS[KMS + Secrets Manager]
    ECS --> EXT[External KYC / Registry / Messaging APIs]
```

## 6. Service Boundaries and Responsibilities

| Service | Responsibilities | Core Tables | External Dependencies |
|---|---|---|---|
| Auth and Access | signup/login, session, RBAC/ABAC, MFA, token lifecycle | users, roles, sessions, otp_challenges | SMS/Email provider |
| Identity and KYC | KYC session orchestration, doc ingestion, selfie/face match, manual review routing | kyc_sessions, kyc_results, identity_documents | KYC vendors |
| Org Verification | TSK registry sync, registration cross-check, LPK legal docs validation | organizations, org_verifications, tsk_registry_entities | ISA registry data source |
| Matching | job posting, candidate filtering, apply workflow, eligibility checks | jobs, applications, candidate_profiles | OpenSearch |
| Trust Score | trust signals and score snapshot with reason codes | trust_signals, trust_scores, trust_score_factors | none |
| Evidence and Case | fraud report intake, case queue, dispute workflow, blacklist management | evidence_items, fraud_reports, case_tickets, blacklists | object storage |
| Notification | event-driven notifications, reminder and SLA alerts | notifications, templates | SMS/Email/Push provider |

## 7. Core Flows (LLD)

### 7.1 SDM Onboarding + KYC
```mermaid
sequenceDiagram
    participant U as SDM User
    participant APP as Mobile App
    participant API as API
    participant ID as Identity Service
    participant KYC as KYC Vendor
    participant OPS as Admin Ops

    U->>APP: register + submit consent
    APP->>API: POST /auth/register
    API->>ID: create kyc session
    APP->>API: upload KTP + selfie
    API->>ID: validate docs
    ID->>KYC: run OCR + liveness + face match
    KYC-->>ID: decision + confidence + risk flags
    alt auto pass
        ID-->>API: verified
    else manual review
        ID->>OPS: create review task
        OPS-->>ID: approve/reject
    end
    API-->>APP: kyc status update
```

### 7.2 TSK Verification Flow
```mermaid
sequenceDiagram
    participant T as TSK Dashboard
    participant API as API
    participant OV as Org Verification Service
    participant SYNC as Registry Sync Worker
    participant REG as ISA Registry Source

    T->>API: submit org profile + registration number
    API->>OV: verify request
    OV->>SYNC: enqueue verification task
    SYNC->>REG: fetch latest registry data
    SYNC->>OV: match by reg no + entity name
    OV-->>API: verified/mismatch/not-found
    API-->>T: verification status + evidence
```

### 7.3 Fraud Report and Case Handling
```mermaid
sequenceDiagram
    participant U as User
    participant API as API
    participant EV as Evidence Service
    participant OPS as Ops Admin

    U->>API: submit fraud report + attachment
    API->>EV: create report + case ticket
    EV-->>OPS: SLA queue assignment
    OPS->>EV: request more evidence / action
    EV->>API: case status updated
    API-->>U: notification and resolution outcome
```

## 8. Data Architecture and ERD
- Canonical model is in `erd-v1.dbml`.
- Primary data store: PostgreSQL.
- Attachments and raw evidence: object storage.
- Search projection: OpenSearch index for jobs and verified organizations.
- Caching and short-lived session state: Redis.

### 8.1 ERD (Core Entities)
```mermaid
erDiagram
    USERS ||--o{ USER_ROLES : has
    USERS ||--o{ SESSIONS : owns
    USERS ||--o{ KYC_SESSIONS : submits
    USERS ||--o{ APPLICATIONS : creates
    USERS ||--o{ FRAUD_REPORTS : files

    ORGANIZATIONS ||--o{ ORG_MEMBERS : includes
    ORGANIZATIONS ||--o{ JOBS : posts
    ORGANIZATIONS ||--o{ ORG_VERIFICATIONS : has

    KYC_SESSIONS ||--o{ KYC_RESULTS : generates
    KYC_SESSIONS ||--o{ IDENTITY_DOCUMENTS : contains

    JOBS ||--o{ APPLICATIONS : receives

    FRAUD_REPORTS ||--o{ EVIDENCE_ITEMS : includes
    FRAUD_REPORTS ||--|| CASE_TICKETS : maps

    USERS ||--o{ TRUST_SIGNALS : emits
    USERS ||--o{ TRUST_SCORES : has
```

## 9. API Contract Strategy
- OpenAPI contract in `openapi-v1.yaml`.
- REST JSON for external/client APIs.
- Internal async events for side effects and SLA workflows.
- Versioning policy: `/v1` path version.

### 9.1 API Domains
- Auth: register/login/refresh/logout/MFA.
- Identity: start KYC, upload docs, fetch status.
- Organization Verification: submit/check verification, registry match.
- Matching: job listing, apply, application lifecycle.
- Trust: trust profile and factor explanation.
- Evidence: report fraud, upload evidence, case status.
- Admin: review queues, case actions, blacklist management.

### 9.2 Event Topics (Async)
- `user.kyc.submitted`
- `user.kyc.verified`
- `organization.verification.updated`
- `job.application.submitted`
- `fraud.report.created`
- `case.ticket.sla.breached`
- `trust.score.recomputed`

## 10. Security and Compliance Controls
- Encryption in transit (TLS 1.2+) and at rest (RDS/S3 encryption with KMS).
- Token model: short-lived access token + rotating refresh token.
- RBAC for baseline access and ABAC for case visibility (org scoped).
- PII segregation: sensitive fields in dedicated tables, least-privilege access.
- Immutable audit trail for critical actions: KYC decisions, verification changes, case outcomes.
- Consent ledger with versioned policy text and timestamp.
- Retention policy:
  - KYC artifacts: keep per legal minimum period.
  - Fraud evidence: retain until case closure + compliance window.
  - Right-to-delete workflow with legal hold exception.

## 11. Non-Functional Requirements (NFR)
- Availability target: 99.9% for core APIs.
- p95 latency target:
  - read APIs < 400 ms
  - write APIs < 700 ms
- Peak assumptions (MVP):
  - 100k registered users
  - 10k monthly active users
  - 1k concurrent sessions
- RTO: 4 hours, RPO: 15 minutes.
- Auditability: 100% critical events logged with actor and trace id.

## 12. Observability
- Structured logging with correlation id and user/org context.
- Metrics: API latency, queue lag, KYC pass rate, false-positive report rate, SLA breach count.
- Tracing: OpenTelemetry across API, workers, and external integrations.
- Alerting:
  - KYC vendor error rate > 5%
  - case queue backlog > threshold
  - registry sync failure > 1 cycle

## 13. Rollout Plan

### Phase 0 (Weeks 1-2)
- Finalize legal boundaries and data classification.
- Integrate 1 KYC provider sandbox.
- Build auth, user, org primitives.

### Phase 1 (Weeks 3-6)
- Ship SDM onboarding + KYC + consent ledger.
- Ship TSK basic dashboard and org verification.
- Add registry sync worker and admin review queue.

### Phase 2 (Weeks 7-10)
- Ship jobs, applications, and matching filters.
- Ship trust profile and score factors.
- Ship fraud report and case ticket lifecycle.

### Phase 3 (Weeks 11-14)
- Hardening, security testing, reliability improvements.
- Add SLA alerting and compliance exports.
- Pilot launch to limited sectors and prefectures.

## 14. Definition of Done for MVP 1.0
- SDM can register, pass KYC, and submit verified applications.
- TSK can pass verification, post jobs, and manage applicants.
- Users can submit fraud reports with evidence and track case status.
- All critical actions are auditable and explainable.
- Core trust metrics and anti-fraud KPIs available in ops dashboard.

## 15. Scale-Up Companion
- For post-MVP scale planning and quality-first governance, use:
  - `SCALABLE-QUALITY-BUSINESS-PLAN-v1.md`
- This companion document defines scale gates, engineering quality model, business unit-economics guardrails, and 24-month roadmap.
