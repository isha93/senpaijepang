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
    case invalidPhone
    case invalidOtp

    var errorDescription: String? {
        switch self {
        case .invalidPhone:
            return "Phone number is invalid."
        case .invalidOtp:
            return "OTP must be 6 digits."
        }
    }
}

@MainActor
protocol AuthServiceProtocol {
    func login(phoneNumber: String, otp: String) async throws -> AuthSession
}
