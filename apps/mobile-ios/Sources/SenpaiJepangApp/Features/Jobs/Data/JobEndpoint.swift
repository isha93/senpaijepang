import Foundation

enum JobEndpoint: APIEndpoint {
    case list
    case detail(jobId: String)
    case savedJobs
    case saveJob(jobId: String)
    case unsaveJob(jobId: String)
    case applyJob(jobId: String)
    case myApplications
    case applicationJourney(applicationId: String)

    var path: String {
        switch self {
        case .list:                    return "/v1/jobs"
        case .detail(let id):          return "/v1/jobs/\(id)"
        case .savedJobs:               return "/v1/users/me/saved-jobs"
        case .saveJob:                 return "/v1/users/me/saved-jobs"
        case .unsaveJob(let id):       return "/v1/users/me/saved-jobs/\(id)"
        case .applyJob(let id):        return "/v1/jobs/\(id)/applications"
        case .myApplications:          return "/v1/users/me/applications"
        case .applicationJourney(let id): return "/v1/users/me/applications/\(id)/journey"
        }
    }

    var method: HTTPMethod {
        switch self {
        case .list, .detail, .savedJobs, .myApplications, .applicationJourney: return .get
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

enum IdentityEndpoint: APIEndpoint {
    case kycStatus
    case startKycSession(provider: String)
    case createUploadURL(
        sessionId: String,
        documentType: String,
        fileName: String,
        contentType: String,
        contentLength: Int,
        checksumSha256: String
    )
    case uploadDocument(
        sessionId: String,
        documentType: String,
        objectKey: String,
        checksumSha256: String,
        metadata: [String: String]
    )
    case submitSession(sessionId: String)

    var path: String {
        switch self {
        case .kycStatus:
            return "/v1/identity/kyc/status"
        case .startKycSession:
            return "/v1/identity/kyc/sessions"
        case .createUploadURL:
            return "/v1/identity/kyc/upload-url"
        case .uploadDocument:
            return "/v1/identity/kyc/documents"
        case .submitSession(let sessionId):
            return "/v1/identity/kyc/sessions/\(sessionId)/submit"
        }
    }

    var method: HTTPMethod {
        switch self {
        case .kycStatus:
            return .get
        case .startKycSession, .createUploadURL, .uploadDocument, .submitSession:
            return .post
        }
    }

    var body: Data? {
        let encoder = JSONEncoder()

        switch self {
        case .kycStatus, .submitSession:
            return nil
        case .startKycSession(let provider):
            return try? encoder.encode(StartKycSessionRequest(provider: provider))
        case .createUploadURL(
            let sessionId,
            let documentType,
            let fileName,
            let contentType,
            let contentLength,
            let checksumSha256
        ):
            return try? encoder.encode(
                CreateUploadURLRequest(
                    sessionId: sessionId,
                    documentType: documentType,
                    fileName: fileName,
                    contentType: contentType,
                    contentLength: contentLength,
                    checksumSha256: checksumSha256
                )
            )
        case .uploadDocument(let sessionId, let documentType, let objectKey, let checksumSha256, let metadata):
            return try? encoder.encode(
                UploadDocumentRequest(
                    sessionId: sessionId,
                    documentType: documentType,
                    objectKey: objectKey,
                    checksumSha256: checksumSha256,
                    metadata: metadata
                )
            )
        }
    }

    var requiresAuth: Bool { true }
}

private struct StartKycSessionRequest: Encodable {
    let provider: String
}

private struct CreateUploadURLRequest: Encodable {
    let sessionId: String
    let documentType: String
    let fileName: String
    let contentType: String
    let contentLength: Int
    let checksumSha256: String
}

private struct UploadDocumentRequest: Encodable {
    let sessionId: String
    let documentType: String
    let objectKey: String
    let checksumSha256: String
    let metadata: [String: String]
}
