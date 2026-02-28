import Foundation

public struct AuthSession: Equatable, Sendable {
    public let accessToken: String
    public let refreshToken: String

    public init(accessToken: String, refreshToken: String) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
    }
}

public enum AuthValidationError: LocalizedError, Equatable {
    case invalidPhone
    case invalidOtp

    public var errorDescription: String? {
        switch self {
        case .invalidPhone:
            return "Phone number is invalid."
        case .invalidOtp:
            return "OTP must be 6 digits."
        }
    }
}

@MainActor
public protocol AuthServiceProtocol {
    func login(phoneNumber: String, otp: String) async throws -> AuthSession
}
