import Combine
import Foundation

@MainActor
public final class JobsListViewModel: ObservableObject, ManagedTask {
    @Published public var jobs: [Job]
    @Published public var isLoading: Bool
    @Published public var errorMessage: String?
    @Published public var searchText: String
    @Published public var selectedFilter: String
    @Published public var selectedTab: Int

    public let filterOptions = ["All Jobs", "Location", "TG Sector", "Salary"]

    private let jobService: JobServiceProtocol
    private let navigation: NavigationHandling

    public init(
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

    public func loadJobs() async {
        if let result = await executeTask({
            try await self.jobService.fetchJobs()
        }) {
            jobs = result.isEmpty ? Self.mockJobs : result
        } else {
            jobs = Self.mockJobs
        }
    }

    public func selectJob(_ job: Job) {
        navigation.push(.jobDetail(jobId: job.id))
    }

    public func openSavedJobs() {
        navigation.push(.savedJobs)
    }

    public func toggleSave(_ job: Job) async {
        if let updated = await executeTask({
            try await self.jobService.toggleSaveJob(jobId: job.id)
        }) {
            if let index = jobs.firstIndex(where: { $0.id == updated.id }) {
                jobs[index] = updated
            }
        }
    }

    // MARK: - Mock Data
    public static let mockJobs: [Job] = [
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
