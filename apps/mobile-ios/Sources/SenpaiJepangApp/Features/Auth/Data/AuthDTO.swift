import Foundation

/// Response from POST /v1/auth/login and POST /v1/auth/register
struct AuthResponseDTO: Decodable {
    let accessToken: String
    let refreshToken: String

    func toSession() -> AuthSession {
        AuthSession(accessToken: accessToken, refreshToken: refreshToken)
    }
}

struct EmailVerificationChallengeResponseDTO: Decodable {
    let verificationId: String
    let expiresAt: String?
    let resendAvailableAt: String?
    let nextResendInSec: Int
    let developmentCode: String?

    func toChallenge() -> EmailVerificationChallenge {
        EmailVerificationChallenge(
            verificationId: verificationId,
            expiresAt: expiresAt,
            resendAvailableAt: resendAvailableAt,
            nextResendInSec: nextResendInSec,
            developmentCode: developmentCode
        )
    }
}

struct EmailVerificationVerifyResponseDTO: Decodable {
    let verified: Bool
    let verifiedAt: String?

    func toResult() -> EmailVerificationResult {
        EmailVerificationResult(verified: verified, verifiedAt: verifiedAt)
    }
}
