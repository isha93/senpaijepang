import Foundation

@MainActor
final class ProfileService: ProfileServiceProtocol {
    typealias FetchHandler = @Sendable () async throws -> UserProfile
    typealias UpdateHandler = @Sendable (UserProfile) async throws -> UserProfile

    private let fetchHandler: FetchHandler
    private let updateHandler: UpdateHandler

    init(
        fetchHandler: @escaping FetchHandler,
        updateHandler: @escaping UpdateHandler
    ) {
        self.fetchHandler = fetchHandler
        self.updateHandler = updateHandler
    }

    func fetchProfile() async throws -> UserProfile {
        try await fetchHandler()
    }

    func updateProfile(_ profile: UserProfile) async throws -> UserProfile {
        try await updateHandler(profile)
    }
}
