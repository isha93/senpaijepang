import Foundation

/// Response from POST /v1/auth/login and POST /v1/auth/register
struct AuthResponseDTO: Decodable {
    let user: AuthUserDTO?
    let accessToken: String
    let refreshToken: String
    let emailVerification: EmailVerificationChallengeDTO?

    func toSession() -> AuthSession {
        AuthSession(accessToken: accessToken, refreshToken: refreshToken)
    }

    func toRegistrationResult() -> RegistrationResult {
        RegistrationResult(
            session: toSession(),
            emailVerification: emailVerification?.toDomain()
        )
    }
}

struct AuthUserDTO: Decodable {
    let id: String
    let fullName: String
    let email: String
    let emailVerified: Bool?
    let emailVerifiedAt: String?
}

struct EmailVerificationChallengeDTO: Decodable {
    let email: String
    let required: Bool
    let verified: Bool
    let sent: Bool
    let expiresInSec: Int
    let resendAvailableInSec: Int

    func toDomain() -> EmailVerificationChallenge {
        EmailVerificationChallenge(
            email: email,
            required: required,
            verified: verified,
            sent: sent,
            expiresInSec: expiresInSec,
            resendAvailableInSec: resendAvailableInSec
        )
    }
}

struct EmailVerificationResultDTO: Decodable {
    let email: String
    let verified: Bool
    let alreadyVerified: Bool

    func toDomain() -> EmailVerificationResult {
        EmailVerificationResult(
            email: email,
            verified: verified,
            alreadyVerified: alreadyVerified
        )
    }
}
