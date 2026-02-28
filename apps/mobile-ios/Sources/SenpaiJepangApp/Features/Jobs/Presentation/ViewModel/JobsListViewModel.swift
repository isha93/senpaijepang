import Combine
import Foundation

@MainActor
final class JobsListViewModel: ObservableObject, ManagedTask {
    @Published var jobs: [Job]
    @Published var isLoading: Bool
    @Published var errorMessage: String?
    @Published var searchText: String
    @Published var selectedFilter: String
    @Published var selectedTab: Int

    let filterOptions = ["All Jobs", "Location", "TG Sector", "Salary"]

    private let jobService: JobServiceProtocol
    private let navigation: NavigationHandling

    init(
        jobService: JobServiceProtocol,
        navigation: NavigationHandling
    ) {
        self.jobService = jobService
        self.navigation = navigation
        self.jobs = []
        self.isLoading = false
        self.errorMessage = nil
        self.searchText = ""
        self.selectedFilter = "All Jobs"
        self.selectedTab = 0
    }

    func loadJobs() async {
        if let result = await executeTask({
            try await self.jobService.fetchJobs()
        }) {
            jobs = result.isEmpty ? Self.mockJobs : result
        } else {
            jobs = Self.mockJobs
        }
    }

    func selectJob(_ job: Job) {
        navigation.push(.jobDetail(jobId: job.id))
    }

    func openSavedJobs() {
        navigation.push(.savedJobs)
    }

    func toggleSave(_ job: Job) async {
        if let updated = await executeTask({
            try await self.jobService.toggleSaveJob(jobId: job.id)
        }) {
            if let index = jobs.firstIndex(where: { $0.id == updated.id }) {
                jobs[index] = updated
            }
        }
    }

    // MARK: - Mock Data
    static let mockJobs: [Job] = [
        Job(
            id: "1",
            title: "Construction Skilled Worker",
            companyName: "Tokyo Build Corp",
            location: "Shinjuku, Tokyo",
            salaryRange: "¥220,000/mo",
            isSaved: false,
            sector: "Construction",
            postedAt: Date().addingTimeInterval(-2 * 86400),
            companyLogoInitial: "T",
            isVerifiedEmployer: true
        ),
        Job(
            id: "2",
            title: "Food Processing Staff",
            companyName: "Osaka Foods Ltd.",
            location: "Osaka",
            salaryRange: "¥190,000/mo",
            isSaved: false,
            sector: "Food Service",
            postedAt: Date().addingTimeInterval(-5 * 3600),
            companyLogoInitial: "O",
            isVerifiedEmployer: true
        ),
        Job(
            id: "3",
            title: "Care Worker (Kaigo)",
            companyName: "Kyoto Care Home",
            location: "Kyoto",
            salaryRange: "¥240,000/mo",
            isSaved: false,
            sector: "Nursing Care",
            postedAt: Date().addingTimeInterval(-1 * 86400),
            companyLogoInitial: "K",
            isVerifiedEmployer: true
        ),
        Job(
            id: "4",
            title: "Agriculture Worker",
            companyName: "Green Fields Co.",
            location: "Hokkaido",
            salaryRange: "¥180,000/mo",
            isSaved: false,
            sector: "Agriculture",
            postedAt: Date().addingTimeInterval(-3 * 86400),
            companyLogoInitial: "G",
            isVerifiedEmployer: false
        ),
    ]
}
