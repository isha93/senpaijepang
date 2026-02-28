import Combine
import Foundation

@MainActor
final class JobDetailViewModel: ObservableObject, ManagedTask {
    @Published var detail: JobDetail?
    @Published var isLoading: Bool
    @Published var errorMessage: String?

    let jobId: String
    private let jobService: JobServiceProtocol
    private let navigation: NavigationHandling

    init(
        jobId: String,
        jobService: JobServiceProtocol,
        navigation: NavigationHandling
    ) {
        self.jobId = jobId
        self.jobService = jobService
        self.navigation = navigation
        self.detail = nil
        self.isLoading = false
        self.errorMessage = nil
    }

    func loadDetail() async {
        if let result = await executeTask({
            try await self.jobService.fetchJobDetail(jobId: self.jobId)
        }) {
            detail = result
        } else {
            detail = Self.mockDetail
        }
    }

    func applyJob() {
        navigation.push(.applicationJourney(applicationId: jobId))
    }

    func goBack() {
        navigation.pop()
    }

    // MARK: - Mock Data
    static let mockDetail = JobDetail(
        job: Job(
            id: "mock-1",
            title: "Senior Welder",
            companyName: "Tokyo Construction Co.",
            location: "Tokyo, JP",
            salaryRange: "¥280,000/mo",
            isSaved: false,
            sector: "Construction",
            companyLogoInitial: "T",
            isVerifiedEmployer: true
        ),
        description: "We are looking for an experienced welder to join our infrastructure projects in Tokyo. You will be working on large-scale commercial buildings and bridges. The ideal candidate has experience with MIG and TIG welding techniques and is ready to relocate. We provide full support for your move and integration into our team.",
        requirements: [
            "Minimum 3 years of professional welding experience (MIG/TIG).",
            "Basic Japanese language proficiency (N4 or conversational).",
            "Valid heavy machinery license is a plus.",
            "Willingness to relocate to Tokyo for at least 2 years.",
        ],
        benefits: [
            "Visa sponsorship provided",
            "Housing support",
            "Japanese language classes",
        ],
        employmentType: "Full-time",
        isVisaSponsored: true,
        locationDetail: "Tokyo, JP"
    )
}
