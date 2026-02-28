# API Plan from Stitch Screens v1

Date: 2026-02-28
Source bundle:
- `/Users/ichsan/Downloads/stitch_job_detail_view`
- Flows: `senpai_jepang_feed`, `browse_jobs_listing`, `job_detail_view`, `application_journey_tracker`, `user_profile_kyc`

## 1. Objective
Terjemahkan UI flow menjadi kontrak API yang implementable end-to-end.

## 2. Screen-to-API Mapping

### 2.1 Senpai Jepang Feed
UI behavior observed:
- Search feed content.
- Filter by category (`All`, `Visa Updates`, `Safety`, `Job Market`, `Living Guide`).
- Card list with source, relative publish time.
- Guest CTA: `Login to save`.

Required endpoints:
- `GET /v1/feed/posts?query=&category=&cursor=&limit=`
- `POST /v1/users/me/saved-posts` body `{ "postId": "..." }`
- `DELETE /v1/users/me/saved-posts/{postId}`

Response fields needed:
- `id`, `category`, `title`, `summary`, `sourceName`, `sourceLogoUrl`, `publishedAt`, `thumbnailUrl`
- viewer state: `authenticated`, `saved`

### 2.2 Browse Jobs Listing
UI behavior observed:
- Search jobs (`Search for jobs in Japan...`).
- Filter chips: location, TG sector, salary.
- Tabs: `Browse Jobs`, `My Jobs`.
- Job cards with verification badge, location, sector, salary, posted age.
- Bookmark icon per card.

Required endpoints:
- `GET /v1/jobs?query=&location=&sector=&salaryMin=&salaryMax=&cursor=&limit=`
- `GET /v1/users/me/jobs?tab=MY_JOBS&cursor=&limit=`
- `POST /v1/users/me/saved-jobs` body `{ "jobId": "..." }`
- `DELETE /v1/users/me/saved-jobs/{jobId}`

Response fields needed:
- `id`, `title`, `employer.name`, `employer.logoUrl`, `employer.isVerifiedEmployer`
- `locationLabel`, `sectorLabel`, `salaryLabel`, `postedAt`
- viewer state: `bookmarked`

### 2.3 Job Detail View
UI behavior observed:
- Show detail content, requirements list, map preview.
- Bookmark at top right.
- Guest CTA: `Login to apply`.

Required endpoints:
- `GET /v1/jobs/{jobId}`
- `POST /v1/users/me/saved-jobs`
- `DELETE /v1/users/me/saved-jobs/{jobId}`
- `POST /v1/jobs/{jobId}/applications`

Response fields needed:
- `title`, `description`, `requirements[]`
- `employmentType`, `visaSponsorship`
- `location { city, countryCode, displayLabel, latitude, longitude, mapPreviewUrl }`
- `employer { name, logoUrl, isVerifiedEmployer, verificationStatus }`
- viewer state: `authenticated`, `bookmarked`, `canApply`, `applyAction`

### 2.4 Application Journey Tracker
UI behavior observed:
- Current step (`Step 3 of 5`), current phase text.
- Timeline with completed/current/pending milestones.
- Recent updates list.

Required endpoints:
- `GET /v1/users/me/applications?status=ACTIVE&cursor=&limit=`
- `GET /v1/users/me/applications/{applicationId}/journey`

Response fields needed:
- `application { id, jobTitle, employerName, locationLabel, status }`
- `journey { currentStep, totalSteps, currentPhase, currentPhaseDescription, estimatedCompletionDate }`
- `timeline[] { stepNo, title, state, timestamp, detail }`
- `recentUpdates[] { id, type, title, timestamp }`

### 2.5 User Profile & KYC
UI behavior observed:
- Profile card (name, avatar, trust score, verification status).
- Profile completion progress (%).
- Verification document checklist (verified/pending/missing).
- Upload action and final verification CTA.

Required endpoints:
- `GET /v1/users/me/profile`
- `PATCH /v1/users/me/profile`
- `GET /v1/users/me/verification-documents`
- `POST /v1/identity/kyc/upload-url`
- `POST /v1/identity/kyc/documents`
- `POST /v1/identity/kyc/sessions/{sessionId}/submit`
- `POST /v1/users/me/verification/final-request`

Response fields needed:
- `profileCompletionPercent`
- `trustScoreLabel`, `verificationStatus`
- `documents[] { documentType, status, required, uploadedAt, reviewedAt }`

## 3. API Gaps vs Current Runtime
Already available in runtime (v0):
- Auth core (`register/login/refresh/logout/me`)
- KYC core (`sessions/upload-url/documents/submit/status/history`)
- Admin KYC review queue/decision

New domains needed for these screens:
- Feed/content domain
- Jobs catalog domain
- Saved items domain (`saved-jobs`, `saved-posts`)
- Job applications + journey tracking domain
- Profile completion aggregation endpoint

## 4. Proposed Data Model Additions
- `feed_posts`
- `saved_posts`
- `employers`
- `employer_verifications`
- `jobs`
- `job_requirements`
- `saved_jobs`
- `job_applications`
- `application_journey_events`
- `user_profile_metrics` (or computed view)

## 5. Security & Access Rules
- Public (guest): `GET /v1/feed/posts`, `GET /v1/jobs`, `GET /v1/jobs/{jobId}`
- Auth required: all `users/me/*`, save/bookmark, apply, journey tracker, profile endpoints
- Admin required: KYC moderation endpoints (already existing)

## 6. Delivery Plan (API)

### Wave 1: Jobs Discovery + Detail
- Build `GET /v1/jobs`, `GET /v1/jobs/{jobId}`
- Add save/unsave jobs
- Add employer verification badge fields

### Wave 2: Apply + Journey
- Build `POST /v1/jobs/{jobId}/applications`
- Build journey endpoints (`/applications/{id}/journey`)

### Wave 3: Feed + Saved Posts
- Build feed list endpoint and filters
- Add save/unsave post endpoints

### Wave 4: Profile Completion Aggregation
- Build `GET /v1/users/me/profile`
- Build verification document checklist endpoint
- Wire final verification request endpoint

## 7. Contract Rules
- Semua endpoint baru harus masuk ke `docs/architecture/openapi-runtime-v0.yaml`.
- Perubahan status/enum wajib update `docs/architecture/API-IMPLEMENTATION-STATUS-v0.md`.
- Semua endpoint action (`save`, `apply`, `final-request`) harus idempotent atau punya idempotency key.

## 8. Acceptance Criteria
- UI dari 5 flow ini bisa render penuh dari response API tanpa hardcoded data.
- Guest vs authenticated CTA behavior konsisten (`Login to save` / `Login to apply`).
- Save/unsave state sinkron lintas listing dan detail.
- Journey timeline merefleksikan status backend yang sama dengan admin actions.
