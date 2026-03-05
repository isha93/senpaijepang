# BE Test Run — Production (Smoke)

- Date: 2026-03-05
- Environment: Production
- Base URL: `https://senpai-api-app-production.up.railway.app`
- Scope baseline: `docs/architecture/openapi-runtime-v0.yaml` (dengan alias `/v1/*`)

## Summary

| Check | Result | Notes |
|---|---|---|
| `GET /health` | ✅ 200 | OK |
| `GET /v1/health` | ✅ 200 | Alias v1 berjalan |
| `POST /v1/auth/login` (SDM) | ✅ 200 | Token issued |
| `POST /v1/auth/login` (Admin) | ✅ 200 | Token issued |
| `GET /v1/identity/kyc/status` | ✅ 200 | Status awal `NOT_STARTED` |
| `GET /v1/jobs` | ✅ 200 | List jobs muncul |
| `GET /v1/trust/profile` | ❌ 404 | Bukan route runtime v0 |
| `GET /v1/admin/cases` | ❌ 404 | Bukan route runtime v0 |

## Route Correction (Runtime v0)

| Tested path (404) | Runtime path yang benar |
|---|---|
| `/v1/trust/profile` | `/v1/users/me/profile` |
| `/v1/admin/cases` | `/v1/admin/kyc/review-queue` |
| `/v1/admin/cases/{caseId}/action` | `/v1/admin/kyc/review` |

## Validation Notes

- `openapi-v1.yaml` berisi target contract future state.
- Smoke production saat ini harus mengacu ke `openapi-runtime-v0.yaml`.
- Prefix `/v1` adalah alias kompatibilitas; route canonical di server tetap unversioned runtime path.

## Recommended Next Smoke Batch

1. Profile runtime: `GET/PATCH /v1/users/me/profile`
2. Application flow: `POST /v1/jobs/{jobId}/applications` + `GET /v1/users/me/applications`
3. Admin queue flow: `GET /v1/admin/kyc/review-queue` + `POST /v1/admin/kyc/review`
4. Admin ops flow: `/v1/admin/overview/summary`, `/v1/admin/activity-events`, `/v1/admin/applications`
