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
            journey = nil
        }
    }

    func goBack() {
        navigation.pop()
    }

    var currentStepIndex: Int {
        guard let journey = journey else { return 0 }
        guard let nextIncompleteIndex = journey.steps.firstIndex(where: { $0.completedAt == nil }) else {
            return max(journey.steps.count - 1, 0)
        }
        return nextIncompleteIndex
    }
}
