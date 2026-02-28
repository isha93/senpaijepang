import Combine
import Foundation

@MainActor
final class JobsListViewModel: ObservableObject, ManagedTask {
    @Published var allJobs: [Job]
    @Published var isLoading: Bool
    @Published var errorMessage: String?
    @Published var searchText: String
    @Published var selectedFilter: String
    @Published var selectedTab: Int

    let filterOptions = ["All Jobs", "Construction", "Food Service", "Nursing Care", "Agriculture", "Hospitality", "Manufacturing"]

    /// Filtered jobs based on selected filter and search text
    var jobs: [Job] {
        var filtered = allJobs

        if selectedFilter != "All Jobs" {
            filtered = filtered.filter { $0.sector == selectedFilter }
        }

        if !searchText.isEmpty {
            let query = searchText.lowercased()
            filtered = filtered.filter {
                $0.title.lowercased().contains(query) ||
                $0.companyName.lowercased().contains(query) ||
                $0.location.lowercased().contains(query) ||
                ($0.sector?.lowercased().contains(query) ?? false)
            }
        }

        // Tab: "My Jobs" shows only saved
        if selectedTab == 1 {
            filtered = filtered.filter { $0.isSaved }
        }

        return filtered
    }

    private let jobService: JobServiceProtocol
    private let navigation: NavigationHandling

