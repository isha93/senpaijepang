#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

API_PORT="${SMOKE_API_PORT:-4100}"
SMOKE_BASE_URL="${SMOKE_BASE_URL:-http://127.0.0.1:${API_PORT}}"
SMOKE_ADMIN_KEY="${SMOKE_ADMIN_KEY:-smoke-admin-key}"
SMOKE_POSTGRES_PORT="${SMOKE_POSTGRES_PORT:-55432}"
DB_NAME="${POSTGRES_DB:-senpaijepang}"
DB_USER="${POSTGRES_USER:-senpai}"
DB_PASSWORD="${POSTGRES_PASSWORD:-senpai_dev_pass}"
SMOKE_DATABASE_URL="${SMOKE_DATABASE_URL:-postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${SMOKE_POSTGRES_PORT}/${DB_NAME}}"

echo "[smoke] docker compose up -d (postgres host port ${SMOKE_POSTGRES_PORT})"
POSTGRES_PORT="${SMOKE_POSTGRES_PORT}" docker compose up -d

echo "[smoke] wait for postgres"
POSTGRES_READY="false"
for _ in {1..30}; do
  if POSTGRES_PORT="${SMOKE_POSTGRES_PORT}" docker compose exec -T postgres pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; then
    POSTGRES_READY="true"
    break
  fi
  sleep 1
done

if [[ "${POSTGRES_READY}" != "true" ]]; then
  echo "[smoke] postgres did not become ready in time"
  exit 1
fi

echo "[smoke] run migrations"
DATABASE_URL="${SMOKE_DATABASE_URL}" npm run migrate:api

echo "[smoke] start api on ${API_PORT} (postgres + s3/minio)"
API_PORT="${API_PORT}" \
DATABASE_URL="${SMOKE_DATABASE_URL}" \
AUTH_STORE=postgres \
OBJECT_STORAGE_PROVIDER=s3 \
OBJECT_STORAGE_ENDPOINT="${OBJECT_STORAGE_ENDPOINT:-http://localhost:9000}" \
OBJECT_STORAGE_ACCESS_KEY_ID="${OBJECT_STORAGE_ACCESS_KEY_ID:-minio}" \
OBJECT_STORAGE_SECRET_ACCESS_KEY="${OBJECT_STORAGE_SECRET_ACCESS_KEY:-minio123}" \
OBJECT_STORAGE_FORCE_PATH_STYLE="${OBJECT_STORAGE_FORCE_PATH_STYLE:-true}" \
OBJECT_STORAGE_BUCKET="${OBJECT_STORAGE_BUCKET:-senpaijepang-kyc}" \
ADMIN_API_KEY="${SMOKE_ADMIN_KEY}" \
AUTH_TOKEN_SECRET="${AUTH_TOKEN_SECRET:-smoke-secret}" \
LOG_LEVEL="${LOG_LEVEL:-error}" \
npm run start -w @senpaijepang/api >/tmp/senpai-api-smoke.log 2>&1 &
API_PID=$!

cleanup() {
  kill "$API_PID" >/dev/null 2>&1 || true
  wait "$API_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

sleep 3

echo "[smoke] run endpoint flow checks"
SMOKE_BASE_URL="${SMOKE_BASE_URL}" SMOKE_ADMIN_KEY="${SMOKE_ADMIN_KEY}" node scripts/smoke-api-flow.mjs

echo "[smoke] api log tail"
tail -n 40 /tmp/senpai-api-smoke.log || true

echo "[smoke] done"
