import Foundation
import SwiftUI

struct VerificationUploadRequest: Sendable {
    let documentType: String
    let fileName: String
    let contentType: String
    let data: Data
    let metadata: [String: String]

    init(
        documentType: String,
        fileName: String,
        contentType: String,
        data: Data,
        metadata: [String: String] = [:]
    ) {
        self.documentType = documentType
        self.fileName = fileName
        self.contentType = contentType
        self.data = data
        self.metadata = metadata
    }
}

struct VerificationUploadResult: Sendable, Equatable {
    let trustStatus: String
    let rawSessionStatus: String
    let sessionId: String
}

@MainActor
protocol VerificationServiceProtocol {
    func uploadAndSubmitDocument(_ request: VerificationUploadRequest) async throws -> VerificationUploadResult
}

@MainActor
final class VerificationService: VerificationServiceProtocol {
    typealias UploadHandler = @Sendable (VerificationUploadRequest) async throws -> VerificationUploadResult

    private let uploadHandler: UploadHandler

    init(uploadHandler: @escaping UploadHandler) {
        self.uploadHandler = uploadHandler
    }

    func uploadAndSubmitDocument(_ request: VerificationUploadRequest) async throws -> VerificationUploadResult {
        try await uploadHandler(request)
    }
}

enum KYCStep: Int, CaseIterable {
    case welcome
    case scanningFront
    case uploading
}

@MainActor
final class KYCViewModel: ObservableObject, ManagedTask {
    @Published var currentStep: KYCStep = .welcome
    @Published var isFlashOn: Bool = false

    // ManagedTask requirements
    @Published var isLoading: Bool = false
    @Published var errorMessage: String? = nil

    // Uploading animation states
    @Published var isImageQualityChecked: Bool = false
    @Published var isEncryptionDone: Bool = false
    @Published var isConnectingFinished: Bool = false

    private let navigation: NavigationHandling
    private let verificationService: VerificationServiceProtocol
    private var uploadTask: Task<Void, Never>?

    init(navigation: NavigationHandling, verificationService: VerificationServiceProtocol) {
        self.navigation = navigation
        self.verificationService = verificationService
    }

    func startVerification() {
        withAnimation(AppTheme.animationDefault) {
            currentStep = .scanningFront
        }
    }

    func toggleFlash() {
        isFlashOn.toggle()
    }

    func captureImage() {
        let request = VerificationUploadRequest(
            documentType: "RESIDENCE_CARD_FRONT",
            fileName: "residence-card-front.png",
            contentType: "image/png",
            data: Self.placeholderPNGData,
            metadata: ["source": "ios_capture_button"]
        )
        beginUpload(with: request)
    }

    func cancelUpload() {
        uploadTask?.cancel()
        uploadTask = nil

        resetProgress()
        withAnimation(AppTheme.animationDefault) {
            currentStep = .welcome
        }
    }

    func close() {
        uploadTask?.cancel()
        navigation.pop()
    }

    private func beginUpload(with request: VerificationUploadRequest) {
        withAnimation(AppTheme.animationDefault) {
            currentStep = .uploading
        }
        startUploadProcess(request)
    }

    private func startUploadProcess(_ request: VerificationUploadRequest) {
        uploadTask?.cancel()

        uploadTask = Task { [weak self] in
            guard let self else { return }

            self.errorMessage = nil
            self.isLoading = true
            self.resetProgress()

            defer {
                self.isLoading = false
            }

            do {
                try await Task.sleep(nanoseconds: 900_000_000)
                guard self.currentStep == .uploading else { return }
                withAnimation { self.isImageQualityChecked = true }

                try await Task.sleep(nanoseconds: 800_000_000)
                guard self.currentStep == .uploading else { return }
                withAnimation { self.isEncryptionDone = true }

                _ = try await self.verificationService.uploadAndSubmitDocument(request)

                guard self.currentStep == .uploading else { return }
                withAnimation { self.isConnectingFinished = true }

                try await Task.sleep(nanoseconds: 700_000_000)
                guard self.currentStep == .uploading else { return }
                self.navigation.pop()
            } catch is CancellationError {
                return
            } catch {
                self.errorMessage = error.localizedDescription
            }
        }
    }

    private func resetProgress() {
        isImageQualityChecked = false
        isEncryptionDone = false
        isConnectingFinished = false
    }

    private static let placeholderPNGData: Data =
        Data(base64Encoded: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5YgX8AAAAASUVORK5CYII=")
        ?? Data("senpaijepang-kyc-placeholder".utf8)
}
