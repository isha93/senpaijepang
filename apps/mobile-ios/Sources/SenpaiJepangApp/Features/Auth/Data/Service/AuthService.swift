import Foundation

@MainActor
final class AuthService: AuthServiceProtocol {
    typealias LoginHandler = @Sendable (String, String) async throws -> AuthSession
    typealias RegisterHandler = @Sendable (String, String, String) async throws -> RegistrationResult
    typealias ResendEmailVerificationHandler = @Sendable (String) async throws -> EmailVerificationChallenge
    typealias VerifyEmailVerificationHandler = @Sendable (String, String) async throws -> EmailVerificationResult

    private let loginHandler: LoginHandler
    private let registerHandler: RegisterHandler
    private let resendEmailVerificationHandler: ResendEmailVerificationHandler
    private let verifyEmailVerificationHandler: VerifyEmailVerificationHandler

    init(
        loginHandler: @escaping LoginHandler,
        registerHandler: @escaping RegisterHandler,
        resendEmailVerificationHandler: @escaping ResendEmailVerificationHandler,
        verifyEmailVerificationHandler: @escaping VerifyEmailVerificationHandler
    ) {
        self.loginHandler = loginHandler
        self.registerHandler = registerHandler
        self.resendEmailVerificationHandler = resendEmailVerificationHandler
        self.verifyEmailVerificationHandler = verifyEmailVerificationHandler
    }

    func login(email: String, password: String) async throws -> AuthSession {
        try await loginHandler(email, password)
    }

    func register(fullName: String, email: String, password: String) async throws -> RegistrationResult {
        try await registerHandler(fullName, email, password)
    }

    func resendEmailVerification(email: String) async throws -> EmailVerificationChallenge {
        try await resendEmailVerificationHandler(email)
    }

    func verifyEmailVerification(email: String, code: String) async throws -> EmailVerificationResult {
        try await verifyEmailVerificationHandler(email, code)
    }
}
