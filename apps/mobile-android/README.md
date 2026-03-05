# SenpaiJepang Android

Native Android app untuk SenpaiJepang, dibangun dengan `Kotlin + Jetpack Compose`.

## 1. Scope Saat Ini

- Project Android sudah inisialisasi dan bisa dijadikan baseline development.
- Fokus berikutnya: implement feature 1-1 berdasarkan plan resmi.

## 1.1 Baseline Yang Sudah Dikerjakan (M0)

- Struktur package target (`app/core/components/features`) sudah dibuat.
- NavigationManager + route graph dasar sudah terpasang (login -> jobs + placeholder routes).
- Networking base (`Retrofit + OkHttp + AuthInterceptor`) sudah tersedia.
- Session storage base (`DataStore`) sudah tersedia.
- Auth service contract + implementasi data layer dasar sudah tersedia untuk lanjut ke F1.

## 1.2 Progress F1 Auth

- Splash bootstrap untuk session restore sudah ada.
- Login + Register screen dan ViewModel sudah ada.
- Logout flow sudah pindah ke `JobsListViewModel` (call service, lalu route ke login).
- Unit test F1 ViewModel sudah ditambahkan (login/register/bootstrap/logout).

## 1.3 Progress F2 Jobs Browse & Save

- Jobs service domain + data layer sudah terpasang (`/jobs`, `/jobs/{jobId}`, `/users/me/saved-jobs`).
- Jobs list screen sudah load data runtime + toggle save/unsave.
- Saved jobs screen sudah load list saved + remove from saved.
- Job detail screen sudah load detail + toggle save/unsave.
- Unit test ViewModel untuk jobs list/saved/detail sudah ditambahkan.

## 1.4 Progress F3 Apply & Journey

- Apply endpoint sudah terhubung dari job detail (`/jobs/{jobId}/applications`).
- Applications list screen sudah terhubung (`/users/me/applications`).
- Application journey timeline screen sudah terhubung (`/users/me/applications/{applicationId}/journey`).
- Unit test ViewModel untuk applications/journey flow sudah ditambahkan.

## 2. Architecture Lock

Arsitektur disamakan dengan style iOS:

- MVVM.
- Clean architecture ringan tanpa use case.
- Atomic design components.
- Navigation Compose dengan satu `NavigationManager`.

Dokumen acuan:
- `../../docs/architecture/ANDROID-ARCHITECTURE-MVVM-CLEAN-v1.md`
- `../../docs/architecture/ANDROID-FEATURE-EXECUTION-PLAN-v1.md`
- `../../docs/qa/ANDROID-TEST-CASES.md`

## 3. API Contract

Android wajib mengacu ke runtime contract:
- `../../docs/architecture/openapi-runtime-v0.yaml`

Catatan:
- `openapi-v1.yaml` adalah target future state.

## 4. Jalankan Project

Prerequisites:
- Android Studio stable.
- JDK 17.
- Android SDK sesuai config project.

Command:

```bash
cd apps/mobile-android
./gradlew assembleDebug
```

### API Base URL

- Default Android sekarang sama seperti iOS: `https://senpai-api-app-production.up.railway.app/`.
- Endpoint Android pakai prefix `/v1/*` untuk parity dengan iOS.

Override untuk local/dev (contoh emulator ke local API):

```bash
./gradlew assembleDebug -PAPI_BASE_URL=http://10.0.2.2:4000/
```

Atau set di `~/.gradle/gradle.properties`:

```properties
API_BASE_URL=http://10.0.2.2:4000/
```

Run unit tests:

```bash
./gradlew testDebugUnitTest
```

Run instrumentation tests (emulator/device):

```bash
./gradlew connectedDebugAndroidTest
```

## 5. Feature Execution Order

1. M0 Foundation
2. F1 Auth & Session
3. F2 Jobs Browse & Save
4. F3 Apply & Journey
5. F4 Profile & Verification
6. F5 Feed & Saved Posts
7. F6 KYC Flow

Detail task per phase: `../../docs/architecture/ANDROID-FEATURE-EXECUTION-PLAN-v1.md`.

## 6. Definition of Done per Feature

Feature dianggap selesai jika:

1. Flow utama feature jalan end-to-end.
2. Unit test dan smoke test feature pass.
3. Tidak ada regression ke flow feature sebelumnya.
4. Dokumen README + QA case ter-update.
