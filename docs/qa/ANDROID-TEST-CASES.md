# QA Test Cases - Android App (Runtime v0)

Date: 2026-03-05  
Owner: QA + Mobile Android

> Scope: Android integration ke API runtime `docs/architecture/openapi-runtime-v0.yaml` (alias `/v1/*` tetap supported).

## 1. Auth & Session

### TC-AUTH-000 Register success
- Precondition: email belum terdaftar.
- Steps:
  1. Buka screen register.
  2. Isi full name + email + password valid.
  3. Submit register.
- Expected:
  - Account berhasil dibuat.
  - User masuk ke jobs list (authenticated state).

### TC-AUTH-001 Login success
- Precondition: akun valid.
- Steps:
  1. Buka app.
  2. Input email/password valid.
  3. Tap login.
- Expected:
  - User masuk ke jobs list.
  - Token/session tersimpan.

### TC-AUTH-002 Session restore
- Precondition: sudah pernah login.
- Steps:
  1. Tutup app.
  2. Buka app lagi.
- Expected:
  - App restore session valid tanpa login ulang.

### TC-AUTH-003 Logout
- Steps:
  1. Login.
  2. Tap logout.
- Expected:
  - Session clear.
  - User kembali ke login.

## 2. Jobs Browse & Save

### TC-JOBS-001 Jobs list load
- Steps: buka tab/list jobs.
- Expected:
  - Data jobs tampil.
  - Empty/error state tampil benar jika backend mengembalikan kosong/error.

### TC-JOBS-002 Job detail load
- Steps:
  1. Tap salah satu job.
- Expected:
  - Detail job tampil sesuai payload endpoint detail.

### TC-JOBS-003 Save/unsave job
- Steps:
  1. Save job dari list/detail.
  2. Buka saved jobs.
  3. Unsave job.
- Expected:
  - State sinkron di semua screen terkait.

## 3. Apply & Journey

### TC-APPLY-001 Apply success
- Steps:
  1. Buka detail job.
  2. Tap apply.
- Expected:
  - Application berhasil dibuat.
  - User bisa lihat status awal journey.

### TC-APPLY-002 Journey detail
- Steps:
  1. Buka list applications.
  2. Buka salah satu application journey.
- Expected:
  - Timeline/status tampil sesuai data API.

## 4. Profile & Verification

### TC-PROFILE-001 Load profile
- Steps: buka profile.
- Expected:
  - Data profile tampil lengkap.
  - Email, completion percent, trust label, verification status tampil.
  - Checklist verification documents tampil dari API.

### TC-PROFILE-002 Update profile
- Steps:
  1. Edit profile.
  2. Simpan.
- Expected:
  - Perubahan tersimpan dan muncul setelah reload.

### TC-PROFILE-003 Final verification request
- Steps:
  1. Buka section verification.
  2. Submit final request.
- Expected:
  - Request berhasil terkirim.
  - State final request di overview berubah ke `REQUESTED`.

### TC-PROFILE-004 Final verification idempotent
- Steps:
  1. Submit final verification request pertama kali.
  2. Submit lagi request yang sama.
- Expected:
  - Request kedua tidak membuat duplikasi.
  - App menampilkan status existing request secara aman.

## 5. Feed & Saved Posts

### TC-FEED-001 Feed list load
- Steps: buka feed.
- Expected:
  - Feed posts tampil.
  - Metadata post (`category`, `author`, `excerpt`) tampil benar.

### TC-FEED-002 Save/unsave post
- Steps:
  1. Save post.
  2. Buka saved posts.
  3. Unsave.
- Expected:
  - State saved sinkron.
  - Post hilang dari screen saved posts setelah unsave sukses.

### TC-FEED-003 Saved posts reload
- Steps:
  1. Save beberapa post dari feed.
  2. Tutup app lalu buka lagi.
  3. Buka saved posts.
- Expected:
  - Saved posts tetap konsisten sesuai server state terbaru.

## 6. KYC Flow

### TC-KYC-001 KYC status
- Steps: buka screen KYC status.
- Expected:
  - Status tampil (`NOT_STARTED/IN_PROGRESS/MANUAL_REVIEW/VERIFIED/REJECTED`).

### TC-KYC-002 KYC session submit
- Steps:
  1. Start KYC session.
  2. Request upload URL.
  3. Submit document metadata.
  4. Submit session.
- Expected:
  - Session masuk status proses review.
  - `upload-url` mengembalikan `objectKey` yang valid.
  - `documents` endpoint menerima metadata dengan `objectKey` tersebut.
  - Setelah submit, status session berubah ke `SUBMITTED` (atau status review yang setara dari backend).

### TC-KYC-003 KYC history
- Steps: buka history untuk session tertentu.
- Expected:
  - Event history tampil berurutan.
  - Event terbaru sinkron dengan aksi terakhir user (start/upload/submit).

## 7. Non-Functional Checks

### TC-NFR-001 Loading and error state
- Semua screen utama punya:
  - loading indicator,
  - empty state,
  - error state + retry action.

### TC-NFR-002 Basic performance
- Scroll list jobs/feed tetap smooth di device mid-tier.

### TC-NFR-003 Offline handling
- Saat network mati:
  - error message jelas,
  - app tidak crash.

## 8. Regression Gate Per Feature

Setelah tiap feature merge:

1. Jalankan ulang test cases feature baru.
2. Jalankan smoke regression:
  - login,
  - open jobs list/detail,
  - open profile,
  - logout.

Jika regression gagal, feature tidak boleh lanjut ke fase berikutnya.
