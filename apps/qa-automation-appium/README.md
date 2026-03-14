# QA Automation — Appium (iOS + Android)

Appium + WebdriverIO tests for Senpai Jepang mobile apps.

## Prerequisites
- Node.js >= 22
- Appium 2.x (global): `npm i -g appium`
- iOS: Xcode + iOS Simulator
- Android: Android Studio + Emulator

Install drivers:
```bash
appium driver install xcuitest
appium driver install uiautomator2
```

## Install
From repo root:
```bash
npm install -w @senpaijepang/qa-automation-appium
```

## App builds
Place app builds under:
- iOS: `apps/qa-automation-appium/apps/ios/SenpaiJepang.app`
- Android: `apps/qa-automation-appium/apps/android/SenpaiJepang.apk`

## Run (local)
Run iOS:
```bash
PLATFORM=ios IOS_DEVICE_NAME="iPhone 15" IOS_PLATFORM_VERSION=17.5 \
API_BASE_URL=http://127.0.0.1:4000 \
IOS_APP_PATH=apps/qa-automation-appium/apps/ios/SenpaiJepang.app \
npm run test:ios -w @senpaijepang/qa-automation-appium
```

Registration E2E is blocked against production by default. To test the OTP flow, point `API_BASE_URL`
to a non-production backend with short resend cooldown and development OTP exposure enabled.

Run Android:
```bash
PLATFORM=android ANDROID_DEVICE_NAME="Android Emulator" ANDROID_PLATFORM_VERSION=14 \
ANDROID_APP_PATH=apps/qa-automation-appium/apps/android/SenpaiJepang.apk \
npm run test:android -w @senpaijepang/qa-automation-appium
```

## How to use / add tests
1) Add accessibility IDs in app (see `docs/qa/appium/SELECTORS.md`).
2) Create Page Objects under `tests/pageobjects/`.
3) Add specs under `tests/specs/`.
4) Keep smoke tests fast.

## Notes
- Stable selectors depend on accessibility IDs.
- Add screenshots on failure in future batch.
