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

    var stepLabels: [String] {
        ["Account Info", "Preferences", "Verify", "All Set"]
    }
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
    @Published var confirmPassword: String = ""
    @Published var isPasswordVisible: Bool = false
    @Published var isConfirmPasswordVisible: Bool = false

    // Step 2: Preferences
    @Published var workStatus: WorkStatus = .looking
    @Published var selectedPrefecture: String = ""

    // Step 3: Verify Email
    @Published var verificationCode: String = ""
    @Published var resendCountdown: Int = 0

    // General
    @Published var isRegistering: Bool = false
    @Published var isVerifyingEmail: Bool = false
    @Published var isResendingCode: Bool = false
    @Published var errorMessage: String?
    @Published var infoMessage: String?

    let prefectures = ["Tokyo", "Osaka", "Aichi", "Fukuoka", "Hokkaido", "Kyoto", "Nagoya", "Saitama", "Chiba", "Yokohama"]
    let quickPrefectures = ["Tokyo", "Osaka", "Aichi"]

    private let authService: AuthServiceProtocol
    private let navigation: NavigationHandling
    private var pendingSession: AuthSession?
    private var emailVerification: EmailVerificationChallenge?
    private var resendCountdownTask: Task<Void, Never>?

    init(authService: AuthServiceProtocol, navigation: NavigationHandling) {
        self.authService = authService
        self.navigation = navigation
    }

    deinit {
        resendCountdownTask?.cancel()
    }

    func continueToNextStep() {
        errorMessage = nil
        infoMessage = nil

        switch currentStep {
        case .accountInfo:
            guard validateAccountInfo() else { return }
            withAnimation(AppTheme.animationDefault) {
                currentStep = .preferences
            }

        case .preferences:
            Task { await registerAndAdvanceToVerification() }

        case .verifyEmail:
            guard verificationCode.count == 6 else {
                errorMessage = "Enter the 6-digit verification code."
                return
            }
            Task { await verifyEmailAndAdvance() }

        case .allSet:
            goToDashboard()
        }
    }

    func goBack() {
        errorMessage = nil
        infoMessage = nil

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

    func toggleConfirmPasswordVisibility() {
        isConfirmPasswordVisible.toggle()
    }

    func setVerificationCode(_ value: String) {
        let digitsOnly = value.filter { $0.isNumber }
        verificationCode = String(digitsOnly.prefix(6))
    }

    func resendVerificationCode() {
        guard canResendCode else { return }
        Task { await resendCode() }
    }

    func changeEmail() {
        pendingSession = nil
        emailVerification = nil
        verificationCode = ""
        stopResendCountdown()
        errorMessage = nil
        infoMessage = nil

        withAnimation(AppTheme.animationDefault) {
            currentStep = .accountInfo
        }
    }

    func goToDashboard() {
        guard let session = pendingSession else { return }
        AuthStateManager.shared.login(session: session)
    }

    var verificationCodeDigits: [String] {
        let digits = verificationCode.map(String.init)
        return (0..<6).map { index in
            index < digits.count ? digits[index] : ""
        }
    }

    var formattedResendCountdown: String {
        let minutes = resendCountdown / 60
        let seconds = resendCountdown % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }

    var canResendCode: Bool {
        resendCountdown == 0 && !isRegistering && !isVerifyingEmail && !isResendingCode
    }

    var displayedEmail: String {
        email.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    // MARK: - Private

    private func validateAccountInfo() -> Bool {
        guard !fullName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "Please enter your full name."
            return false
        }
        guard isValidEmail(email) else {
            errorMessage = "Please enter a valid email address."
            return false
        }
        guard password.count >= 8 else {
            errorMessage = "Password must be at least 8 characters."
            return false
        }
        guard confirmPassword == password else {
            errorMessage = "Passwords do not match."
            return false
        }
        return true
    }

    private func registerAndAdvanceToVerification() async {
        if pendingSession != nil, emailVerification != nil {
            withAnimation(AppTheme.animationDefault) {
                currentStep = .verifyEmail
            }
            return
        }

        isRegistering = true
        defer { isRegistering = false }

        do {
            let result = try await authService.register(
                fullName: fullName,
                email: email,
                password: password
            )
            pendingSession = result.session
            emailVerification = result.emailVerification
            verificationCode = ""
            startResendCountdown(seconds: result.emailVerification?.resendAvailableInSec ?? 0)

            if let verification = result.emailVerification, verification.sent == false {
                infoMessage = "We couldn't send the code yet. Try resending in a moment."
            }

            withAnimation(AppTheme.animationDefault) {
                currentStep = .verifyEmail
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func verifyEmailAndAdvance() async {
        isVerifyingEmail = true
        defer { isVerifyingEmail = false }

        do {
            _ = try await authService.verifyEmailVerification(
                email: displayedEmail,
                code: verificationCode
            )
            stopResendCountdown()
            withAnimation(AppTheme.animationDefault) {
                currentStep = .allSet
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func resendCode() async {
        isResendingCode = true
        defer { isResendingCode = false }

        do {
            let updatedChallenge = try await authService.resendEmailVerification(email: displayedEmail)
            emailVerification = updatedChallenge
            startResendCountdown(seconds: updatedChallenge.resendAvailableInSec)
            infoMessage = updatedChallenge.sent
                ? "A new verification code has been sent."
                : "We couldn't send the code yet. Please try again."
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func startResendCountdown(seconds: Int) {
        stopResendCountdown()
        resendCountdown = max(0, seconds)

        guard resendCountdown > 0 else { return }

        resendCountdownTask = Task { [weak self] in
            while let self, !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                guard !Task.isCancelled else { break }
                await MainActor.run {
                    if self.resendCountdown > 0 {
                        self.resendCountdown -= 1
                    }
                }
                let shouldStop = await MainActor.run { self.resendCountdown == 0 }
                if shouldStop {
                    break
                }
            }
        }
    }

    private func stopResendCountdown() {
        resendCountdownTask?.cancel()
        resendCountdownTask = nil
        resendCountdown = 0
    }

    private func isValidEmail(_ value: String) -> Bool {
        let emailRegex = #"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"#
        return value.range(of: emailRegex, options: .regularExpression) != nil
    }
}
