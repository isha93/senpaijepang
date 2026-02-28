import Foundation

@MainActor
public final class JourneyService: JourneyServiceProtocol {
    public typealias ApplyHandler = @Sendable (String) async throws -> ApplicationJourney
    public typealias FetchHandler = @Sendable (String) async throws -> ApplicationJourney

    private let applyHandler: ApplyHandler
    private let fetchHandler: FetchHandler

    public init(
        applyHandler: @escaping ApplyHandler,
        fetchHandler: @escaping FetchHandler
    ) {
        self.applyHandler = applyHandler
        self.fetchHandler = fetchHandler
    }

    public func applyJob(jobId: String) async throws -> ApplicationJourney {
        try await applyHandler(jobId)
    }

    public func fetchJourney(applicationId: String) async throws -> ApplicationJourney {
        try await fetchHandler(applicationId)
    }
}
