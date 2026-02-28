import Combine
import Foundation

@MainActor
final class LoginViewModel: ObservableObject, ManagedTask {
    @Published var phoneNumber: String
    @Published var otp: String
    @Published var isLoading: Bool
    @Published var errorMessage: String?
    @Published private(set) var currentSession: AuthSession?

    private let authService: AuthServiceProtocol
    private let navigation: NavigationHandling

    init(
        authService: AuthServiceProtocol,
        navigation: NavigationHandling,
        phoneNumber: String = "",
        otp: String = ""
    ) {
        self.authService = authService
        self.navigation = navigation
        self.phoneNumber = phoneNumber
        self.otp = otp
        self.isLoading = false
        self.errorMessage = nil
        self.currentSession = nil
    }

    func submitLogin() async {
        errorMessage = nil
        let normalizedPhone = normalizePhoneNumber(phoneNumber)

        guard isValidPhone(normalizedPhone) else {
            errorMessage = AuthValidationError.invalidPhone.errorDescription
            return
        }

        guard isValidOtp(otp) else {
            errorMessage = AuthValidationError.invalidOtp.errorDescription
            return
        }

        if let session = await executeTask({
            try await self.authService.login(phoneNumber: normalizedPhone, otp: self.otp)
        }) {
            currentSession = session
            navigation.replace(with: .jobsList)
        }
    }

    private func normalizePhoneNumber(_ raw: String) -> String {
        raw.filter { $0.isNumber }
    }

    private func isValidPhone(_ value: String) -> Bool {
        // Keep the MVP validation simple: numeric and at least 9 digits.
        value.count >= 9 && value.allSatisfy(\.isNumber)
    }

    private func isValidOtp(_ value: String) -> Bool {
        value.count == 6 && value.allSatisfy(\.isNumber)
    }
}
