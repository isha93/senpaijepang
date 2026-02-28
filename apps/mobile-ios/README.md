<p align="center">
  <img src="https://img.shields.io/badge/Platform-iOS_17+-000000?style=for-the-badge&logo=apple&logoColor=white" alt="iOS 17+" />
  <img src="https://img.shields.io/badge/Swift-6.0-FA7343?style=for-the-badge&logo=swift&logoColor=white" alt="Swift 6.0" />
  <img src="https://img.shields.io/badge/SwiftUI-4.0-0D96F6?style=for-the-badge&logo=swift&logoColor=white" alt="SwiftUI" />
  <img src="https://img.shields.io/badge/Architecture-MVVM_Clean-8B5CF6?style=for-the-badge" alt="MVVM Clean" />
  <img src="https://img.shields.io/badge/License-Private-EF4444?style=for-the-badge" alt="Private" />
</p>

<h1 align="center">
  🇯🇵 SenpaiJepang iOS
</h1>

<p align="center">
  <strong>Your gateway to working in Japan — built with modern Swift & SwiftUI.</strong>
  <br />
  <sub>MVVM · Clean Architecture · Atomic Design · NavigationStack</sub>
</p>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Feature Modules](#-feature-modules)
- [Component Library (Atomic Design)](#-component-library-atomic-design)
- [Navigation System](#-navigation-system)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Testing](#-testing)
- [CI/CD](#-cicd)
- [Contributing](#-contributing)

---

## 🌏 Overview

**SenpaiJepang** is a native iOS application that helps job seekers discover, apply for, and track employment opportunities in Japan. The app provides a seamless experience for browsing job listings, managing application journeys, building professional profiles, and engaging with community feeds.

### Key Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | Login, registration, and session restore |
| 💼 **Job Discovery** | Browse, search, filter, and save job listings |
| 🗺️ **Application Journey** | Apply to jobs and track your application timeline |
| 👤 **Profile** | Build your professional profile and verification status |
| 📰 **Feed** | Community posts, tips, and saved content |

---

## 🏗️ Architecture

The project follows a **MVVM + Clean Architecture** pattern (without UseCase layer for MVP simplicity) combined with **Atomic Design** for reusable UI components.

### High-Level Architecture

```mermaid
graph TB
    subgraph Presentation["🎨 Presentation Layer"]
        V["SwiftUI Views"]
        VM["ViewModels<br/><code>@MainActor</code>"]
        V <-->|"state & actions"| VM
    end

    subgraph Domain["📐 Domain Layer"]
        SP["Service Protocols"]
        DM["Domain Models"]
    end

    subgraph Data["💾 Data Layer"]
        SI["Service Implementations"]
        AC["API Client"]
        DTO["DTOs & Mappers"]
    end

    subgraph Core["⚙️ Core Layer"]
        NAV["Navigation Manager"]
        TH["Theme System"]
        TK["Task Manager"]
    end

    VM -->|"depends on"| SP
    SP -->|"defines"| DM
    SI -->|"implements"| SP
    SI --> AC
    SI --> DTO
    DTO -->|"maps to"| DM
    AC --> Core
    NAV --> Core
    TH --> Core
    TK --> Core

    style Presentation fill:#818cf8,stroke:#6366f1,color:#fff
    style Domain fill:#34d399,stroke:#10b981,color:#fff
    style Data fill:#fbbf24,stroke:#f59e0b,color:#000
    style Core fill:#f87171,stroke:#ef4444,color:#fff
```

### Dependency Rule

```mermaid
graph LR
    A["Presentation"] -->|depends on| B["Domain"]
    B -->|depends on| C["Data"]
    C -->|depends on| D["Core"]

    style A fill:#818cf8,stroke:#6366f1,color:#fff
    style B fill:#34d399,stroke:#10b981,color:#fff
    style C fill:#fbbf24,stroke:#f59e0b,color:#000
    style D fill:#f87171,stroke:#ef4444,color:#fff
```

> **📌 Why no UseCase layer?**
> For MVP, UseCase is intentionally skipped to keep the flow fast and file count minimal.
> Domain logic stays clean in Service + Protocol. When cross-domain complexity grows,
> use cases can be introduced incrementally.

---

## 📁 Project Structure

```
apps/mobile-ios/
├── 📦 Package.swift                    # SPM manifest (SenpaiMobileCore library)
├── 📋 project.yml                      # XcodeGen project spec
├── 📱 SenpaiJepang.xcodeproj/          # Generated Xcode project
├── 📄 Info.plist                       # App configuration
│
├── Sources/
│   ├── SenpaiJepangApp/                # 🎯 iOS App Target
│   │   ├── SenpaiJepangApp.swift       #    App entry point (@main)
│   │   ├── App/
│   │   │   ├── AppRootView.swift       #    Root NavigationStack wiring
│   │   │   └── MainTabView.swift       #    Tab bar controller
│   │   ├── Core/
│   │   │   ├── Navigation/             #    🧭 AppRoute, NavigationManager
│   │   │   ├── Task/                   #    ⏳ ManagedTask async helper
│   │   │   └── Theme/                  #    🎨 AppTheme design tokens
│   │   ├── Components/
│   │   │   ├── Atoms/                  #    ⚛️  Smallest UI building blocks
│   │   │   ├── Molecules/              #    🧬 Composed UI patterns
│   │   │   └── Organisms/              #    🏛️  Screen-ready sections
│   │   └── Features/
│   │       ├── Auth/                   #    🔐 Login flow
│   │       ├── Jobs/                   #    💼 Job discovery & bookmarks
│   │       ├── Journey/                #    🗺️  Application tracking
│   │       ├── Profile/                #    👤 User profile
│   │       └── Feed/                   #    📰 Community feed
│   │
│   └── SenpaiMobileCore/              # 📚 Shared Core Library
│       └── (mirrors App structure)     #    Reusable across targets
│
└── Tests/
    └── SenpaiMobileCoreTests/          # ✅ Unit tests
        ├── LoginViewModelTests.swift
        └── NavigationManagerTests.swift
```

---

## 🧩 Feature Modules

Each feature follows a consistent **Clean Architecture** structure:

```mermaid
graph LR
    subgraph Feature["Feature Module"]
        direction TB
        subgraph P["📱 Presentation"]
            View["View<br/><sub>SwiftUI</sub>"]
            ViewModel["ViewModel<br/><sub>@MainActor</sub>"]
        end
        subgraph Do["📐 Domain"]
            Proto["Service Protocol"]
        end
        subgraph Da["💾 Data"]
            Impl["Service Implementation"]
        end
    end

    View <--> ViewModel
    ViewModel -->|"uses"| Proto
    Impl -->|"conforms to"| Proto

    style P fill:#818cf8,stroke:#6366f1,color:#fff
    style Do fill:#34d399,stroke:#10b981,color:#fff
    style Da fill:#fbbf24,stroke:#f59e0b,color:#000
```

### Feature Breakdown

| Module | Views | ViewModels | Service Protocol | Service Impl |
|--------|-------|------------|-----------------|--------------|
| **Auth** | `LoginView` | `LoginViewModel` | `AuthServiceProtocol` | `AuthService` |
| **Jobs** | `JobsListView` · `JobDetailView` · `SavedJobsView` | `JobsListViewModel` · `JobDetailViewModel` · `SavedJobsViewModel` | `JobServiceProtocol` | `JobService` |
| **Journey** | `ApplicationJourneyView` | `ApplicationJourneyViewModel` | `JourneyServiceProtocol` | `JourneyService` |
| **Profile** | `ProfileView` | `ProfileViewModel` | `ProfileServiceProtocol` | `ProfileService` |
| **Feed** | `FeedListView` | `FeedListViewModel` | `FeedServiceProtocol` | `FeedService` |

---

## 🎨 Component Library (Atomic Design)

The UI component library follows **Atomic Design** principles for maximum reusability.

```mermaid
graph BT
    subgraph Atoms["⚛️ Atoms"]
        A1["BadgePill"]
        A2["PrimaryButton"]
        A3["SearchBar"]
        A4["CategoryFilterRow"]
    end

    subgraph Molecules["🧬 Molecules"]
        M1["JobCard"]
        M2["FeedPostCard"]
        M3["DocumentRow"]
        M4["MetaChipRow"]
        M5["TimelineStepRow"]
    end

    subgraph Organisms["🏛️ Organisms"]
        O1["JobSummarySection"]
    end

    Atoms -->|"compose into"| Molecules
    Molecules -->|"compose into"| Organisms

    style Atoms fill:#bfdbfe,stroke:#3b82f6,color:#1e3a5f
    style Molecules fill:#bbf7d0,stroke:#22c55e,color:#14532d
    style Organisms fill:#fde68a,stroke:#eab308,color:#713f12
```

### Design Rules

- 🚫 **No API calls** from Atoms, Molecules, or Organisms
- 🎨 **Consistent styling** via `Core/Theme/AppTheme`
- ♻️ **Cross-feature** — components are shared, not duplicated

---

## 🧭 Navigation System

Centralized navigation powered by `NavigationStack` and a single `NavigationManager` as the source of truth.

```mermaid
stateDiagram-v2
    [*] --> Login

    Login --> MainTabs : login success<br/>(replace)
    MainTabs --> JobDetail : tap card<br/>(push)
    MainTabs --> SavedJobs : tap saved<br/>(push)
    MainTabs --> Journey : tap apply<br/>(push)
    JobDetail --> MainTabs : back<br/>(pop)
    SavedJobs --> MainTabs : back<br/>(pop)
    Journey --> MainTabs : back<br/>(pop)

    state MainTabs {
        [*] --> Jobs
        Jobs --> Feed
        Feed --> Profile
        Profile --> Jobs
    }
```

### App Routes

```swift
enum AppRoute: Hashable {
    case login
    case jobsList
    case jobDetail(jobId: String)
    case savedJobs
    case profile
    case applicationJourney(applicationId: String)
}
```

### Navigation Architecture

```mermaid
sequenceDiagram
    participant V as View
    participant VM as ViewModel
    participant NH as NavigationHandling<br/>(Protocol)
    participant NM as NavigationManager

    V->>VM: User Action
    VM->>NH: push / replace / popToRoot
    NH->>NM: Mutate path
    NM-->>V: @Published path update
    Note over V: NavigationStack re-renders
```

> ViewModels use the `NavigationHandling` protocol for testability —
> they never depend on `NavigationManager` directly.

---

## ⚡ Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Language | Swift | 6.0 |
| UI Framework | SwiftUI | 4.0+ |
| Min Deployment | iOS | 17.0 |
| Architecture | MVVM + Clean | — |
| UI Pattern | Atomic Design | — |
| Navigation | NavigationStack | — |
| Package Manager | Swift Package Manager | — |
| Project Gen | XcodeGen | latest |
| IDE | Xcode | 16.2+ |
| Concurrency | Swift Concurrency | `@MainActor` / `async-await` |

---

## 🚀 Getting Started

### Prerequisites

- macOS with **Xcode 16.2+** installed
- Node.js/NPM *(only if running via monorepo workspace)*

### Run in Xcode

```bash
# Open the project
open SenpaiJepang.xcodeproj

# Then in Xcode:
# 1. Select scheme "SenpaiJepang"
# 2. Pick an iOS Simulator
# 3. Press ⌘R
```

### Build from CLI

```bash
xcodebuild \
  -project SenpaiJepang.xcodeproj \
  -scheme SenpaiJepang \
  -destination 'generic/platform=iOS Simulator' \
  build
```

### Regenerate Project (after `project.yml` changes)

```bash
# Install XcodeGen if needed
brew install xcodegen

# Regenerate
xcodegen generate --spec project.yml
```

---

## ✅ Testing

### Run Unit Tests

```bash
# Via Swift Package Manager
swift test --package-path .

# Via monorepo workspace
npm run test:ios -w @senpaijepang/mobile-ios
```

### Test Coverage

| Module | Tests |
|--------|-------|
| `NavigationManager` | ✅ Route push/pop/replace |
| `LoginViewModel` | ✅ Login flow, validation, navigation |

### Testing Strategy

```mermaid
graph TD
    UT["🧪 Unit Tests"] --> VM["ViewModel Tests<br/><sub>Mock Service + Mock Nav</sub>"]
    UT --> SVC["Service Tests<br/><sub>Protocol-based Mocks</sub>"]
    UT --> NAV["Navigation Tests<br/><sub>Route validation</sub>"]

    style UT fill:#818cf8,stroke:#6366f1,color:#fff
    style VM fill:#34d399,stroke:#10b981,color:#fff
    style SVC fill:#fbbf24,stroke:#f59e0b,color:#000
    style NAV fill:#f87171,stroke:#ef4444,color:#fff
```

> ⚠️ **Known Limitation:** `swift test` may fail on macOS due to iOS-only
> `ToolbarItemPlacement` values (`.topBarLeading`, `.topBarTrailing`).
> For stable validation, use Xcode Simulator builds.

---

## 🔄 CI/CD

### Continuous Integration

```mermaid
graph LR
    PR["Pull Request"] --> CI["GitHub Actions"]
    CI --> XCODE["Setup Xcode<br/><sub>latest-stable</sub>"]
    XCODE --> TEST["swift test"]
    TEST --> PASS{"✅ Pass?"}
    PASS -->|Yes| MERGE["Ready to Merge"]
    PASS -->|No| FIX["🔴 Fix Required"]

    style PR fill:#818cf8,stroke:#6366f1,color:#fff
    style CI fill:#34d399,stroke:#10b981,color:#fff
    style XCODE fill:#fbbf24,stroke:#f59e0b,color:#000
    style TEST fill:#f87171,stroke:#ef4444,color:#fff
    style MERGE fill:#22c55e,stroke:#16a34a,color:#fff
    style FIX fill:#ef4444,stroke:#dc2626,color:#fff
```

| Config | Value |
|--------|-------|
| Workflow | `.github/workflows/ios-ci.yml` |
| Runner | `macos-latest` |
| Xcode | `latest-stable` (via `maxim-lobanov/setup-xcode`) |

### Deployment (Next Phase)

TestFlight build & release pipeline will be configured after:
- Bundle ID, signing, and provisioning are finalized
- API reaches Release Candidate milestone

---

## 🤝 Contributing

### Code Conventions

1. **ViewModel** must depend on **protocols**, never concrete services
2. All reusable UI goes into `Components/Atoms|Molecules|Organisms`
3. No `UseCase` layer in MVP — domain logic stays in Services
4. All navigation actions go through `NavigationHandling` protocol
5. `@MainActor` on all ViewModels for thread safety

### Adding a New Feature

```mermaid
graph TD
    A["1️⃣ Create Feature Folder"] --> B["2️⃣ Define Service Protocol<br/><sub>Domain/Service/</sub>"]
    B --> C["3️⃣ Implement Service<br/><sub>Data/Service/</sub>"]
    C --> D["4️⃣ Create ViewModel<br/><sub>Presentation/ViewModel/</sub>"]
    D --> E["5️⃣ Build View<br/><sub>Presentation/View/</sub>"]
    E --> F["6️⃣ Add Route to AppRoute"]
    F --> G["7️⃣ Wire in AppRootView"]
    G --> H["8️⃣ Write Unit Tests"]

    style A fill:#818cf8,stroke:#6366f1,color:#fff
    style B fill:#34d399,stroke:#10b981,color:#fff
    style C fill:#fbbf24,stroke:#f59e0b,color:#000
    style D fill:#818cf8,stroke:#6366f1,color:#fff
    style E fill:#818cf8,stroke:#6366f1,color:#fff
    style F fill:#f87171,stroke:#ef4444,color:#fff
    style G fill:#f87171,stroke:#ef4444,color:#fff
    style H fill:#34d399,stroke:#10b981,color:#fff
```

---

## 📋 Version Policy

| Policy | Value |
|--------|-------|
| iOS Deployment Target | `N-2` from latest iOS major |
| Xcode | Latest stable |
| Swift Package Platform | iOS 17+ / macOS 15+ |

---

## 📚 Further Reading

- [iOS Architecture MVVM Clean v1](../../docs/architecture/IOS-ARCHITECTURE-MVVM-CLEAN-v1.md)

---

<p align="center">
  <sub>Built with ❤️ by the SenpaiJepang Team</sub>
  <br />
  <sub>Swift 6.0 · SwiftUI · MVVM Clean Architecture · Atomic Design</sub>
</p>
