# SenpaiJepang API MVP

Repo ini adalah "mesin belakang" (backend API) untuk proses verifikasi trust di platform migrasi kerja Indonesia -> Jepang.

Frontend web user/admin production belum selesai, tapi dashboard internal MVP React sudah tersedia di `apps/web-admin` dan terkoneksi endpoint runtime utama. Fokus delivery repo ini tetap: API stabil, kontrak sinkron, dan siap konsumsi client.

## Ringkas Dalam 30 Detik
- Apa yang sudah jalan: auth, KYC intake/review, jobs/feed/admin CRUD, organizations verification, persistence Postgres untuk alur utama.
- Apa yang belum: aplikasi web/mobile production, payment, vendor-specific KYC orchestration penuh.
- Siapa yang bisa pakai sekarang: tim backend, QA, PM/ops untuk validasi alur via API.

## Gambaran Besar (Non-Tech)
```mermaid
flowchart LR
    A[Calon Pengguna] --> B[Kirim data KYC]
    B --> C[API SenpaiJepang]
    C --> D[(PostgreSQL)]
    C --> E[(Object Storage/MinIO)]
    C --> F[Queue Review Admin]
    F --> G{Keputusan}
    G -->|VERIFIED| H[Status Aman]
    G -->|REJECTED| I[Status Ditolak]
    G -->|MANUAL_REVIEW| J[Butuh Pemeriksaan Lanjut]
```

## Status KYC Yang Dipakai
```mermaid
stateDiagram-v2
    [*] --> NOT_STARTED
    NOT_STARTED --> IN_PROGRESS
    IN_PROGRESS --> MANUAL_REVIEW
    IN_PROGRESS --> VERIFIED
    IN_PROGRESS --> REJECTED
    MANUAL_REVIEW --> VERIFIED
    MANUAL_REVIEW --> REJECTED
```

## Apa Yang Sudah Bisa Didemokan
- Register -> login -> refresh -> logout.
- Buka sesi KYC, minta upload URL, submit dokumen, submit sesi.
- Admin ambil review queue dan putuskan `MANUAL_REVIEW`, `VERIFIED`, atau `REJECTED`.
- Admin CRUD data bisnis: jobs, feed posts, organizations verification.
- Saved jobs/posts + apply/journey persistence di Postgres (mode `AUTH_STORE=postgres`).
- Audit trail perubahan status KYC.
- Endpoint health/metrics untuk observability dasar.

## Apa Yang Belum Dalam Scope Repo Ini
- Aplikasi frontend user/admin production.
- Integrasi vendor KYC end-to-end (mapping event vendor-specific, retry/reconciliation policy).
- Payment/escrow dan workflow bisnis lintas negara.

## Status Integrasi iOS
- API sudah masuk tahap siap integrasi iOS bertahap untuk flow:
  - auth,
  - jobs list/detail/saved/apply/journey,
  - feed list/saved,
  - profile,
  - KYC status/intake/review result.
- Kontrak runtime aktif: `docs/architecture/openapi-runtime-v0.yaml`.
- Checklist readiness terbaru: `docs/architecture/EXECUTION-LOCK-API-FIRST-v1.md`.

## Hosting MVP (Next Step)
- Bisa lanjut deploy staging untuk konsumsi iOS integration test.
- Rekomendasi opsi hosting + rollout plan ada di:
  - `docs/architecture/HOSTING-OPTIONS-MVP-v1.md`

## Cara Menjalankan (Paling Simpel)
### Prasyarat
- Node.js `>=22`
- npm `>=10`
- Docker Desktop aktif

### Langkah
```bash
cd /path/to/senpaijepang
cp .env.example .env
npm install
docker compose up -d
npm run migrate:api
npm run dev:api
```

### Cek Berhasil
```bash
curl -fsS http://localhost:4000/health
```
Expected output:
```json
{"status":"ok","service":"api","version":"0.1.0"}
```

### Cek Orkestrasi Full Local
```bash
npm run check:dev-all
```
Expected output akhir: `DEV_ALL_CHECK_OK`

## Command Harian
| Command | Untuk apa |
|---|---|
| `npm run dev:api` | Nyalain API mode development |
| `npm run dev:web-admin` | Nyalain dashboard internal React (desktop/mobile web adaptif) |
| `npm run build:web-admin` | Build dashboard React untuk validasi release asset |
| `npm run dev:all` | Nyalain infra + API sekalian |
| `npm run stop:all` | Matikan service hasil `dev:all` |
| `npm run migrate:api` | Jalankan migration database |
| `npm run test` | Jalankan test |
| `npm run test:ios -w @senpaijepang/mobile-ios` | Jalankan unit test scaffold iOS |
| `npm run ci` | Gate utama lint + typecheck + test + security checks |
| `npm run smoke:local` | Simulasi smoke test lokal end-to-end |

## API Yang Aktif Sekarang
### Base
- `GET /health`
- `GET /metrics`

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

