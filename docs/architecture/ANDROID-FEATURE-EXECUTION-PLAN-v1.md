# Android Feature Execution Plan v1 (One-by-One)

Date: 2026-03-05  
Status: Ready for Execution

## 1. Objective

Build Android native SenpaiJepang dengan urutan feature yang bisa dieksekusi 1-1, dengan kualitas terjaga:

- setiap feature harus selesai end-to-end,
- setiap feature wajib ada test minimum,
- lanjut ke feature berikutnya hanya jika gate lulus.

## 2. Prinsip Eksekusi

1. One feature = one focused PR (boleh pecah jadi beberapa commit kecil).
2. Tidak lompat layer: selalu implement `domain -> data -> presentation -> test`.
3. Wajib sinkron dengan runtime contract: `openapi-runtime-v0.yaml`.
4. Jangan over-tech: prioritaskan maintainability + speed yang stabil.

## 3. Urutan Milestone

### M0 - Foundation (wajib dulu)

Scope:
- App skeleton Compose.
- Base theme + component atoms minimum.
- NavigationManager + route graph.
- API client base + auth/session storage.
- Error mapping standar.

Output:
- App boot ke screen login.
- Struktur folder final siap untuk feature scale.

Gate:
- `./gradlew testDebugUnitTest`
- `./gradlew lintDebug`

Status implementasi saat ini:
- `M0` scaffolding: done (struktur package, navigation manager, network/session base).
- `F1` auth flow: implemented in app scaffold (splash restore, login, register, logout wiring + unit tests).
- `F2` jobs browse & save: implemented (list/detail/saved + save/unsave wiring + unit tests).
- `F3` apply & journey: implemented (apply action + applications list + journey timeline + unit tests).
- Verifikasi build/test lokal: pending karena environment belum punya Java Runtime.

## 4. Breakdown Feature (Execution Order)

| ID | Feature | Endpoint Runtime | Output Utama | Gate Test Minimum |
|---|---|---|---|---|
| F1 | Auth & Session | `/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout`, `/auth/me` | Login flow + session restore + logout | ViewModel unit + auth repository test + login UI smoke |
| F2 | Jobs Browse & Save | `/jobs`, `/jobs/{jobId}`, `/users/me/saved-jobs` (GET/POST/DELETE) | Jobs list, detail, save/unsave | Jobs VM unit + mapper test + list/detail UI smoke |
| F3 | Apply & Journey | `/jobs/{jobId}/applications`, `/users/me/applications`, `/users/me/applications/{applicationId}/journey` | Apply job + journey timeline | Journey VM unit + apply flow integration smoke |
| F4 | Profile & Verification Request | `/users/me/profile` (GET/PATCH), `/users/me/verification-documents`, `/users/me/verification/final-request` | Profile edit + verification docs + final request | Profile VM unit + edit form UI test |
| F5 | Feed & Saved Posts | `/feed/posts`, `/users/me/saved-posts` (GET/POST/DELETE) | Feed list + save/unsave post | Feed VM unit + save flow test |
| F6 | KYC User Flow | `/identity/kyc/status`, `/identity/kyc/sessions`, `/identity/kyc/upload-url`, `/identity/kyc/documents`, `/identity/kyc/sessions/{sessionId}/submit`, `/identity/kyc/history` | KYC onboarding, upload intent, submit session, status/history | KYC VM unit + upload intent test + happy-path integration |

## 5. Detail Task per Feature (Template)

Gunakan template ini untuk setiap `F1..F6`:

1. Domain
- Tambah model domain.
- Tambah service interface.

2. Data
- Tambah DTO + mapper.
- Implement repository/service.
- Tambah API call.

3. Presentation
- Tambah ViewModel (state + action + effect).
- Tambah screen Compose.
- Tambah route + navigation wiring.

4. Tests
- Unit test ViewModel.
- Unit test mapper/repository.
- UI smoke test minimal 1 jalur happy path.

5. Docs
- Update:
  - `apps/mobile-android/README.md`
  - `docs/qa/ANDROID-TEST-CASES.md`
  - changelog internal feature.

## 6. Definition of Done per Feature

Feature dianggap selesai jika:

1. Scope endpoint feature sudah terpakai di app.
2. UI utama feature bisa dipakai end-to-end (happy path).
3. Unit tests baru lulus.
4. Tidak merusak feature sebelumnya (smoke regression pass).
5. README/QA docs ter-update.

## 7. Suggested Sprint Grouping

- Sprint A: `M0 + F1`
- Sprint B: `F2`
- Sprint C: `F3`
- Sprint D: `F4`
- Sprint E: `F5`
- Sprint F: `F6`

Jika bandwidth kecil, cukup 1 feature per sprint.

## 8. Risk Register Ringkas

1. API mismatch vs runtime
- Mitigasi: lock ke `openapi-runtime-v0.yaml`, bukan `openapi-v1.yaml`.

2. Scope creep UI
- Mitigasi: lock komponen per feature, jangan redesign saat implement.

3. Test debt
- Mitigasi: gate wajib pass sebelum merge feature.

## 9. Next Action (Immediate)

Mulai dari `M0 Foundation` lalu lanjut `F1 Auth`.
Setelah `F1` merged dan stabil, baru buka `F2`.
