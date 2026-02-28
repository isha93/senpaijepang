# iOS Architecture MVVM Clean (No UseCase) v1

Date: 2026-02-28  
Status: Locked Blueprint (Execution Deferred until API RC)

## 1. Decision Lock (Disepakati)

Stack iOS untuk SenpaiJepang mengikuti style project referensi kamu:

- `SwiftUI` + `Swift` (native iOS).
- `MVVM` sebagai pola presentation.
- `Clean Architecture` ringan **tanpa layer UseCase**.
- `Atomic Design` untuk komponen UI reusable.
- `NavigationStack` dengan satu `NavigationManager` sebagai source of truth navigasi.

## 2. Arsitektur Inti

Kita pakai 4 lapisan praktis:

1. `Presentation`
- SwiftUI Views + ViewModel (`@MainActor`, state-driven).
- View hanya render state dan kirim user action.

2. `Domain`
- `Service Protocol` + domain model.
- Tidak ada `UseCase` folder/layer.

3. `Data`
- Implementasi service, API client, DTO, mapper.
- Transformasi DTO -> domain model ada di layer ini.

4. `Core`
- Networking base, storage, keychain, logger, constants, theme, navigation manager.

Dependency rule:
- `Presentation -> Domain -> Data -> Core`
- `Core` tidak bergantung pada `Features`.
- ViewModel hanya bergantung ke protocol, bukan concrete service.

## 3. Kenapa Tanpa UseCase

Untuk MVP ini, `UseCase` sengaja tidak dipakai agar:

- flow implementasi lebih cepat,
- jumlah file tidak meledak,
- domain logic tetap rapi di service + protocol.

Guardrail:
- Jika logic sebuah aksi sudah kompleks/lintas domain, baru boleh diekstrak jadi use case terpisah pada fase scale berikutnya.

## 4. Struktur Folder (Target)

```text
apps/mobile-ios/
  Package.swift
  Sources/SenpaiMobileCore/
    App/
      AppRootView.swift
    Core/
      Navigation/
        AppRoute.swift
        NavigationManager.swift
        NavigationHandling.swift
      Task/
        ManagedTask.swift
    Components/
      Atoms/
      Molecules/
      Organisms/
    Features/
      Auth/
        Domain/Service/
        Data/Service/
        Presentation/ViewModel/
        Presentation/View/
      Jobs/
      Journey/
      Profile/
      Feed/
  Tests/SenpaiMobileCoreTests/
```

Catatan:
- Tidak ada folder `UseCase`.
- `Components` bersifat cross-feature (Atomic Design).

## 5. Atomic Design Rules

1. `Atoms`
- Komponen paling kecil, tidak punya business logic.
- Contoh: button, pill badge, icon label, text field style.

2. `Molecules`
- Gabungan 2-5 atom untuk pola UI spesifik.
- Contoh: row chip metadata, header employer, input block.

3. `Organisms`
- Section/komponen besar siap dipakai di screen.
- Contoh: job detail card, requirement list, map preview section.

Rule:
- Tidak ada call API langsung dari `Atoms/Molecules/Organisms`.
- Styling konsisten lewat `Core/Theme`.

## 6. NavigationStack + NavigationManager

### 6.1 Route tunggal

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

### 6.2 NavigationManager

```swift
import Combine
import Foundation

@MainActor
final class NavigationManager: ObservableObject {
    @Published private(set) var path: [AppRoute] = []

    func push(_ route: AppRoute) {
        path.append(route)
    }

    func pop() {
        guard !path.isEmpty else { return }
        path.removeLast()
    }

    func popToRoot() {
        path.removeAll()
    }

    func replace(with route: AppRoute) {
        path = [route]
    }

    func sync(path newPath: [AppRoute]) {
        path = newPath
    }
}
```

### 6.3 Root wiring

```swift
struct AppRootView: View {
    @StateObject private var nav = NavigationManager()

    var body: some View {
        NavigationStack(
            path: Binding(
                get: { nav.path },
                set: { nav.sync(path: $0) }
            )
        ) {
            LoginView()
                .navigationDestination(for: AppRoute.self) { route in
                    switch route {
                    case .login: LoginView()
                    case .jobsList: JobsListView()
                    case .jobDetail(let jobId): JobDetailView(jobId: jobId)
                    case .savedJobs: SavedJobsView()
                    case .profile: ProfileView()
                    case .applicationJourney(let id): ApplicationJourneyView(applicationId: id)
                    }
                }
        }
        .environmentObject(nav)
    }
}
```

## 7. Rule Navigasi untuk ViewModel

Supaya testable dan tidak hard-coupled ke SwiftUI:

- ViewModel gunakan protocol `NavigationHandling`.
- `NavigationManager` implement protocol tersebut.
- ViewModel trigger intent (`push`, `replace`, `popToRoot`) via protocol.

Contoh:
- login sukses -> `replace(with: .jobsList)`
- tap job card -> `push(.jobDetail(jobId: ...))`

## 8. Mapping ke Screen SenpaiJepang

Minimal feature awal:

1. `Auth`
- Login/Register basic + session restore.

2. `Jobs`
- List jobs, detail jobs, save/unsave.

3. `Journey`
- Apply job + status timeline.

4. `Profile`
- Profile completion + verification status.

5. `Feed`
- Feed list + save post.

## 9. Testing Standard

- Unit test wajib untuk ViewModel dan Service.
- Mock service berbasis protocol.
- Mock navigation handler untuk validasi route action.
- Snapshot/UI test opsional di fase awal, wajib saat pre-release.

## 10. Definition of Done (iOS Architecture)

Done jika:

1. Struktur folder mengikuti blueprint di atas.
2. Semua flow pakai `NavigationStack + NavigationManager`.
3. Tidak ada `UseCase` layer baru di MVP.
4. ViewModel tidak tergantung concrete service/network class.
5. Komponen reusable masuk `Components/Atoms|Molecules|Organisms`.

## 11. Version and Deployment Policy

Policy:

1. Build and release pakai Xcode stable terbaru.
2. Deployment target iOS pakai model `N-2` dari major iOS terbaru.

Reference lock (checked on 2026-02-28):
- Xcode stable line: `26.3`
- iOS SDK line: `26.x`
- Deployment policy target: `iOS 24.x` (N-2)
- Source:
  - `https://developer.apple.com/support/xcode`
  - `https://developer.apple.com/news/releases/`

Implementasi di repo saat ini:
- iOS scaffold package dikompilasi dengan baseline kompatibel (`iOS 17 + macOS 15`) untuk menjaga local/CI portability.
- Saat app Xcode target final dibuat, deployment target dinaikkan mengikuti policy `N-2`.

## 12. CI/CD Baseline

CI iOS:
- Workflow: `.github/workflows/ios-ci.yml`
- Runner: `macos-latest`
- Xcode: `latest-stable` via `maxim-lobanov/setup-xcode@v1`
- Check utama: `swift test --package-path apps/mobile-ios`

CD iOS (next phase):
- Build archive + TestFlight release disiapkan setelah project app Xcode final (target, bundle id, signing, and provisioning) sudah dikunci.

## 13. Execution Timing

- Dokumen ini adalah lock arsitektur iOS.
- Implementasi fitur iOS dijalankan **setelah** gate API release candidate terpenuhi.
- Referensi urutan delivery: `docs/architecture/EXECUTION-LOCK-API-FIRST-v1.md`.
