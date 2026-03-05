import Foundation

enum ApplicationDocumentEndpoint: APIEndpoint {
    case createUploadURL(
        applicationId: String,
        documentType: String,
        fileName: String,
        contentType: String,
        contentLength: Int,
        checksumSha256: String
    )
    case registerDocument(
        applicationId: String,
        documentType: String,
        fileName: String,
        contentType: String,
        contentLength: Int,
        objectKey: String,
        checksumSha256: String
    )
    case listDocuments(applicationId: String)

    var path: String {
        switch self {
        case .createUploadURL(let applicationId, _, _, _, _, _):
            return "/v1/users/me/applications/\(applicationId)/documents/upload-url"
        case .registerDocument(let applicationId, _, _, _, _, _, _):
            return "/v1/users/me/applications/\(applicationId)/documents"
        case .listDocuments(let applicationId):
            return "/v1/users/me/applications/\(applicationId)/documents"
        }
    }

    var method: HTTPMethod {
        switch self {
        case .listDocuments:
            return .get
        case .createUploadURL, .registerDocument:
            return .post
        }
    }

    var body: Data? {
        let encoder = JSONEncoder()
        switch self {
        case .listDocuments:
            return nil
        case .createUploadURL(_, let documentType, let fileName, let contentType, let contentLength, let checksumSha256):
            return try? encoder.encode(
                ApplicationDocumentCreateUploadURLRequest(
                    documentType: documentType,
                    fileName: fileName,
                    contentType: contentType,
                    contentLength: contentLength,
                    checksumSha256: checksumSha256
                )
            )
        case .registerDocument(_, let documentType, let fileName, let contentType, let contentLength, let objectKey, let checksumSha256):
            return try? encoder.encode(
                ApplicationDocumentRegisterRequest(
                    documentType: documentType,
                    fileName: fileName,
                    contentType: contentType,
                    contentLength: contentLength,
                    objectKey: objectKey,
                    checksumSha256: checksumSha256
                )
            )
        }
    }

    var requiresAuth: Bool { true }
}

private struct ApplicationDocumentCreateUploadURLRequest: Encodable {
    let documentType: String
    let fileName: String
    let contentType: String
    let contentLength: Int
    let checksumSha256: String
}

private struct ApplicationDocumentRegisterRequest: Encodable {
    let documentType: String
    let fileName: String
    let contentType: String
    let contentLength: Int
    let objectKey: String
    let checksumSha256: String
}

struct ApplicationDocumentUploadURLResponseDTO: Decodable {
    let applicationId: String
    let upload: ApplicationDocumentUploadDescriptorDTO
}

struct ApplicationDocumentUploadDescriptorDTO: Decodable {
    let objectKey: String
    let uploadUrl: String
    let method: String
    let headers: [String: String]
    let expiresAt: String
}

struct ApplicationDocumentRegisterResponseDTO: Decodable {
    let applicationId: String
    let document: ApplicationDocumentDTO
}

struct ApplicationDocumentListResponseDTO: Decodable {
    let items: [ApplicationDocumentDTO]
    let total: Int
}

struct ApplicationDocumentDTO: Decodable {
    let id: String
    let applicationId: String
    let userId: String
    let documentType: String
    let fileName: String
    let contentType: String
    let contentLength: Int
    let checksumSha256: String
    let reviewStatus: String
    let reviewReason: String?
    let reviewedAt: String?
    let reviewedBy: String?
    let createdAt: String
    let updatedAt: String

    func toApplicationDocument() -> ApplicationDocument {
        let normalizedStatus = ApplicationDocumentReviewStatus(rawValue: reviewStatus.uppercased()) ?? .pending
        return ApplicationDocument(
            id: id,
            applicationId: applicationId,
            documentType: documentType,
            fileName: fileName,
            contentType: contentType,
            contentLength: contentLength,
            checksumSha256: checksumSha256,
            reviewStatus: normalizedStatus,
            reviewReason: reviewReason,
            reviewedAt: reviewedAt,
            reviewedBy: reviewedBy,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }
}
