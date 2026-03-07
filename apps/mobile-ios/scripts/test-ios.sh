#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Skipping iOS simulator smoke build: requires macOS + Xcode."
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TEST_DESTINATION="${IOS_TEST_DESTINATION:-}"

if [[ -z "${TEST_DESTINATION}" ]]; then
  TEST_DESTINATION="$(xcrun simctl list devices available | awk -F '[()]' '/Booted/ { print "id="$2; found=1; exit } END { if (!found) exit 1 }' || true)"
fi

if [[ -z "${TEST_DESTINATION}" ]]; then
  TEST_DESTINATION="$(xcrun simctl list devices available | awk -F '[()]' '/iPhone 16 Pro/ && /Shutdown/ { print "id="$2; exit }' || true)"
fi

if [[ -z "${TEST_DESTINATION}" ]]; then
  TEST_DESTINATION="generic/platform=iOS Simulator"
fi

xcodebuild \
  -project "${PROJECT_ROOT}/SenpaiJepang.xcodeproj" \
  -scheme "SenpaiJepang" \
  -configuration Debug \
  -destination "${TEST_DESTINATION}" \
  CODE_SIGNING_ALLOWED=NO \
  test \
  -quiet

echo "iOS simulator unit tests passed."
