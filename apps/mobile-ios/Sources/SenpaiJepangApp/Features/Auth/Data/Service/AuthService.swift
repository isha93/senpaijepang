import Foundation

@MainActor
final class AuthService: AuthServiceProtocol {
    typealias LoginHandler = @Sendable (String, String) async throws -> AuthSession

    private let loginHandler: LoginHandler

    init(loginHandler: @escaping LoginHandler) {
        self.loginHandler = loginHandler
    }

    func login(phoneNumber: String, otp: String) async throws -> AuthSession {
        try await loginHandler(phoneNumber, otp)
    }
}
