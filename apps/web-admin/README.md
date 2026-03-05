# Web Admin Dashboard (React)

Internal dashboard MVP for SenpaiJepang Ops/Admin workflows.

## Run

```bash
npm install
npm run dev:web-admin
```

## Environment

- `VITE_API_BASE_URL` (optional)
  - Empty value means same-origin requests.
  - Example: `https://senpai-api-app-production.up.railway.app`
- `VITE_ADMIN_API_KEY` (optional fallback only)
  - Sent as `x-admin-api-key` to `/admin/*` endpoints.
  - Primary mode is Bearer token admin login (`/auth/login`), key dipakai hanya untuk bootstrap/compatibility.
  - Keep this only in trusted internal admin environment.

For quick local login/testing, backend can auto-create:
- `BOOTSTRAP_ADMIN_EMAIL=admin@senpaijepang.com`
- `BOOTSTRAP_ADMIN_PASSWORD=Admin12345`
- `BOOTSTRAP_ADMIN_FULL_NAME=Admin Senpai`

## API-backed screens

- `/overview` -> `/health`, `/metrics`, `/admin/overview/summary`, `/admin/activity-events`
- `/kyc-review` -> `/admin/kyc/review-queue`, `/admin/kyc/review`
- `/applications` -> `/admin/applications`, `PATCH /admin/applications/{applicationId}/status`
- `/feed` -> `/admin/feed/posts`, `/feed/posts`
- `/jobs` -> `/admin/jobs`
- `/organizations` -> `/admin/organizations`, `PATCH /admin/organizations/{orgId}/verification`
- `/system` -> `/health`, `/metrics`, `/admin/users`, `PATCH /admin/users/{userId}`

KYC review queue supports cursor pagination via `cursor` + `limit` query params and returns `pageInfo`.

## Contract Note

- Gunakan runtime contract: `docs/architecture/openapi-runtime-v0.yaml`.
- Prefix `/v1/*` tetap didukung sebagai alias kompatibilitas.
- Endpoint target future seperti `/v1/admin/cases` tidak dipakai oleh dashboard runtime saat ini.
