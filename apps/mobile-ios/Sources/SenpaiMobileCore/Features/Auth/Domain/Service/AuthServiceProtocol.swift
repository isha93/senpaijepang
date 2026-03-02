import Foundation

struct AuthSession: Equatable, Sendable {
    let accessToken: String
    let refreshToken: String

    init(accessToken: String, refreshToken: String) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
    }
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
}
