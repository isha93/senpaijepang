# Appium QA Automation Plan — Senpai Jepang

## Goal
Cross-platform UI automation for iOS + Android using Appium + WebdriverIO (JS).

## Scope (Phase 1: Smoke)
- Auth (login/invalid login)
- Jobs list + job detail
- Feed list
- Profile view

## Phase 2 (Regression)
- Save/unsave job
- Apply job
- Saved posts
- Edit profile

## Test Design
- Page Object Model
- Stable selectors via accessibility IDs
- Data-driven inputs (fixtures)

## CI
- GitHub Actions (manual + nightly)
- Store app builds as artifacts or fetch from CI build job

## Ownership
- QA + Mobile (iOS/Android)
