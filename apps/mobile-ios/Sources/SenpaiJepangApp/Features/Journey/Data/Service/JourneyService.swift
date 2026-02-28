import Foundation

@MainActor
final class JourneyService: JourneyServiceProtocol {
    typealias ApplyHandler = @Sendable (String) async throws -> ApplicationJourney
    typealias FetchHandler = @Sendable (String) async throws -> ApplicationJourney

    private let applyHandler: ApplyHandler
    private let fetchHandler: FetchHandler

    init(
        applyHandler: @escaping ApplyHandler,
        fetchHandler: @escaping FetchHandler
    ) {
        self.applyHandler = applyHandler
        self.fetchHandler = fetchHandler
    }

    func applyJob(jobId: String) async throws -> ApplicationJourney {
        try await applyHandler(jobId)
    }

    func fetchJourney(applicationId: String) async throws -> ApplicationJourney {
        try await fetchHandler(applicationId)
    }
}
