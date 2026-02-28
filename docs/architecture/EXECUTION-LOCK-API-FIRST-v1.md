# Execution Lock v2 (API RC -> iOS Integration -> Staging)

Date: 2026-03-01  
Status: Active

## 1. Tujuan

Mengunci urutan eksekusi delivery:
1. Stabilkan API MVP ke level release candidate.
2. Buka integrasi iOS bertahap pada endpoint runtime yang sudah stabil.
3. Lanjut staging hosting untuk integration test lintas device.

## 2. Scope Lock (Efektif Sekarang)

Yang aktif sekarang:
- Backend API (`apps/api`).
- Kontrak API runtime (`openapi-runtime-v0.yaml`).
- Integrasi iOS bertahap sebagai consumer API (bukan full feature build).
- Persiapan staging hosting untuk endpoint yang sudah stabil.

Yang tetap ditunda:
- Implementasi UI frontend web user/admin di repo ini.
- Ekspansi fitur iOS di luar endpoint API MVP yang sudah stabil.

Catatan:
- Dokumen arsitektur iOS tetap dipakai sebagai blueprint implementasi.
- Fokus engineering utama tetap menjaga stabilitas API contract saat integrasi iOS berjalan.

## 3. Technical Lock (Keputusan Dikunci)

- Database utama: `PostgreSQL`.
- Object storage dokumen: `S3/MinIO` pattern.
- Admin auth: Bearer token + role check (fallback `ADMIN_API_KEY` untuk bootstrap).
- Webhook KYC: signature + timestamp + idempotency enabled by default.
- Runtime path canonical: unversioned, alias `/v1/*` dipertahankan untuk compatibility.
- Arsitektur iOS: `MVVM + Clean tanpa UseCase + Atomic + NavigationManager`.

## 4. Delivery Phases

## Phase A - API MVP Completion
Status: `Completed`

Output:
- Endpoint core auth + KYC + jobs/feed/profile + admin flow tersedia di runtime.
- Migration `001` sampai `009` sudah tersedia.
- Dokumen runtime (`openapi-runtime-v0.yaml` + implementation status) sudah sinkron.

## Phase B - API Hardening + Release Candidate
Status: `In Progress`

Target:
- Stabilitas smoke lokal konsisten.
- CI gate hijau konsisten pada perubahan API trust-critical.
- Error handling + observability baseline rapi.

Gate wajib:
- `npm run ci` pass
- `npm run smoke:local` pass
- `npm run check:dev-all` pass

## Phase C - iOS Integration Kickoff
Status: `Active`

Scope integrasi:
- Auth lifecycle.
- Jobs list/detail/saved/apply/journey.
- Feed list/saved.
- Profile read/update dasar.
- KYC intake/status/history + review result consumption.

Rule:
- Integrasi dilakukan incremental per endpoint stabil.
- Perubahan contract runtime harus backward compatible untuk consumer iOS aktif.

## Phase D - Staging Hosting (API)
Status: `Next`

Target:
- API staging publik untuk iOS integration test.
- Database + object storage persistent non-local.
- Monitoring baseline (`/health`, `/metrics`, structured logs) tetap aktif.

Referensi:
- `docs/architecture/HOSTING-OPTIONS-MVP-v1.md`

## 5. Entry Criteria Pindah ke Staging

Semua poin harus `YES`:
- Runtime contract sinkron (`openapi-runtime-v0.yaml`).
- Regression endpoint utama hijau.
- Tidak ada blocker P0/P1 pada auth, jobs/feed/profile, dan KYC review flow.
- Konfigurasi env staging terdokumentasi lengkap.

Jika ada `NO`, tetap di hardening lokal sampai blocker ditutup.

## 6. Change Control

- Perubahan urutan phase wajib update dokumen ini.
- Setiap perubahan scope harus jelas statusnya: `Active`, `Deferred`, atau `Next`.
- Perubahan contract runtime wajib update dokumen status implementasi pada commit yang sama.
