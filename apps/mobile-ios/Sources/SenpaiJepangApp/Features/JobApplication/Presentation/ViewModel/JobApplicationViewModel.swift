import Foundation
import SwiftUI
import Combine
import UniformTypeIdentifiers

@MainActor
final class JobApplicationViewModel: ObservableObject {
    @Published var currentStep: Int = 0
    @Published var coverLetterText: String = ""
    @Published var isSubmitting: Bool = false
    @Published var submissionSuccess: Bool = false
    @Published var errorMessage: String? = nil
    @Published private(set) var isUploadingCV: Bool = false
    @Published private(set) var cvDocument: ApplicationDocument?

    let totalSteps = 3
    let job: Job
    private let journeyService: JourneyServiceProtocol
    private let applicationDocumentService: ApplicationDocumentServiceProtocol
    private let navigation: NavigationHandling
    private var submittedApplicationId: String?

    var onDismiss: (() -> Void)?

    init(
        job: Job,
        journeyService: JourneyServiceProtocol,
        applicationDocumentService: ApplicationDocumentServiceProtocol,
        navigation: NavigationHandling
    ) {
        self.job = job
        self.journeyService = journeyService
        self.applicationDocumentService = applicationDocumentService
        self.navigation = navigation
    }

    var isPrimaryActionDisabled: Bool {
        isSubmitting || isUploadingCV
    }

    var cvFileName: String {
        cvDocument?.fileName ?? "Belum ada CV terunggah"
    }

    var cvMetaDescription: String {
        guard let cvDocument else {
            return "Pilih file PDF/JPG/PNG dari perangkat Anda"
        }
        let size = Self.byteFormatter.string(fromByteCount: Int64(cvDocument.contentLength))
        return "\(size) • \(reviewStatusText(cvDocument.reviewStatus))"
    }

    var hasUploadedCV: Bool {
        cvDocument != nil
    }

    var cvReviewReason: String? {
        cvDocument?.reviewReason
    }

    func nextStep() {
        withAnimation(AppTheme.animationDefault) {
            if currentStep < totalSteps - 1 {
                currentStep += 1
            }
        }
    }

    func previousStep() {
        withAnimation(AppTheme.animationDefault) {
            if currentStep > 0 {
                currentStep -= 1
            } else {
                navigation.dismissApplication()
            }
        }
    }

    func submitApplication() {
        guard !isSubmitting else { return }
        isSubmitting = true
        errorMessage = nil
        Task {
            defer { isSubmitting = false }
            do {
                _ = try await ensureApplicationId()
                withAnimation(AppTheme.animationDefault) {
                    submissionSuccess = true
                }
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    func uploadCV(from url: URL) {
        guard !isUploadingCV else { return }
        Task {
            await uploadCVTask(from: url)
        }
    }

    func setErrorMessage(_ message: String?) {
        errorMessage = message
    }

    func finishFlow() {
        navigation.dismissApplication()
        navigation.push(
            .applicationJourney(applicationId: submittedApplicationId ?? job.id)
        )
    }

    private func ensureApplicationId() async throws -> String {
        if let submittedApplicationId {
            return submittedApplicationId
        }
        let journey = try await journeyService.applyJob(jobId: job.id)
        submittedApplicationId = journey.applicationId
        return journey.applicationId
    }

    private func uploadCVTask(from url: URL) async {
        isUploadingCV = true
        errorMessage = nil

        defer {
            isUploadingCV = false
        }

        do {
            let localFile = try await readLocalFile(from: url)
            let applicationId = try await ensureApplicationId()
            let request = ApplicationDocumentUploadRequest(
                applicationId: applicationId,
                documentType: "CV",
                fileName: localFile.fileName,
                contentType: localFile.contentType,
                data: localFile.data
            )

            let uploadedDocument = try await applicationDocumentService.uploadDocument(request)
            cvDocument = uploadedDocument
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func readLocalFile(from url: URL) async throws -> LocalFile {
        let didAccessSecurityScopedResource = url.startAccessingSecurityScopedResource()
        defer {
            if didAccessSecurityScopedResource {
                url.stopAccessingSecurityScopedResource()
            }
        }

        let data = try await Task.detached(priority: .userInitiated) {
            try Data(contentsOf: url, options: [.mappedIfSafe])
        }.value

        guard !data.isEmpty else {
            throw JobApplicationError.emptyFile
        }

        let fileName = url.lastPathComponent.isEmpty ? "candidate-cv.pdf" : url.lastPathComponent
        let contentType = contentType(for: url)
        return LocalFile(fileName: fileName, contentType: contentType, data: data)
    }

    private func contentType(for url: URL) -> String {
        if let utType = UTType(filenameExtension: url.pathExtension.lowercased()),
           let preferredMimeType = utType.preferredMIMEType {
            return preferredMimeType
        }
        return "application/octet-stream"
    }

    private func reviewStatusText(_ status: ApplicationDocumentReviewStatus) -> String {
        switch status {
        case .pending:
            return "Menunggu review admin"
        case .valid:
            return "Dokumen valid"
        case .invalid:
            return "Perlu perbaikan dokumen"
        }
    }

    private struct LocalFile {
        let fileName: String
        let contentType: String
        let data: Data
    }

    private enum JobApplicationError: LocalizedError {
        case emptyFile

        var errorDescription: String? {
            switch self {
            case .emptyFile:
                return "File yang dipilih kosong."
            }
        }
    }

    private static let byteFormatter: ByteCountFormatter = {
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        formatter.allowedUnits = [.useKB, .useMB]
        formatter.includesUnit = true
        formatter.isAdaptive = true
        return formatter
    }()
}
