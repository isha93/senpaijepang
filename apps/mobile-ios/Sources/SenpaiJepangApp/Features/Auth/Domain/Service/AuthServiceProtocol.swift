import Foundation

struct AuthSession: Equatable, Sendable {
    let accessToken: String
    let refreshToken: String

    init(accessToken: String, refreshToken: String) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
    }
}

struct EmailVerificationChallenge: Equatable, Sendable {
    let email: String
    let required: Bool
    let verified: Bool
    let sent: Bool
    let expiresInSec: Int
    let resendAvailableInSec: Int
}

struct EmailVerificationResult: Equatable, Sendable {
    let email: String
    let verified: Bool
    let alreadyVerified: Bool
}

struct RegistrationResult: Equatable, Sendable {
    let session: AuthSession
    let emailVerification: EmailVerificationChallenge?
}

enum AuthValidationError: LocalizedError, Equatable {
    case invalidEmail
    case invalidPassword

    var errorDescription: String? {
        switch self {
        case .invalidEmail:
            return "Please enter a valid email address."
        case .invalidPassword:
            return "Password must be at least 8 characters."
        }
    }
}

@MainActor
protocol AuthServiceProtocol {
    func login(email: String, password: String) async throws -> AuthSession
    func register(fullName: String, email: String, password: String) async throws -> RegistrationResult
    func resendEmailVerification(email: String) async throws -> EmailVerificationChallenge
    func verifyEmailVerification(email: String, code: String) async throws -> EmailVerificationResult
}
