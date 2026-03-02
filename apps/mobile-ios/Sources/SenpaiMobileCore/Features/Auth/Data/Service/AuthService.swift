import Foundation

@MainActor
final class AuthService: AuthServiceProtocol {
    typealias LoginHandler = @Sendable (String, String) async throws -> AuthSession
    typealias RegisterHandler = @Sendable (String, String, String) async throws -> AuthSession

    private let loginHandler: LoginHandler
    private let registerHandler: RegisterHandler

    init(loginHandler: @escaping LoginHandler, registerHandler: @escaping RegisterHandler) {
        self.loginHandler = loginHandler
        self.registerHandler = registerHandler
    }

    func login(email: String, password: String) async throws -> AuthSession {
        try await loginHandler(email, password)
    }

    func register(fullName: String, email: String, password: String) async throws -> AuthSession {
        try await registerHandler(fullName, email, password)
    }
}
