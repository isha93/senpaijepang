import Foundation

@MainActor
final class AuthService: AuthServiceProtocol {
    typealias LoginHandler = @Sendable (String, String) async throws -> AuthSession
    typealias RegisterHandler = @Sendable (String, String, String) async throws -> AuthSession
    typealias SendEmailVerificationHandler =
        @Sendable (String, String, EmailVerificationPurpose) async throws -> EmailVerificationChallenge
    typealias ResendEmailVerificationHandler =
        @Sendable (String, String, EmailVerificationPurpose) async throws -> EmailVerificationChallenge
    typealias VerifyEmailVerificationHandler =
        @Sendable (String, String, String, EmailVerificationPurpose) async throws -> EmailVerificationResult

    private let loginHandler: LoginHandler
    private let registerHandler: RegisterHandler
    private let sendEmailVerificationHandler: SendEmailVerificationHandler
    private let resendEmailVerificationHandler: ResendEmailVerificationHandler
    private let verifyEmailVerificationHandler: VerifyEmailVerificationHandler

    init(
        loginHandler: @escaping LoginHandler,
        registerHandler: @escaping RegisterHandler,
        sendEmailVerificationHandler: @escaping SendEmailVerificationHandler,
        resendEmailVerificationHandler: @escaping ResendEmailVerificationHandler,
        verifyEmailVerificationHandler: @escaping VerifyEmailVerificationHandler
    ) {
        self.loginHandler = loginHandler
        self.registerHandler = registerHandler
        self.sendEmailVerificationHandler = sendEmailVerificationHandler
        self.resendEmailVerificationHandler = resendEmailVerificationHandler
        self.verifyEmailVerificationHandler = verifyEmailVerificationHandler
    }

    func login(email: String, password: String) async throws -> AuthSession {
        try await loginHandler(email, password)
    }

    func register(fullName: String, email: String, password: String) async throws -> AuthSession {
        try await registerHandler(fullName, email, password)
    }

    func sendEmailVerification(
        accessToken: String,
        email: String,
        purpose: EmailVerificationPurpose
    ) async throws -> EmailVerificationChallenge {
        try await sendEmailVerificationHandler(accessToken, email, purpose)
    }

    func resendEmailVerification(
        accessToken: String,
        email: String,
        purpose: EmailVerificationPurpose
    ) async throws -> EmailVerificationChallenge {
        try await resendEmailVerificationHandler(accessToken, email, purpose)
    }

    func verifyEmailVerification(
        accessToken: String,
        email: String,
        code: String,
        purpose: EmailVerificationPurpose
    ) async throws -> EmailVerificationResult {
        try await verifyEmailVerificationHandler(accessToken, email, code, purpose)
    }
}
