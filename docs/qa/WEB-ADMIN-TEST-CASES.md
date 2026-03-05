# Web Admin Test Cases — Senpai Jepang

Format: **Given / When / Then** + edge cases.

> Scope: runtime v0 endpoints (`openapi-runtime-v0.yaml`, alias `/v1/*` supported)
>
> Auth mode:
> - primary: Bearer token admin (`/auth/login`)
> - fallback: `x-admin-api-key` (bootstrap/compatibility only)

---

## A. AUTH & SESSION

### A1 Login — sukses
- **Given** admin user valid
- **When** login dengan kredensial benar
- **Then** masuk dashboard + token tersimpan

**Edge**
- password salah -> error toast + tetap di login
- akun non-admin -> akses ditolak
- session expired -> redirect ke login

### A2 Refresh session
- **Given** token expired
- **When** refresh token dipakai otomatis
- **Then** session tetap aktif tanpa logout

**Edge**
- refresh gagal -> logout otomatis

---

## B. OVERVIEW / SYSTEM

### B1 Overview summary
- **When** buka halaman overview
- **Then** summary card terisi dari `/admin/overview/summary`

### B2 Activity events
- **When** buka panel aktivitas
- **Then** list event tampil dari `/admin/activity-events`

### B3 System health
- **When** buka system health
- **Then** metrics tampil dari `/metrics`

**Edge**
- `/health` down -> indikator status merah
- API 500 -> tampil error state + retry

---

## C. KYC REVIEW

### C1 List review queue
- **When** buka KYC review
- **Then** list data dari `/admin/kyc/review-queue`

**Edge**
- list kosong -> empty state

### C2 Review approve/reject
- **Given** item pending
- **When** submit decision
- **Then** status update via `/admin/kyc/review`

**Edge**
- reject tanpa alasan (jika policy UI mewajibkan reason) -> validasi gagal

---

## D. APPLICATIONS ADMIN

### D1 List applications
- **When** buka Applications
- **Then** list muncul dari `/admin/applications`

### D2 View application detail
- **When** buka detail aplikasi
- **Then** data dari `/admin/applications/{id}`

### D3 View journey
- **When** buka journey timeline
- **Then** data dari `/admin/applications/{id}/journey`

### D4 Update application status
- **When** update status
- **Then** PATCH `/admin/applications/{id}/status` sukses

**Edge**
- invalid status transition -> tampil error

---

## E. JOBS ADMIN

### E1 List jobs
- **When** buka Jobs
- **Then** list dari `/admin/jobs`

### E2 Create/Edit/Delete job
- **When** create/edit/delete
- **Then** sinkron dengan `/admin/jobs` (POST/PATCH/DELETE)

**Edge**
- field wajib kosong -> validation error

---

## F. FEED ADMIN

### F1 List posts
- **When** buka Feed
- **Then** list `/admin/feed/posts`

### F2 Create/Edit/Delete post
- **When** create/edit/delete
- **Then** sinkron dengan `/admin/feed/posts` (POST/PATCH/DELETE)

---

## G. ORGANIZATIONS ADMIN

### G1 List organizations
- **When** buka Organizations
- **Then** list `/admin/organizations`

### G2 Update verification status
- **When** update status
- **Then** PATCH `/admin/organizations/{orgId}/verification`

---

## H. PUBLIC PREVIEW (READ-ONLY)

### H1 Jobs preview
- **When** buka public jobs preview
- **Then** GET `/jobs` tampil list

### H2 Feed preview
- **When** buka public feed preview
- **Then** GET `/feed/posts` tampil list

---

## Global Edge Cases

- Missing/expired token -> redirect login
- API 5xx -> error state + retry
- API timeout -> timeout state
- Invalid pagination/filter -> error toast
