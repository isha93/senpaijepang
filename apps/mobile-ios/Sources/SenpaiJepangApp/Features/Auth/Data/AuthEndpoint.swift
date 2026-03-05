import Foundation

enum AuthEndpoint: APIEndpoint {
    case login(email: String, password: String)
    case register(fullName: String, email: String, password: String)
    case refresh(refreshToken: String)
    case sendEmailVerification(accessToken: String, email: String, purpose: EmailVerificationPurpose)
    case resendEmailVerification(accessToken: String, email: String, purpose: EmailVerificationPurpose)
    case verifyEmailVerification(
        accessToken: String,
        email: String,
        code: String,
        purpose: EmailVerificationPurpose
    )
    case me

    var path: String {
        switch self {
        case .login:    return "/v1/auth/login"
        case .register: return "/v1/auth/register"
        case .refresh:  return "/v1/auth/refresh"
        case .sendEmailVerification: return "/v1/auth/email-verification/send"
        case .resendEmailVerification: return "/v1/auth/email-verification/resend"
        case .verifyEmailVerification: return "/v1/auth/email-verification/verify"
        case .me:       return "/v1/auth/me"
        }
    }

    var method: HTTPMethod {
        switch self {
        case .login, .register, .refresh: return .post
        case .sendEmailVerification, .resendEmailVerification, .verifyEmailVerification: return .post
        case .me:                         return .get
        }
    }

    var body: Data? {
        switch self {
        case .login(let email, let password):
            return try? JSONEncoder().encode(["email": email, "password": password])
        case .register(let fullName, let email, let password):
            return try? JSONEncoder().encode([
                "fullName": fullName,
                "email": email,
                "password": password
            ])
        case .refresh(let token):
            return try? JSONEncoder().encode(["refreshToken": token])
        case .sendEmailVerification(_, let email, let purpose),
             .resendEmailVerification(_, let email, let purpose):
            return try? JSONEncoder().encode([
                "email": email,
                "purpose": purpose.rawValue
            ])
        case .verifyEmailVerification(_, let email, let code, let purpose):
            return try? JSONEncoder().encode([
                "email": email,
                "code": code,
                "purpose": purpose.rawValue
            ])
        case .me:
            return nil
        }
    }

    var headers: [String: String]? {
        switch self {
        case .sendEmailVerification(let accessToken, _, _),
             .resendEmailVerification(let accessToken, _, _),
             .verifyEmailVerification(let accessToken, _, _, _):
            return ["Authorization": "Bearer \(accessToken)"]
        default:
            return nil
        }
    }

    var requiresAuth: Bool {
        switch self {
        case .login, .register, .refresh: return false
        case .sendEmailVerification, .resendEmailVerification, .verifyEmailVerification: return false
        case .me:                         return true
        }
    }
}