    init(
        jobService: JobServiceProtocol,
        navigation: NavigationHandling
    ) {
        self.jobService = jobService
        self.navigation = navigation
        self.allJobs = []
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
            allJobs = result.isEmpty ? Self.mockJobs : result
        } else {
            allJobs = Self.mockJobs
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
            if let index = allJobs.firstIndex(where: { $0.id == updated.id }) {
                allJobs[index] = updated
            }
        } else if let index = allJobs.firstIndex(where: { $0.id == job.id }) {
            let j = allJobs[index]
            allJobs[index] = Job(
                id: j.id, title: j.title, companyName: j.companyName,
                location: j.location, salaryRange: j.salaryRange,
                isSaved: !j.isSaved, sector: j.sector, postedAt: j.postedAt,
                companyLogoInitial: j.companyLogoInitial, isVerifiedEmployer: j.isVerifiedEmployer
            )
        }
    }

    // MARK: - Mock Data
    static let mockJobs: [Job] = [
        // Construction
        Job(
            id: "1",
            title: "Construction Skilled Worker (SSW)",
            companyName: "Tokyo Build Corp",
            location: "Shinjuku, Tokyo",
            salaryRange: "¥220,000 — ¥280,000/mo",
            isSaved: false,
            sector: "Construction",
            postedAt: Date().addingTimeInterval(-2 * 86400),
            companyLogoInitial: "T",
            isVerifiedEmployer: true
        ),
        Job(
            id: "2",
            title: "Scaffolding & Steel Frame Worker",
            companyName: "Kansai Construction Co.",
            location: "Osaka",
            salaryRange: "¥210,000 — ¥260,000/mo",
            isSaved: true,
            sector: "Construction",
            postedAt: Date().addingTimeInterval(-5 * 86400),
            companyLogoInitial: "K",
            isVerifiedEmployer: true
        ),

        // Food Service
        Job(
            id: "3",
            title: "Food Processing Staff",
            companyName: "Osaka Foods Ltd.",
            location: "Namba, Osaka",
            salaryRange: "¥190,000 — ¥230,000/mo",
            isSaved: false,
            sector: "Food Service",
            postedAt: Date().addingTimeInterval(-1 * 86400),
            companyLogoInitial: "O",
            isVerifiedEmployer: true
        ),
        Job(
            id: "4",
            title: "Restaurant Kitchen Staff",
            companyName: "Ichiban Ramen Chain",
            location: "Shibuya, Tokyo",
            salaryRange: "¥200,000 — ¥250,000/mo",
            isSaved: false,
            sector: "Food Service",
            postedAt: Date().addingTimeInterval(-3 * 86400),
            companyLogoInitial: "I",
            isVerifiedEmployer: false
        ),

        // Nursing Care
        Job(
            id: "5",
            title: "Care Worker (Kaigo) — Day Shift",
            companyName: "Kyoto Care Home",
            location: "Kyoto",
            salaryRange: "¥240,000 — ¥300,000/mo",
            isSaved: false,
            sector: "Nursing Care",
            postedAt: Date().addingTimeInterval(-1 * 86400),
            companyLogoInitial: "K",
            isVerifiedEmployer: true
        ),
        Job(
            id: "6",
            title: "Elderly Care Support Staff",
            companyName: "Sakura Senior Living",
            location: "Yokohama",
            salaryRange: "¥230,000 — ¥280,000/mo",
            isSaved: true,
            sector: "Nursing Care",
            postedAt: Date().addingTimeInterval(-4 * 86400),
            companyLogoInitial: "S",
            isVerifiedEmployer: true
        ),

        // Agriculture
        Job(
            id: "7",
            title: "Agriculture Worker — Seasonal",
            companyName: "Green Fields Co.",
            location: "Hokkaido",
            salaryRange: "¥180,000 — ¥220,000/mo",
            isSaved: false,
            sector: "Agriculture",
            postedAt: Date().addingTimeInterval(-3 * 86400),
            companyLogoInitial: "G",
            isVerifiedEmployer: false
        ),
        Job(
            id: "8",
            title: "Greenhouse Cultivation Staff",
            companyName: "Aichi Farm Group",
            location: "Nagoya, Aichi",
            salaryRange: "¥185,000 — ¥215,000/mo",
            isSaved: false,
            sector: "Agriculture",
            postedAt: Date().addingTimeInterval(-7 * 86400),
            companyLogoInitial: "A",
            isVerifiedEmployer: true
        ),

        // Hospitality
        Job(
            id: "9",
            title: "Hotel Front Desk Staff",
            companyName: "Ginza Grand Hotel",
            location: "Ginza, Tokyo",
            salaryRange: "¥210,000 — ¥270,000/mo",
            isSaved: false,
            sector: "Hospitality",
            postedAt: Date().addingTimeInterval(-2 * 86400),
            companyLogoInitial: "G",
            isVerifiedEmployer: true
        ),
        Job(
            id: "10",
            title: "Housekeeping Supervisor",
            companyName: "Nara Ryokan Heritage",
            location: "Nara",
            salaryRange: "¥200,000 — ¥240,000/mo",
            isSaved: false,
            sector: "Hospitality",
            postedAt: Date().addingTimeInterval(-6 * 86400),
            companyLogoInitial: "N",
            isVerifiedEmployer: false
        ),

        // Manufacturing
        Job(
            id: "11",
            title: "Auto Parts Assembly Line Worker",
            companyName: "Aichi Motors Manufacturing",
            location: "Toyota, Aichi",
            salaryRange: "¥230,000 — ¥290,000/mo",
            isSaved: false,
            sector: "Manufacturing",
            postedAt: Date().addingTimeInterval(-1 * 86400),
            companyLogoInitial: "A",
            isVerifiedEmployer: true
        ),
        Job(
            id: "12",
            title: "Electronics Assembly Technician",
            companyName: "Fukuoka Tech Industries",
            location: "Fukuoka",
            salaryRange: "¥225,000 — ¥275,000/mo",
            isSaved: true,
            sector: "Manufacturing",
            postedAt: Date().addingTimeInterval(-4 * 86400),
            companyLogoInitial: "F",
            isVerifiedEmployer: true
        ),
        Job(
            id: "13",
            title: "Welding & Metal Fabrication Staff",
            companyName: "Kobe Steel Works",
            location: "Kobe, Hyogo",
            salaryRange: "¥240,000 — ¥310,000/mo",
            isSaved: false,
            sector: "Manufacturing",
            postedAt: Date().addingTimeInterval(-2 * 86400),
            companyLogoInitial: "K",
            isVerifiedEmployer: true
        ),
    ]
}
