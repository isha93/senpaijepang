# iOS Test Cases — Senpai Jepang

Format: **Given / When / Then** + edge cases.

> Scope: iOS app integration ke API runtime v0 (`openapi-runtime-v0.yaml`, alias `/v1/*` supported).

---

## A. AUTH

### A1 Login — sukses
- **Given** akun valid
- **When** login dengan email + password benar
- **Then** masuk ke tab utama

**Edge**
- password salah -> error visible
- akun tidak terdaftar -> error
- token expired saat launch -> flow refresh atau redirect login

### A2 Logout
- **When** tap Logout
- **Then** kembali ke login screen + session dibersihkan

---

## B. JOBS TAB

### B1 Jobs list
- **When** buka Jobs
- **Then** list tampil dari `GET /v1/jobs`

### B2 Job detail
- **When** tap job card
- **Then** detail tampil dari `GET /v1/jobs/{jobId}`

### B3 Save/unsave job
- **Given** user login
- **When** save/unsave job
- **Then** sinkron dengan `/v1/users/me/saved-jobs` (POST/DELETE/GET)

### B4 Apply job
- **Given** user login
- **When** tap Apply
- **Then** request ke `POST /v1/jobs/{jobId}/applications` sukses

**Edge**
- apply duplicate -> idempotent response (tidak bikin duplicate)
- job invalid -> error state

### B5 Journey
- **When** buka journey aplikasi
- **Then** data dari `GET /v1/users/me/applications/{applicationId}/journey`

---

## C. FEED TAB

### C1 Feed list
- **When** buka Feed
- **Then** list tampil dari `GET /v1/feed/posts`

### C2 Saved posts
- **Given** user login
- **When** save/unsave post
- **Then** sinkron dengan `/v1/users/me/saved-posts` (POST/DELETE/GET)

### C3 Empty/loading/error states
- **Then** semua state tampil sesuai design guideline (no blank screen)

---

## D. PROFILE TAB

### D1 Profile tampil
- **When** buka Profile
- **Then** data dari `GET /v1/users/me/profile`

### D2 Edit profile
- **When** update field lalu save
- **Then** tersimpan via `PATCH /v1/users/me/profile`

### D3 Verification checklist
- **When** buka verification section
- **Then** dokumen/checklist tampil dari `GET /v1/users/me/verification-documents`

### D4 Final verification request
- **When** submit final request
- **Then** `POST /v1/users/me/verification/final-request` sukses

---

## E. KYC FLOW

### E1 KYC status
- **When** buka status KYC
- **Then** data dari `GET /v1/identity/kyc/status`

### E2 KYC upload flow
- **When** request upload URL + confirm document
- **Then** flow sukses via:
  - `POST /v1/identity/kyc/upload-url`
  - `POST /v1/identity/kyc/documents`

### E3 Submit KYC session
- **When** submit session
- **Then** `POST /v1/identity/kyc/sessions/{sessionId}/submit` sukses

### E4 KYC history
- **When** user buka timeline status
- **Then** data dari `GET /v1/identity/kyc/history?sessionId=<id>`

---

## F. Global Edge Cases

- Token missing/expired -> redirect login
- API timeout -> show retry state
- Offline mode -> show offline state
- 4xx/5xx response -> user-friendly error message, no crash