### Jobs
- `GET /jobs`
- `GET /jobs/{jobId}`
- `POST /jobs/{jobId}/applications`
- `GET /users/me/saved-jobs`
- `POST /users/me/saved-jobs`
- `DELETE /users/me/saved-jobs/{jobId}`
- `GET /users/me/applications`
- `GET /users/me/applications/{applicationId}/journey`

### Feed
- `GET /feed/posts`
- `GET /users/me/saved-posts`
- `POST /users/me/saved-posts`
- `DELETE /users/me/saved-posts/{postId}`

### Profile
- `GET /users/me/profile`
- `PATCH /users/me/profile`
- `GET /users/me/verification-documents`
- `POST /users/me/verification/final-request`

### Identity/KYC
- `POST /identity/kyc/sessions`
- `POST /identity/kyc/sessions/{sessionId}/submit`
- `POST /identity/kyc/sessions/{sessionId}/provider-metadata`
- `GET /identity/kyc/status`
- `POST /identity/kyc/upload-url`
- `POST /identity/kyc/documents`
- `GET /identity/kyc/history?sessionId=<uuid>`
- `POST /identity/kyc/provider-webhook`

### Admin Review
- `GET /admin/jobs`
- `POST /admin/jobs`
- `PATCH /admin/jobs/{jobId}`
- `DELETE /admin/jobs/{jobId}`
- `GET /admin/feed/posts`
- `POST /admin/feed/posts`
- `PATCH /admin/feed/posts/{postId}`
- `DELETE /admin/feed/posts/{postId}`
- `GET /admin/organizations`
- `PATCH /admin/organizations/{orgId}/verification`
- `GET /admin/kyc/review-queue`
- `POST /admin/kyc/review`

## Environment Penting
- `API_PORT=4000`
- `AUTH_STORE=memory|postgres`
- `DATABASE_URL=postgresql://...` (wajib kalau `AUTH_STORE=postgres`)
- `ADMIN_API_KEY=...` (wajib untuk endpoint `/admin/*`)
- `ADMIN_ROLE_CODES=super_admin` (opsional, default role admin yang diizinkan)
- `BOOTSTRAP_ADMIN_EMAIL=admin@senpaijepang.com` (opsional, aktifkan auto-create admin saat startup)
- `BOOTSTRAP_ADMIN_PASSWORD=...` (wajib jika `BOOTSTRAP_ADMIN_EMAIL` diisi)
- `BOOTSTRAP_ADMIN_FULL_NAME=Admin Senpai` (opsional)
- `BOOTSTRAP_ADMIN_ROLE_CODES=super_admin,sdm,lpk,tsk,kaisha` (opsional)
- `BOOTSTRAP_ADMIN_RESET_PASSWORD=false` (set `true` kalau mau reset password akun bootstrap saat startup)
- `OBJECT_STORAGE_PROVIDER=memory|s3`
- `KYC_PROVIDER_WEBHOOK_REQUIRE_SIGNATURE=true|false`
- `KYC_PROVIDER_WEBHOOK_MAX_SKEW_SEC=300`

Detail lengkap: `.env.example`

## Mulai Baca Dokumen Dari Sini
- [Execution Lock: API RC -> iOS Integration -> Staging](docs/architecture/EXECUTION-LOCK-API-FIRST-v1.md)
- [Panduan Non-Tech MVP API](docs/architecture/MVP-API-NON-TECH-GUIDE-v1.md)
- [iOS Architecture (MVVM + Clean tanpa UseCase)](docs/architecture/IOS-ARCHITECTURE-MVVM-CLEAN-v1.md)
- [API Plan from Figma (Draft)](docs/architecture/API-PLAN-FIGMA-v1.md)
- [API Plan from Stitch Screens](docs/architecture/API-PLAN-STITCH-SCREENS-v1.md)
- [Breakdown Fitur MVP API](docs/architecture/MVP-API-BREAKDOWN-v1.md)
- [Status Implementasi Runtime API](docs/architecture/API-IMPLEMENTATION-STATUS-v0.md)
- [Kontrak Runtime OpenAPI](docs/architecture/openapi-runtime-v0.yaml)
- [Hosting Options MVP](docs/architecture/HOSTING-OPTIONS-MVP-v1.md)
- [Dashboard Stitch Prompt](docs/architecture/DASHBOARD-STITCH-PROMPT-v1.md)
- [Web Admin Implementation Plan](docs/architecture/WEB-ADMIN-IMPLEMENTATION-PLAN-v1.md)
- [Sprint Plan Lama (Archived)](docs/architecture/MVP-SPRINT-PLAN-v1.md)

## Istilah Singkat Biar Nyambung
- **KYC**: verifikasi identitas pengguna.
- **Review Queue**: daftar kasus yang menunggu keputusan admin.
- **MANUAL_REVIEW**: butuh pengecekan manusia lanjutan.
- **VERIFIED**: lolos verifikasi.
- **REJECTED**: ditolak.
