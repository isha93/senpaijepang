import Foundation
import CryptoKit
import SwiftUI
import netfox

@main
struct SenpaiJepangApp: App {
    @StateObject private var container = AppContainer()

    init() {
        NFX.sharedInstance().start()
    }

    var body: some Scene {
        WindowGroup {
            AppRootView(
                authService: container.authService,
                jobService: container.jobService,
                journeyService: container.journeyService,
                profileService: container.profileService,
                verificationService: container.verificationService,
                applicationDocumentService: container.applicationDocumentService,
                feedService: container.feedService
            )
        }
    }
}

// MARK: - Dependency Container

/// Holds all service instances. @MainActor so it can safely reference AuthStateManager.shared.
@MainActor
private final class AppContainer: ObservableObject {
    let apiClient: APIClient
    let authService: AuthService
    let jobService: JobService
    let journeyService: JourneyService
    let profileService: ProfileService
    let verificationService: VerificationService
    let applicationDocumentService: ApplicationDocumentService
    let feedService: FeedService

    init() {
        let client = APIClient(tokenProvider: AuthStateManager.shared)
        self.apiClient = client

        self.authService = AuthService(
            loginHandler: { email, password in
                let dto = try await client.request(
                    AuthEndpoint.login(email: email, password: password),
                    responseType: AuthResponseDTO.self
                )
                return dto.toSession()
            },
            registerHandler: { fullName, email, password in
                let dto = try await client.request(
                    AuthEndpoint.register(fullName: fullName, email: email, password: password),
                    responseType: AuthResponseDTO.self
                )
                return dto.toSession()
            },
            sendEmailVerificationHandler: { accessToken, email, purpose in
                let dto = try await client.request(
                    AuthEndpoint.sendEmailVerification(
                        accessToken: accessToken,
                        email: email,
                        purpose: purpose
                    ),
                    responseType: EmailVerificationChallengeResponseDTO.self
                )
                return dto.toChallenge()
            },
            resendEmailVerificationHandler: { accessToken, email, purpose in
                let dto = try await client.request(
                    AuthEndpoint.resendEmailVerification(
                        accessToken: accessToken,
                        email: email,
                        purpose: purpose
                    ),
                    responseType: EmailVerificationChallengeResponseDTO.self
                )
                return dto.toChallenge()
            },
            verifyEmailVerificationHandler: { accessToken, email, code, purpose in
                let dto = try await client.request(
                    AuthEndpoint.verifyEmailVerification(
                        accessToken: accessToken,
                        email: email,
                        code: code,
                        purpose: purpose
                    ),
                    responseType: EmailVerificationVerifyResponseDTO.self
                )
                return dto.toResult()
            }
        )

        self.jobService = JobService(
            fetchJobsHandler: { [client] in
                let dto = try await client.request(
                    JobEndpoint.list,
                    responseType: JobListResponseDTO.self
                )
                return dto.items.map { $0.toJob() }
            },
            fetchJobDetailHandler: { [client] jobId in
                let dto = try await client.request(
                    JobEndpoint.detail(jobId: jobId),
                    responseType: JobDetailResponseDTO.self
                )
                let baseDetail = dto.toJobDetail()
                let effectiveCanApply = await AppContainer.resolveApplyEligibility(
                    detailDTO: dto,
                    client: client
                )
                return JobDetail(
                    job: baseDetail.job,
                    description: baseDetail.description,
                    requirements: baseDetail.requirements,
                    benefits: baseDetail.benefits,
                    employmentType: baseDetail.employmentType,
                    isVisaSponsored: baseDetail.isVisaSponsored,
                    locationDetail: baseDetail.locationDetail,
                    canApply: effectiveCanApply,
                    applyCta: effectiveCanApply ? baseDetail.applyCta : nil
                )
            },
            toggleSaveHandler: { [client] jobId in
                // Fetch current state, then save or unsave accordingly
                let detailDto = try await client.request(
                    JobEndpoint.detail(jobId: jobId),
                    responseType: JobDetailResponseDTO.self
                )
                let wasSaved = detailDto.viewerState?.saved ?? false
                if wasSaved {
                    try await client.request(JobEndpoint.unsaveJob(jobId: jobId))
                } else {
                    try await client.request(JobEndpoint.saveJob(jobId: jobId))
                }
                return detailDto.toJobDetail(isSavedOverride: !wasSaved).job
            },
            fetchSavedJobsHandler: { [client] in
                let dto = try await client.request(
                    JobEndpoint.savedJobs,
                    responseType: JobListResponseDTO.self
                )
                return dto.items.map { $0.toJob() }
            }
        )

        self.journeyService = JourneyService(
            applyHandler: { [client] jobId in
                async let applyDto = client.request(
                    JobEndpoint.applyJob(jobId: jobId),
                    responseType: ApplyJobResponseDTO.self
                )
                async let jobDto = client.request(
                    JobEndpoint.detail(jobId: jobId),
                    responseType: JobDetailResponseDTO.self
                )
                let (apply, detail) = try await (applyDto, jobDto)
                return apply.toApplicationJourney(
                    jobTitle: detail.job.title,
                    companyName: detail.job.employer.name,
                    jobLocation: detail.job.location.displayLabel
                )
            },
            fetchHandler: { [client] applicationId in
                let dto = try await client.request(
                    JobEndpoint.myApplications,
                    responseType: ApplicationListResponseDTO.self
                )
                // Empty ID = Journey tab requesting latest application
                let item: ApplicationItemDTO?
                if applicationId.isEmpty {
                    item = dto.items.first
                } else {
                    item = dto.items.first(where: {
                        $0.id == applicationId || $0.jobId == applicationId
                    })
                }
                guard let item else { throw AppError.notFound }
                return item.toApplicationJourney()
            }
        )

        self.profileService = ProfileService(
            fetchHandler: { [client] in
                let dto = try await client.request(
                    ProfileEndpoint.fetchProfile,
                    responseType: ProfileResponseDTO.self
                )
                return dto.profile.toUserProfile()
            },
            updateHandler: { [client] profile in
                let dto = try await client.request(
                    ProfileEndpoint.updateProfile(fullName: profile.fullName, avatarUrl: nil),
                    responseType: ProfileResponseDTO.self
                )
                return dto.profile.toUserProfile()
            }
        )

        self.verificationService = VerificationService(
            uploadHandler: { [client] request in
                let sessionId = try await AppContainer.resolveWritableKycSessionId(client: client)
                let checksum = request.data.sha256HexDigest()

                let uploadResponse = try await client.request(
                    IdentityEndpoint.createUploadURL(
                        sessionId: sessionId,
                        documentType: request.documentType,
                        fileName: request.fileName,
                        contentType: request.contentType,
                        contentLength: request.data.count,
                        checksumSha256: checksum
                    ),
                    responseType: KycUploadURLResponseDTO.self
                )

                try await uploadToPresignedURL(
                    data: request.data,
                    descriptor: uploadResponse.upload,
                    fallbackContentType: request.contentType
                )

                _ = try await client.request(
                    IdentityEndpoint.uploadDocument(
                        sessionId: sessionId,
                        documentType: request.documentType,
                        objectKey: uploadResponse.upload.objectKey,
                        checksumSha256: checksum,
                        metadata: request.metadata
                    ),
                    responseType: KycDocumentUploadResponseDTO.self
                )

                let submitResponse = try await client.request(
                    IdentityEndpoint.submitSession(sessionId: sessionId),
                    responseType: KycSessionEnvelopeDTO.self
                )

                return VerificationUploadResult(
                    trustStatus: submitResponse.status,
                    rawSessionStatus: submitResponse.session.status,
                    sessionId: submitResponse.session.id
                )
            }
        )

        self.applicationDocumentService = ApplicationDocumentService(
            uploadHandler: { [client] request in
                let checksum = request.data.sha256HexDigest()
                let uploadResponse = try await client.request(
                    ApplicationDocumentEndpoint.createUploadURL(
                        applicationId: request.applicationId,
                        documentType: request.documentType,
                        fileName: request.fileName,
                        contentType: request.contentType,
                        contentLength: request.data.count,
                        checksumSha256: checksum
                    ),
                    responseType: ApplicationDocumentUploadURLResponseDTO.self
                )

                try await uploadToPresignedURL(
                    data: request.data,
                    descriptor: uploadResponse.upload,
                    fallbackContentType: request.contentType
                )

                let registerResponse = try await client.request(
                    ApplicationDocumentEndpoint.registerDocument(
                        applicationId: request.applicationId,
                        documentType: request.documentType,
                        fileName: request.fileName,
                        contentType: request.contentType,
                        contentLength: request.data.count,
                        objectKey: uploadResponse.upload.objectKey,
                        checksumSha256: checksum
                    ),
                    responseType: ApplicationDocumentRegisterResponseDTO.self
                )

                return registerResponse.document.toApplicationDocument()
            },
            listHandler: { [client] applicationId in
                let response = try await client.request(
                    ApplicationDocumentEndpoint.listDocuments(applicationId: applicationId),
                    responseType: ApplicationDocumentListResponseDTO.self
                )
                return response.items.map { $0.toApplicationDocument() }
            }
        )

        self.feedService = FeedService(
            fetchHandler: { [client] in
                let dto = try await client.request(
                    FeedEndpoint.fetchPosts,
                    responseType: FeedListResponseDTO.self
                )
                return dto.items.map { $0.toFeedPost() }
            },
            toggleSaveHandler: { _ in
                // No save endpoint yet — ViewModel falls back to local toggle
                throw AppError.notImplemented
            }
        )
    }

