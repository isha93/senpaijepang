#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Skipping iOS simulator smoke build: requires macOS + Xcode."
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

xcodebuild \
  -project "${PROJECT_ROOT}/SenpaiJepang.xcodeproj" \
  -scheme "SenpaiJepang" \
  -configuration Debug \
  -destination "generic/platform=iOS Simulator" \
  CODE_SIGNING_ALLOWED=NO \
  build \
  -quiet

echo "iOS simulator smoke build passed."
