# Android Architecture MVVM Clean (No UseCase) v1

Date: 2026-03-05  
Status: Blueprint Locked (Execution per-feature)

## 1. Decision Lock (Disepakati)

Android app SenpaiJepang mengikuti prinsip yang sama dengan iOS:

- Native `Kotlin`.
- UI `Jetpack Compose`.
- `MVVM` untuk presentation layer.
- `Clean Architecture` ringan tanpa layer `UseCase` untuk MVP.
- `Atomic Design` untuk komponen reusable.
- `Navigation Compose` + `NavigationManager` sebagai source of truth untuk route app.

Kontrak API Android:
- Runtime baseline: `docs/architecture/openapi-runtime-v0.yaml` (alias `/v1/*` tetap supported).

## 2. Arsitektur Inti

Empat lapisan utama:

1. `Presentation`
- Screen Compose + ViewModel.
- Screen hanya observe state dan trigger intent.

2. `Domain`
- Domain model + service contract (interface).
- Tidak ada use case layer untuk MVP.

3. `Data`
- Repository/service implementation, API client, DTO, mapper.
- Mapping DTO -> Domain dilakukan di layer ini.

4. `Core`
- Networking base, auth session storage, logger, constants, theme tokens, navigation manager.

Dependency rule:
- `Presentation -> Domain -> Data -> Core`
- ViewModel hanya depend ke interface, bukan concrete class.

## 3. Struktur Folder Target

```text
apps/mobile-android/
  app/src/main/java/com/senpaij/jepang/
    app/
      SenpaiJepangApp.kt
      MainActivity.kt
    core/
      navigation/
        AppRoute.kt
        NavigationManager.kt
        NavigationHandler.kt
      network/
        ApiClient.kt
        AuthInterceptor.kt
      storage/
        SessionStore.kt
      theme/
      util/
    components/
      atoms/
      molecules/
      organisms/
    features/
      auth/
        domain/
        data/
        presentation/
      jobs/
      journey/
      profile/
      feed/
      kyc/
```

Catatan:
- Tidak ada folder `usecase`.
- `components` bersifat cross-feature.

## 4. Navigation Pattern (Compose)

Gunakan satu manager untuk semua perpindahan route supaya testable dan konsisten.

```kotlin
interface NavigationHandler {
    fun navigate(route: AppRoute)
    fun back()
    fun popToRoot()
    fun replace(route: AppRoute)
}
```

```kotlin
sealed class AppRoute(val route: String) {
    data object Login : AppRoute("login")
    data object JobsList : AppRoute("jobs")
    data class JobDetail(val jobId: String) : AppRoute("jobs/{jobId}")
    data object SavedJobs : AppRoute("saved-jobs")
    data object Profile : AppRoute("profile")
    data class Journey(val applicationId: String) : AppRoute("journey/{applicationId}")
}
```

Aturan:
- ViewModel memanggil `NavigationHandler`, bukan `NavController` langsung.
- `NavController` hanya dipakai di layer app/navigation wiring.

## 5. Atomic Design Rules

1. `Atoms`
- Komponen dasar murni UI (button, chip, badge, text field style).

2. `Molecules`
- Gabungan atom untuk pola kecil (meta chip row, item summary row).

3. `Organisms`
- Section yang hampir siap pakai di screen (job summary, requirement section).

Rule:
- Tidak boleh ada API call langsung dari atoms/molecules/organisms.
- Semua style lewat `core/theme`.

## 6. Data + Networking Baseline

Rekomendasi library baseline (stabil dan umum dipakai):
- `Retrofit` + `OkHttp` + `Kotlinx Serialization` (atau Moshi).
- `Coroutines` + `StateFlow` untuk state management.
- `DataStore` untuk token/session ringan.

Konvensi error:
- Mapping error API ke `UiError` terpusat.
- Retry policy hanya untuk idempotent GET (bounded retry).

## 7. Testing Standard

Minimal gate per feature:

1. Unit test:
- ViewModel.
- Mapper DTO -> Domain.
- Repository/service (dengan fake API).

2. UI test Compose:
- Screen utama feature (happy path).

3. Integration smoke:
- Login -> jobs list -> job detail -> apply (untuk milestone feature terkait).

## 8. Version & Device Policy

- Build toolchain: gunakan versi stable terbaru yang tersedia di tim/CI.
- `minSdk` saat ini: `24` (sesuai project sekarang).
- Compile/target SDK: mengikuti stable line project saat release lock.

Policy release:
- Target dukung mayoritas device aktif (MVP fokus reliability, bukan coverage ekstrem).

## 9. CI/CD Baseline (Android)

Tahap awal:
- `./gradlew testDebugUnitTest`
- `./gradlew lintDebug`

Tahap berikut:
- `./gradlew connectedDebugAndroidTest` di emulator CI.
- Build artifact `assembleDebug` untuk QA internal.

## 10. Rule Skalabilitas

UseCase layer boleh ditambahkan nanti hanya jika:
- Logic lintas feature makin kompleks.
- Satu action punya lebih dari satu repository dependency.
- Unit test di service sudah sulit dipisah tanpa orchestration layer.

Selama kondisi itu belum terjadi, tetap pakai arsitektur ringan ini.
