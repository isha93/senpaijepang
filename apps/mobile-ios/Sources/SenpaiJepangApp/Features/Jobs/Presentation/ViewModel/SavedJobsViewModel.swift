import Combine
import Foundation

@MainActor
final class SavedJobsViewModel: ObservableObject, ManagedTask {
    @Published var savedJobs: [Job]
    @Published var isLoading: Bool
    @Published var errorMessage: String?

    private let jobService: JobServiceProtocol
    private let navigation: NavigationHandling

    init(
        jobService: JobServiceProtocol,
        navigation: NavigationHandling
    ) {
        self.jobService = jobService
        self.navigation = navigation
        self.savedJobs = []
        self.isLoading = false
        self.errorMessage = nil
    }

    func loadSavedJobs() async {
        if let result = await executeTask({
            try await self.jobService.fetchSavedJobs()
        }) {
            savedJobs = result
        }
    }

    func selectJob(_ job: Job) {
        navigation.push(.jobDetail(jobId: job.id))
    }

    func unsaveJob(_ job: Job) async {
        if let updated = await executeTask({
            try await self.jobService.toggleSaveJob(jobId: job.id)
        }) {
            savedJobs.removeAll { $0.id == updated.id }
        }
    }
}
