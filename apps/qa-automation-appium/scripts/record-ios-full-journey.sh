#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
QA_DIR="$ROOT_DIR/apps/qa-automation-appium"
APP_DIR="$QA_DIR/apps/ios"
ARTIFACT_DIR="$QA_DIR/artifacts"
VIDEO_DIR="$ARTIFACT_DIR/videos"
LOG_DIR="$ARTIFACT_DIR/logs"
mkdir -p "$APP_DIR" "$VIDEO_DIR" "$LOG_DIR"

DEVICE_NAME="${IOS_DEVICE_NAME:-iPhone 16 Pro}"
IOS_VERSION="${IOS_PLATFORM_VERSION:-18.4}"
API_BASE_URL="${API_BASE_URL:-https://senpai-api-app-production.up.railway.app}"
E2E_ALLOW_PROD_REGISTRATION="${E2E_ALLOW_PROD_REGISTRATION:-true}"
E2E_STATIC_VERIFICATION_CODE="${E2E_STATIC_VERIFICATION_CODE:-777777}"
APP_PATH="$APP_DIR/SenpaiJepang.app"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BUILD_LOG="$LOG_DIR/ios-full-journey-build-$TIMESTAMP.log"
VIDEO_PATH="$VIDEO_DIR/ios-full-journey-$TIMESTAMP.mp4"
SPEC_PATH="./tests/specs/full-journey.spec.js"

if [[ -z "${ADMIN_API_KEY:-}" ]]; then
  echo "ADMIN_API_KEY env is required" >&2
  exit 1
fi

UDID="$(IOS_DEVICE_NAME="$DEVICE_NAME" IOS_PLATFORM_VERSION="$IOS_VERSION" node <<'NODE'
const { execSync } = require('child_process');
const targetName = process.env.IOS_DEVICE_NAME;
const targetVersion = process.env.IOS_PLATFORM_VERSION;
const normalizedVersion = String(targetVersion || '').replace(/\./g, '-');
const payload = JSON.parse(execSync('xcrun simctl list devices --json available', { stdio: ['ignore', 'pipe', 'ignore'] }).toString());
for (const [runtime, devices] of Object.entries(payload.devices || {})) {
  if (!runtime.includes(`iOS-${normalizedVersion}`)) continue;
  const match = (devices || []).find((device) => device.isAvailable !== false && device.name === targetName);
  if (match) {
    process.stdout.write(match.udid);
    process.exit(0);
  }
}
process.exit(1);
NODE
)"

if [[ -z "$UDID" ]]; then
  echo "Unable to resolve simulator UDID for $DEVICE_NAME (iOS $IOS_VERSION)" >&2
  exit 1
fi

cleanup() {
  if [[ -n "${RECORDER_PID:-}" ]]; then
    kill -INT "$RECORDER_PID" >/dev/null 2>&1 || true
    wait "$RECORDER_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

xcrun simctl boot "$UDID" >/dev/null 2>&1 || true
xcrun simctl bootstatus "$UDID" -b
open -a Simulator --args -CurrentDeviceUDID "$UDID" >/dev/null 2>&1 || true

rm -rf "$APP_PATH"
(
  cd "$ROOT_DIR"
  xcodebuild \
    -project apps/mobile-ios/SenpaiJepang.xcodeproj \
    -scheme SenpaiJepang \
    -configuration Debug \
    -sdk iphonesimulator \
    -destination "id=$UDID" \
    CODE_SIGNING_ALLOWED=NO \
    CONFIGURATION_BUILD_DIR="$APP_DIR" \
    build | tee "$BUILD_LOG"
)

xcrun simctl io "$UDID" recordVideo --codec h264 "$VIDEO_PATH" >/dev/null 2>&1 &
RECORDER_PID=$!
sleep 2

(
  cd "$QA_DIR"
  PLATFORM=ios \
  IOS_DEVICE_NAME="$DEVICE_NAME" \
  IOS_PLATFORM_VERSION="$IOS_VERSION" \
  IOS_APP_PATH="$APP_PATH" \
  API_BASE_URL="$API_BASE_URL" \
  E2E_ALLOW_PROD_REGISTRATION="$E2E_ALLOW_PROD_REGISTRATION" \
  E2E_STATIC_VERIFICATION_CODE="$E2E_STATIC_VERIFICATION_CODE" \
  ADMIN_API_KEY="$ADMIN_API_KEY" \
  npm run test:ios -- --spec "$SPEC_PATH"
)

cleanup
trap - EXIT

echo "Video saved to: $VIDEO_PATH"
echo "Build log saved to: $BUILD_LOG"