    private static func resolveWritableKycSessionId(client: APIClient) async throws -> String {
        let status = try await client.request(
            IdentityEndpoint.kycStatus,
            responseType: KycStatusResponseDTO.self
        )

        if let existingSession = status.session {
            let rawStatus = existingSession.status.uppercased()
            if rawStatus != "VERIFIED" && rawStatus != "REJECTED" {
                return existingSession.id
            }
        }

        let created = try await client.request(
            IdentityEndpoint.startKycSession(provider: "manual"),
            responseType: KycSessionEnvelopeDTO.self
        )
        return created.session.id
    }

    private static func resolveApplyEligibility(
        detailDTO: JobDetailResponseDTO,
        client: APIClient
    ) async -> Bool {
        guard let viewerState = detailDTO.viewerState,
              viewerState.authenticated,
              viewerState.canApply else {
            return false
        }

        do {
            let status = try await client.request(
                IdentityEndpoint.kycStatus,
                responseType: KycStatusResponseDTO.self
            )
            return isKycVerified(status)
        } catch {
            return false
        }
    }

    private static func isKycVerified(_ status: KycStatusResponseDTO) -> Bool {
        let trustStatus = status.status.uppercased()
        if trustStatus == "VERIFIED" || trustStatus == "APPROVED" {
            return true
        }

        guard let sessionStatus = status.session?.status.uppercased() else {
            return false
        }
        return sessionStatus == "VERIFIED" || sessionStatus == "APPROVED"
    }
}

