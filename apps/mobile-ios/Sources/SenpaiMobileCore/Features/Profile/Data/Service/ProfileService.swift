import Foundation

@MainActor
public final class ProfileService: ProfileServiceProtocol {
    public typealias FetchHandler = @Sendable () async throws -> UserProfile
    public typealias UpdateHandler = @Sendable (UserProfile) async throws -> UserProfile

    private let fetchHandler: FetchHandler
    private let updateHandler: UpdateHandler

    public init(
        fetchHandler: @escaping FetchHandler,
        updateHandler: @escaping UpdateHandler
    ) {
        self.fetchHandler = fetchHandler
        self.updateHandler = updateHandler
    }

    public func fetchProfile() async throws -> UserProfile {
        try await fetchHandler()
    }

    public func updateProfile(_ profile: UserProfile) async throws -> UserProfile {
        try await updateHandler(profile)
    }
}
