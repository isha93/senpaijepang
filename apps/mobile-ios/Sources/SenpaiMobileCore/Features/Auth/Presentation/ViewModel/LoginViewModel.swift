import Combine
import Foundation

@MainActor
final class LoginViewModel: ObservableObject, ManagedTask {
    @Published var email: String
    @Published var password: String
    @Published var isPasswordVisible: Bool
    @Published var isLoading: Bool
    @Published var errorMessage: String?

    private let authService: AuthServiceProtocol
    private let navigation: NavigationHandling

    init(
        authService: AuthServiceProtocol,
        navigation: NavigationHandling,
        email: String = "",
        password: String = ""
    ) {
        self.authService = authService
        self.navigation = navigation
        self.email = email
        self.password = password
        self.isPasswordVisible = false
        self.isLoading = false
        self.errorMessage = nil
    }

    func submitLogin() async {
        errorMessage = nil

        guard isValidEmail(email) else {
            errorMessage = "Please enter a valid email address."
            return
        }

        guard password.count >= 8 else {
            errorMessage = "Password must be at least 8 characters."
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            let session = try await authService.login(email: email, password: password)
            AuthStateManager.shared.login(session: session)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func togglePasswordVisibility() {
        isPasswordVisible.toggle()
    }

    func navigateToRegistration() {
        navigation.push(.registration)
    }

    private func isValidEmail(_ value: String) -> Bool {
        let emailRegex = #"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"#
        return value.range(of: emailRegex, options: .regularExpression) != nil
    }
}
