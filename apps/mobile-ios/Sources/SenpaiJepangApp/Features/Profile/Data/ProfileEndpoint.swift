import Foundation

enum ProfileEndpoint: APIEndpoint {
    case fetchProfile
    case updateProfile(fullName: String?, avatarUrl: String?)

    var path: String {
        return "/v1/users/me/profile"
    }

    var method: HTTPMethod {
        switch self {
        case .fetchProfile:  return .get
        case .updateProfile: return .patch
        }
    }

    var body: Data? {
        switch self {
        case .fetchProfile:
            return nil
        case .updateProfile(let fullName, let avatarUrl):
            var fields: [String: String] = [:]
            if let fullName { fields["fullName"] = fullName }
            if let avatarUrl { fields["avatarUrl"] = avatarUrl }
            return try? JSONEncoder().encode(fields)
        }
    }

    var requiresAuth: Bool { true }
}
