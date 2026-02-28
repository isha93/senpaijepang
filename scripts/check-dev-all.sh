#!/usr/bin/env bash

set -euo pipefail

cleanup() {
  npm run stop:all >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "[check:dev-all] starting orchestrated services"
npm run dev:all

echo "[check:dev-all] probing endpoints"
curl -fsS http://localhost:3001 >/dev/null
curl -fsS http://localhost:4000/health >/dev/null

echo "[check:dev-all] DEV_ALL_CHECK_OK"
