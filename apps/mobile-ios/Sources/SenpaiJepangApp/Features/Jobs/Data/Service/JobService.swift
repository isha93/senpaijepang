import Foundation

@MainActor
final class JobService: JobServiceProtocol {
    typealias FetchJobsHandler = @Sendable () async throws -> [Job]
    typealias FetchJobDetailHandler = @Sendable (String) async throws -> JobDetail
    typealias ToggleSaveHandler = @Sendable (String) async throws -> Job
    typealias FetchSavedJobsHandler = @Sendable () async throws -> [Job]

    private let fetchJobsHandler: FetchJobsHandler
    private let fetchJobDetailHandler: FetchJobDetailHandler
    private let toggleSaveHandler: ToggleSaveHandler
    private let fetchSavedJobsHandler: FetchSavedJobsHandler

    init(
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

    func fetchJobs() async throws -> [Job] {
        try await fetchJobsHandler()
    }

    func fetchJobDetail(jobId: String) async throws -> JobDetail {
        try await fetchJobDetailHandler(jobId)
    }

    func toggleSaveJob(jobId: String) async throws -> Job {
        try await toggleSaveHandler(jobId)
    }

    func fetchSavedJobs() async throws -> [Job] {
        try await fetchSavedJobsHandler()
    }
}