private func uploadToPresignedURL(
    data: Data,
    descriptor: KycUploadDescriptorDTO,
    fallbackContentType: String
) async throws {
    guard let url = URL(string: descriptor.uploadUrl) else {
        throw AppError.invalidUploadURL
    }

    var request = URLRequest(url: url)
    request.httpMethod = descriptor.method.isEmpty ? "PUT" : descriptor.method
    request.httpBody = data

    var hasContentType = false
    for (key, value) in descriptor.headers {
        if key.lowercased() == "content-type" {
            hasContentType = true
        }
        request.setValue(value, forHTTPHeaderField: key)
    }
    if !hasContentType {
        request.setValue(fallbackContentType, forHTTPHeaderField: "Content-Type")
    }

    let (responseData, response) = try await URLSession.shared.data(for: request)
    guard let httpResponse = response as? HTTPURLResponse else {
        throw AppError.uploadFailed(statusCode: -1, responseBody: nil)
    }
    guard (200...299).contains(httpResponse.statusCode) else {
        let body = String(data: responseData, encoding: .utf8)
        throw AppError.uploadFailed(statusCode: httpResponse.statusCode, responseBody: body)
    }
}

private func uploadToPresignedURL(
    data: Data,
    descriptor: ApplicationDocumentUploadDescriptorDTO,
    fallbackContentType: String
) async throws {
    guard let url = URL(string: descriptor.uploadUrl) else {
        throw AppError.invalidUploadURL
    }

    var request = URLRequest(url: url)
    request.httpMethod = descriptor.method.isEmpty ? "PUT" : descriptor.method
    request.httpBody = data

    var hasContentType = false
    for (key, value) in descriptor.headers {
        if key.lowercased() == "content-type" {
            hasContentType = true
        }
        request.setValue(value, forHTTPHeaderField: key)
    }
    if !hasContentType {
        request.setValue(fallbackContentType, forHTTPHeaderField: "Content-Type")
    }

    let (responseData, response) = try await URLSession.shared.data(for: request)
    guard let httpResponse = response as? HTTPURLResponse else {
        throw AppError.uploadFailed(statusCode: -1, responseBody: nil)
    }
    guard (200...299).contains(httpResponse.statusCode) else {
        let body = String(data: responseData, encoding: .utf8)
        throw AppError.uploadFailed(statusCode: httpResponse.statusCode, responseBody: body)
    }
}

private extension Data {
    func sha256HexDigest() -> String {
        let digest = SHA256.hash(data: self)
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}

private enum AppError: LocalizedError {
    case notImplemented
    case notFound
    case invalidUploadURL
    case uploadFailed(statusCode: Int, responseBody: String?)

    var errorDescription: String? {
        switch self {
        case .notImplemented:
            return "Feature not implemented yet."
        case .notFound:
            return "Resource not found."
        case .invalidUploadURL:
            return "Upload URL is invalid."
        case .uploadFailed(let statusCode, let responseBody):
            if let responseBody, !responseBody.isEmpty {
                return "Upload failed (\(statusCode)): \(responseBody)"
            }
            return "Upload failed with status \(statusCode)."
        }
    }
}
