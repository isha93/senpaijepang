# Execution Lock v1 (API First -> iOS Later)

Date: 2026-02-28  
Status: Active

## 1. Tujuan

Mengunci urutan eksekusi delivery:
1. Selesaikan API MVP sampai release candidate.
2. Setelah gate API lolos, baru pindah ke implementasi iOS.

## 2. Scope Lock (Efektif Sekarang)

Yang aktif sekarang:
- Backend API (`apps/api`)
- Kontrak API runtime (`openapi-runtime-v0.yaml`)
- Infrastruktur local/dev/CI untuk API

Yang ditunda:
- Implementasi fitur produk iOS end-to-end
- UI frontend user/admin di repo ini

Catatan:
- Dokumen arsitektur iOS tetap dipertahankan sebagai blueprint.
- Implementasi iOS lanjut hanya setelah gate API selesai.

## 3. Technical Lock (Keputusan Dikunci)

- Database utama: `PostgreSQL`
- Object storage dokumen: `S3/MinIO` pattern
- API mode: `API-only` sampai gate selesai
- Arsitektur iOS (nanti): `MVVM + Clean tanpa UseCase + Atomic + NavigationManager`

## 4. Delivery Phases

## Phase A - API MVP Completion
Target:
- Auth lifecycle stabil
- KYC intake end-to-end stabil
- Admin review queue + decision stabil
- Jobs/journey/feed/profile endpoints MVP sesuai plan screen

Output wajib:
- `docs/architecture/API-IMPLEMENTATION-STATUS-v0.md` terbarui
- `docs/architecture/openapi-runtime-v0.yaml` sinkron dengan implementasi
- test API hijau

## Phase B - API Hardening + Release Candidate
Target:
- Smoke local stabil
- CI hijau konsisten
- Error handling + observability baseline rapi
- Gate keamanan minimum lolos

Output wajib:
- `npm run ci` pass
- `npm run smoke:local` pass
- `npm run check:dev-all` pass

## Phase C - iOS Kickoff (Baru Mulai di Sini)
Trigger:
- Semua gate di Phase B lolos
- Kontrak runtime cukup stabil untuk konsumsi iOS

Scope awal iOS:
- App shell + navigation flow
- Auth + Jobs list/detail + basic apply/journey read
- Incremental integration per endpoint yang sudah stabil

## 5. Entry Criteria Pindah ke iOS

Semua poin harus `YES`:
- API runtime contract sudah sinkron dan tidak drifting
- Regression API utama hijau
- KYC + review flow tidak ada blocker P0/P1
- Dokumentasi API cukup jelas untuk mobile integration

Jika ada `NO`, tetap di phase API dan tidak buka scope iOS.

## 6. Change Control

- Perubahan urutan phase wajib update dokumen ini.
- Setiap perubahan scope harus jelas statusnya: `Active` atau `Deferred`.
- Board tracking (ClickUp) bisa disambungkan setelah plan ini disetujui final.
