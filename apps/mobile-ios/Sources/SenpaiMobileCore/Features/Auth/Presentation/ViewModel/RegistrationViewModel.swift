import Foundation
import SwiftUI

enum RegistrationStep: Int, CaseIterable {
    case accountInfo = 0
    case preferences = 1
    case allSet = 2

    var title: String {
        switch self {
        case .accountInfo: return "Sign Up"
        case .preferences: return "Preferences"
        case .allSet: return "Success"
        }
    }

    var stepLabels: [String] {
        ["Account Info", "Preferences", "All Set"]
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
    @Published var isPasswordVisible: Bool = false

    // Step 2: Preferences
    @Published var workStatus: WorkStatus = .looking
    @Published var selectedPrefecture: String = ""

    // General
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    let prefectures = ["Tokyo", "Osaka", "Aichi", "Fukuoka", "Hokkaido", "Kyoto", "Nagoya", "Saitama", "Chiba", "Yokohama"]
    let quickPrefectures = ["Tokyo", "Osaka", "Aichi"]

    private let authService: AuthServiceProtocol
    private let navigation: NavigationHandling
    private var pendingSession: AuthSession?

    init(authService: AuthServiceProtocol, navigation: NavigationHandling) {
        self.authService = authService
        self.navigation = navigation
    }

    func continueToNextStep() {
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
            Task { await registerAndAdvance() }

        case .preferences:
            withAnimation(AppTheme.animationDefault) {
                currentStep = .allSet
            }

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

    // MARK: - Private

    private func registerAndAdvance() async {
        isLoading = true
        defer { isLoading = false }

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
    }

    private func isValidEmail(_ value: String) -> Bool {
        let emailRegex = #"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"#
        return value.range(of: emailRegex, options: .regularExpression) != nil
    }
}
