import Foundation
import SwiftUI

enum RegistrationStep: Int, CaseIterable {
    case accountInfo = 0
    case preferences = 1
    case verifyEmail = 2
    case allSet = 3

    var title: String {
        switch self {
        case .accountInfo: return "Sign Up"
        case .preferences: return "Preferences"
        case .verifyEmail: return "Verify Email"
        case .allSet: return "Success"
        }
    }

    static let stepLabels: [String] = ["Account", "Preferences", "Verify", "Finish"]
}

enum WorkStatus: String, CaseIterable {
    case looking = "Looking"
    case working = "Working"

    var icon: String {
        switch self {
        case .looking: return "magnifyingglass"
        case .working: return "briefcase.fill"
        }
    }
}

@MainActor
final class RegistrationViewModel: ObservableObject {
    @Published var currentStep: RegistrationStep = .accountInfo

    // Step 1: Account Info
    @Published var fullName: String = ""
    @Published var email: String = ""
    @Published var password: String = ""
    @Published var isPasswordVisible: Bool = false

    // Step 2: Preferences
    @Published var workStatus: WorkStatus = .looking
    @Published var selectedPrefecture: String = ""

    // Step 3: Verify Email (UI-only until API is ready)
    @Published var verificationCode: String = ""
    @Published private(set) var resendRemainingSeconds: Int = 0

    // General
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    let prefectures = ["Tokyo", "Osaka", "Aichi", "Fukuoka", "Hokkaido", "Kyoto", "Nagoya", "Saitama", "Chiba", "Yokohama"]
    let quickPrefectures = ["Tokyo", "Osaka", "Aichi"]

    private let authService: AuthServiceProtocol
    private let navigation: NavigationHandling
    private var pendingSession: AuthSession?
    private var resendCountdownTask: Task<Void, Never>?

    init(authService: AuthServiceProtocol, navigation: NavigationHandling) {
        self.authService = authService
        self.navigation = navigation
    }

    func continueToNextStep() {
        guard !isLoading else { return }
        errorMessage = nil

        switch currentStep {
        case .accountInfo:
            guard !fullName.trimmingCharacters(in: .whitespaces).isEmpty else {
                errorMessage = "Please enter your full name."
                return
            }
            guard isValidEmail(email) else {
                errorMessage = "Please enter a valid email address."
                return
            }
            guard password.count >= 8 else {
                errorMessage = "Password must be at least 8 characters."
                return
            }
            isLoading = true
            Task { await registerAndAdvance() }

        case .preferences:
            withAnimation(AppTheme.animationDefault) {
                currentStep = .verifyEmail
            }
            startResendCooldown()

        case .verifyEmail:
            guard isVerificationCodeComplete else {
                errorMessage = "Please enter the 6-digit verification code."
                return
            }
            isLoading = true
            Task { await verifyCodeAndAdvance() }

        case .allSet:
            if let session = pendingSession {
                AuthStateManager.shared.login(session: session)
            }
        }
    }

    func goBack() {
        errorMessage = nil
        switch currentStep {
        case .accountInfo:
            navigation.pop()
        case .preferences:
            withAnimation(AppTheme.animationDefault) {
                currentStep = .accountInfo
            }
        case .verifyEmail:
            withAnimation(AppTheme.animationDefault) {
                currentStep = .preferences
            }
        case .allSet:
            break
        }
    }

    func selectQuickPrefecture(_ prefecture: String) {
        selectedPrefecture = prefecture
    }

    func togglePasswordVisibility() {
        isPasswordVisible.toggle()
    }

    func goToDashboard() {
        if let session = pendingSession {
            AuthStateManager.shared.login(session: session)
        }
    }

    func updateVerificationCode(_ value: String) {
        let sanitized = value.filter(\.isNumber)
        verificationCode = String(sanitized.prefix(Self.verificationCodeLength))
        if !verificationCode.isEmpty {
            errorMessage = nil
        }
    }

    func resendVerificationCode() {
        guard canResendVerificationCode, !isLoading else { return }
        errorMessage = nil
        startResendCooldown()
        // TODO(api): Call resend verification endpoint once available.
    }

    func changeEmail() {
        guard !isLoading else { return }
        errorMessage = nil
        verificationCode = ""
        withAnimation(AppTheme.animationDefault) {
            currentStep = .accountInfo
        }
    }

    var isVerificationCodeComplete: Bool {
        verificationCode.count == Self.verificationCodeLength
    }

    var canResendVerificationCode: Bool {
        resendRemainingSeconds == 0
    }

    var resendCodeLabel: String {
        if canResendVerificationCode {
            return "Resend code"
        }
        return "Resend code in \(formattedResendCountdown)"
    }

    var formattedResendCountdown: String {
        let minutes = resendRemainingSeconds / 60
        let seconds = resendRemainingSeconds % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }

    var maskedEmail: String {
        let trimmed = email.trimmingCharacters(in: .whitespacesAndNewlines)
        let parts = trimmed.split(separator: "@", maxSplits: 1).map(String.init)
        guard parts.count == 2 else { return trimmed }
        let local = parts[0]
        guard local.count > 2 else { return trimmed }
        let start = local.prefix(2)
        let end = local.suffix(1)
        return "\(start)***\(end)@\(parts[1])"
    }

    // MARK: - Private

    private func registerAndAdvance() async {
        let loadingStartedAt = DispatchTime.now().uptimeNanoseconds

        do {
            let session = try await authService.register(
                fullName: fullName,
                email: email,
                password: password
            )
            pendingSession = session
            withAnimation(AppTheme.animationDefault) {
                currentStep = .preferences
            }
        } catch {
            errorMessage = error.localizedDescription
        }

        await ensureMinimumLoadingDuration(since: loadingStartedAt)
        isLoading = false
    }

    private func verifyCodeAndAdvance() async {
        let loadingStartedAt = DispatchTime.now().uptimeNanoseconds

        // TODO(api): Replace local success transition with real verify-email endpoint call.
        await ensureMinimumLoadingDuration(since: loadingStartedAt)
        errorMessage = nil
        withAnimation(AppTheme.animationDefault) {
            currentStep = .allSet
        }
        isLoading = false
    }

    private func isValidEmail(_ value: String) -> Bool {
        let emailRegex = #"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"#
        return value.range(of: emailRegex, options: .regularExpression) != nil
    }

    private func startResendCooldown() {
        startResendCooldown(from: Self.defaultResendCooldownSeconds)
    }

    private func startResendCooldown(from seconds: Int) {
        resendCountdownTask?.cancel()
        resendRemainingSeconds = seconds
        resendCountdownTask = Task { [weak self] in
            guard let self else { return }
            while !Task.isCancelled && resendRemainingSeconds > 0 {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                guard !Task.isCancelled else { break }
                resendRemainingSeconds = max(0, resendRemainingSeconds - 1)
            }
        }
    }

    private func ensureMinimumLoadingDuration(since startedAtNanoseconds: UInt64) async {
        let elapsed = DispatchTime.now().uptimeNanoseconds - startedAtNanoseconds
        guard elapsed < Self.minimumLoadingNanoseconds else { return }
        let remaining = Self.minimumLoadingNanoseconds - elapsed
        try? await Task.sleep(nanoseconds: remaining)
    }

    private static let minimumLoadingNanoseconds: UInt64 = 350_000_000
    private static let verificationCodeLength = 6
    private static let defaultResendCooldownSeconds = 60
}
