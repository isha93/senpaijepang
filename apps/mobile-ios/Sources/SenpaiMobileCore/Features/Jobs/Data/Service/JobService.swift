import Foundation

@MainActor
public final class JobService: JobServiceProtocol {
    public typealias FetchJobsHandler = @Sendable () async throws -> [Job]
    public typealias FetchJobDetailHandler = @Sendable (String) async throws -> JobDetail
    public typealias ToggleSaveHandler = @Sendable (String) async throws -> Job
    public typealias FetchSavedJobsHandler = @Sendable () async throws -> [Job]

    private let fetchJobsHandler: FetchJobsHandler
    private let fetchJobDetailHandler: FetchJobDetailHandler
    private let toggleSaveHandler: ToggleSaveHandler
    private let fetchSavedJobsHandler: FetchSavedJobsHandler

    public init(
        fetchJobsHandler: @escaping FetchJobsHandler,
        fetchJobDetailHandler: @escaping FetchJobDetailHandler,
        toggleSaveHandler: @escaping ToggleSaveHandler,
        fetchSavedJobsHandler: @escaping FetchSavedJobsHandler
    ) {
        self.fetchJobsHandler = fetchJobsHandler
        self.fetchJobDetailHandler = fetchJobDetailHandler
        self.toggleSaveHandler = toggleSaveHandler
        self.fetchSavedJobsHandler = fetchSavedJobsHandler
    }

    public func fetchJobs() async throws -> [Job] {
        try await fetchJobsHandler()
    }

    public func fetchJobDetail(jobId: String) async throws -> JobDetail {
        try await fetchJobDetailHandler(jobId)
    }

    public func toggleSaveJob(jobId: String) async throws -> Job {
        try await toggleSaveHandler(jobId)
    }

    public func fetchSavedJobs() async throws -> [Job] {
        try await fetchSavedJobsHandler()
    }
}
