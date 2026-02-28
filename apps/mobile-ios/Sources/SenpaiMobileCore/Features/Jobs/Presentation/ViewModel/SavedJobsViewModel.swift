import Combine
import Foundation

@MainActor
public final class SavedJobsViewModel: ObservableObject, ManagedTask {
    @Published public var savedJobs: [Job]
    @Published public var isLoading: Bool
    @Published public var errorMessage: String?

    private let jobService: JobServiceProtocol
    private let navigation: NavigationHandling

    public init(
        jobService: JobServiceProtocol,
        navigation: NavigationHandling
    ) {
        self.jobService = jobService
        self.navigation = navigation
        self.savedJobs = []
        self.isLoading = false
        self.errorMessage = nil
    }

    public func loadSavedJobs() async {
        if let result = await executeTask({
            try await self.jobService.fetchSavedJobs()
        }) {
            savedJobs = result
        }
    }

    public func selectJob(_ job: Job) {
        navigation.push(.jobDetail(jobId: job.id))
    }

    public func unsaveJob(_ job: Job) async {
        if let updated = await executeTask({
            try await self.jobService.toggleSaveJob(jobId: job.id)
        }) {
            savedJobs.removeAll { $0.id == updated.id }
        }
    }
}
