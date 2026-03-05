import Foundation

struct AuthSession: Equatable, Sendable {
    let accessToken: String
    let refreshToken: String

    init(accessToken: String, refreshToken: String) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
    }
}

enum EmailVerificationPurpose: String, Equatable, Sendable {
    case register = "REGISTER"
}

struct EmailVerificationChallenge: Equatable, Sendable {
    let verificationId: String
    let expiresAt: String?
    let resendAvailableAt: String?
    let nextResendInSec: Int
    let developmentCode: String?
}

struct EmailVerificationResult: Equatable, Sendable {
    let verified: Bool
    let verifiedAt: String?
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
    func register(fullName: String, email: String, password: String) async throws -> AuthSession
    func sendEmailVerification(
        accessToken: String,
        email: String,
        purpose: EmailVerificationPurpose
    ) async throws -> EmailVerificationChallenge
    func resendEmailVerification(
        accessToken: String,
        email: String,
        purpose: EmailVerificationPurpose
    ) async throws -> EmailVerificationChallenge
    func verifyEmailVerification(
        accessToken: String,
        email: String,
        code: String,
        purpose: EmailVerificationPurpose
    ) async throws -> EmailVerificationResult
}
