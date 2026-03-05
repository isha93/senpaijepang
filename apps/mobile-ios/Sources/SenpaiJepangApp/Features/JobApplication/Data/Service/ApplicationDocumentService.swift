import Foundation

@MainActor
final class ApplicationDocumentService: ApplicationDocumentServiceProtocol {
    typealias UploadHandler = @Sendable (ApplicationDocumentUploadRequest) async throws -> ApplicationDocument
    typealias ListHandler = @Sendable (String) async throws -> [ApplicationDocument]

    private let uploadHandler: UploadHandler
    private let listHandler: ListHandler

    init(uploadHandler: @escaping UploadHandler, listHandler: @escaping ListHandler) {
        self.uploadHandler = uploadHandler
        self.listHandler = listHandler
    }

    func uploadDocument(_ request: ApplicationDocumentUploadRequest) async throws -> ApplicationDocument {
        try await uploadHandler(request)
    }

    func listDocuments(applicationId: String) async throws -> [ApplicationDocument] {
        try await listHandler(applicationId)
    }
}
