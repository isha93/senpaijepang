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
                return dto.toJobDetail()
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
}

private enum AppError: Error {
    case notImplemented
    case notFound
}
