import Combine
import Foundation

@MainActor
final class ApplicationJourneyViewModel: ObservableObject, ManagedTask {
    @Published var journey: ApplicationJourney?
    @Published var isLoading: Bool
    @Published var errorMessage: String?

    let applicationId: String
    private let journeyService: JourneyServiceProtocol
    private let navigation: NavigationHandling

    init(
        applicationId: String,
        journeyService: JourneyServiceProtocol,
        navigation: NavigationHandling
    ) {
        self.applicationId = applicationId
        self.journeyService = journeyService
        self.navigation = navigation
        self.journey = nil
        self.isLoading = false
        self.errorMessage = nil
    }

    func loadJourney() async {
        if let result = await executeTask({
            try await self.journeyService.fetchJourney(applicationId: self.applicationId)
        }) {
            journey = result
        } else {
            journey = Self.mockJourney
        }
    }

    func goBack() {
        navigation.pop()
    }

    var currentStepIndex: Int {
        guard let journey = journey else { return 0 }
        return journey.steps.firstIndex(where: { $0.completedAt == nil }) ?? journey.steps.count
    }

    // MARK: - Mock Data
    static let mockJourney = ApplicationJourney(
        applicationId: "app-001",
        jobTitle: "Construction Worker",
        companyName: "Shimizu Corp",
        currentStatus: .visaProcessing,
        steps: [
            ApplicationStep(
                id: "s1",
                status: .applied,
                title: "Application Submitted",
                completedAt: makeDate(2024, 1, 12)
            ),
            ApplicationStep(
                id: "s2",
                status: .interview,
                title: "Interview Passed",
                completedAt: makeDate(2024, 1, 24)
            ),
            ApplicationStep(
                id: "s3",
                status: .visaProcessing,
                title: "Visa Processing",
                estimatedCompletion: "Feb 15",
                subtitle: "Documents Verified"
            ),
            ApplicationStep(
                id: "s4",
                status: .visaIssued,
                title: "Visa Issued"
            ),
            ApplicationStep(
                id: "s5",
                status: .startWork,
                title: "Start Work"
            ),
        ],
        jobLocation: "Osaka, Japan",
        totalSteps: 5,
        recentUpdates: [
            RecentUpdate(id: "u1", title: "COE Application Received", date: "Yesterday, 10:30 AM", iconName: "envelope.fill"),
            RecentUpdate(id: "u2", title: "Health Check Uploaded", date: "Jan 28, 2024", iconName: "arrow.up.doc.fill"),
        ]
    )

    private static func makeDate(_ year: Int, _ month: Int, _ day: Int) -> Date {
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = day
        return Calendar.current.date(from: components) ?? Date()
    }
}
