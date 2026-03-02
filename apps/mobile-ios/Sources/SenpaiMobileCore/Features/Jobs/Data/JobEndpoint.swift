import Foundation

enum JobEndpoint: APIEndpoint {
    case list
    case detail(jobId: String)
    case savedJobs
    case saveJob(jobId: String)
    case unsaveJob(jobId: String)
    case applyJob(jobId: String)
    case myApplications

    var path: String {
        switch self {
        case .list:                    return "/v1/jobs"
        case .detail(let id):          return "/v1/jobs/\(id)"
        case .savedJobs:               return "/v1/users/me/saved-jobs"
        case .saveJob:                 return "/v1/users/me/saved-jobs"
        case .unsaveJob(let id):       return "/v1/users/me/saved-jobs/\(id)"
        case .applyJob(let id):        return "/v1/jobs/\(id)/applications"
        case .myApplications:          return "/v1/users/me/applications"
        }
    }

    var method: HTTPMethod {
        switch self {
        case .list, .detail, .savedJobs, .myApplications: return .get
        case .saveJob, .applyJob:                          return .post
        case .unsaveJob:                                   return .delete
        }
    }

    var body: Data? {
        switch self {
        case .saveJob(let jobId):
            return try? JSONEncoder().encode(["jobId": jobId])
        default:
            return nil
        }
    }

    // list/detail are public but send auth token when available so viewerState.saved is accurate
    var requiresAuth: Bool { true }
}
