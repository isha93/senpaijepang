import Foundation

@MainActor
public final class AuthService: AuthServiceProtocol {
    public typealias LoginHandler = @Sendable (String, String) async throws -> AuthSession

    private let loginHandler: LoginHandler

    public init(loginHandler: @escaping LoginHandler) {
        self.loginHandler = loginHandler
    }

    public func login(phoneNumber: String, otp: String) async throws -> AuthSession {
        try await loginHandler(phoneNumber, otp)
    }
}
