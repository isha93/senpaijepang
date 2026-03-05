import Foundation

enum ApplicationDocumentReviewStatus: String, Sendable, Equatable {
    case pending = "PENDING"
    case valid = "VALID"
    case invalid = "INVALID"
}

struct ApplicationDocument: Equatable, Sendable, Identifiable {
    let id: String
    let applicationId: String
    let documentType: String
    let fileName: String
    let contentType: String
    let contentLength: Int
    let checksumSha256: String
    let reviewStatus: ApplicationDocumentReviewStatus
    let reviewReason: String?
    let reviewedAt: String?
    let reviewedBy: String?
    let createdAt: String
    let updatedAt: String
}

struct ApplicationDocumentUploadRequest: Sendable {
    let applicationId: String
    let documentType: String
    let fileName: String
    let contentType: String
    let data: Data
}

@MainActor
protocol ApplicationDocumentServiceProtocol {
    func uploadDocument(_ request: ApplicationDocumentUploadRequest) async throws -> ApplicationDocument
    func listDocuments(applicationId: String) async throws -> [ApplicationDocument]
}
