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
- `VITE_ADMIN_API_KEY` (optional but recommended for bootstrap mode)
  - Sent as `x-admin-api-key` to `/admin/*` endpoints.
  - Keep this only in trusted internal admin environment.

For quick local login/testing, backend can auto-create:
- `BOOTSTRAP_ADMIN_EMAIL=admin@senpaijepang.com`
- `BOOTSTRAP_ADMIN_PASSWORD=Admin12345`
- `BOOTSTRAP_ADMIN_FULL_NAME=Admin Senpai`

## API-backed screens

- `/overview` -> `/health`, `/metrics`, `/admin/kyc/review-queue`
- `/kyc-review` -> `/admin/kyc/review-queue`, `/admin/kyc/review`
- `/feed` -> `/admin/feed/posts`, `/feed/posts`
- `/jobs` -> `/admin/jobs`
- `/organizations` -> `/admin/organizations`, `PATCH /admin/organizations/{orgId}/verification`
- `/system` -> `/health`, `/metrics`
