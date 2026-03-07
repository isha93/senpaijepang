import Foundation

/// Response from POST /v1/auth/login and POST /v1/auth/register
struct AuthResponseDTO: Decodable {
    let accessToken: String
    let refreshToken: String

    func toSession() -> AuthSession {
        AuthSession(accessToken: accessToken, refreshToken: refreshToken)
    }
}
