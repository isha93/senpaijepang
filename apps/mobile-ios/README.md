# SenpaiJepang iOS Scaffold

This directory contains the iOS architecture scaffold based on the agreed style:
- MVVM
- Clean Architecture (without UseCase layer)
- Atomic Design components
- NavigationStack + NavigationManager

## Toolchain and OS policy

Product policy:
- Build with latest stable Xcode line.
- Support iOS deployment target at N-2 from the latest iOS major line.

As of February 28, 2026:
- Latest stable Xcode line: 26.3
- Latest iOS SDK line: 26.x
- Product deployment policy target: iOS 24.x (N-2)

Scaffold compatibility note:
- This Swift Package is pinned to iOS 17 + macOS 15 for local and CI portability in this repository.
- The final app target should be pinned to iOS 24.x when the Xcode app project is generated and built with Xcode 26.x.

## Structure

- `Sources/SenpaiMobileCore/App`: root app-level view wiring sample.
- `Sources/SenpaiMobileCore/Core/Navigation`: `AppRoute`, `NavigationManager`, `NavigationHandling`.
- `Sources/SenpaiMobileCore/Core/Task`: managed async task helper for ViewModels.
- `Sources/SenpaiMobileCore/Components`: Atomic Design (`Atoms`, `Molecules`, `Organisms`).
- `Sources/SenpaiMobileCore/Features`: feature slices (`Auth` sample implemented).
- `Tests/SenpaiMobileCoreTests`: unit tests for navigation and login flow.

## Run tests

```bash
cd /Users/ichsan/Documents/senpaijepang/apps/mobile-ios
swift test
```
