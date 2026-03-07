import Foundation

enum AuthEndpoint: APIEndpoint {
    case login(email: String, password: String)
    case register(fullName: String, email: String, password: String)
    case resendEmailVerification(email: String)
    case verifyEmailVerification(email: String, code: String)
    case refresh(refreshToken: String)
    case me

    var path: String {
        switch self {
        case .login:                   return "/v1/auth/login"
        case .register:                return "/v1/auth/register"
        case .resendEmailVerification: return "/v1/auth/email-verification/resend"
        case .verifyEmailVerification: return "/v1/auth/email-verification/verify"
        case .refresh:                 return "/v1/auth/refresh"
        case .me:                      return "/v1/auth/me"
        }
    }

    var method: HTTPMethod {
        switch self {
        case .login, .register, .resendEmailVerification, .verifyEmailVerification, .refresh:
            return .post
        case .me:
            return .get
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
        case .resendEmailVerification(let email):
            return try? JSONEncoder().encode(["email": email])
        case .verifyEmailVerification(let email, let code):
            return try? JSONEncoder().encode([
                "email": email,
                "code": code
            ])
        case .refresh(let token):
            return try? JSONEncoder().encode(["refreshToken": token])
        case .me:
            return nil
        }
    }

    var requiresAuth: Bool {
        switch self {
        case .login, .register, .resendEmailVerification, .verifyEmailVerification, .refresh:
            return false
        case .me:
            return true
        }
    }
}
