import Foundation

@MainActor
public final class FeedService: FeedServiceProtocol {
    public typealias FetchHandler = @Sendable () async throws -> [FeedPost]
    public typealias ToggleSaveHandler = @Sendable (String) async throws -> FeedPost

    private let fetchHandler: FetchHandler
    private let toggleSaveHandler: ToggleSaveHandler

    public init(
        fetchHandler: @escaping FetchHandler,
        toggleSaveHandler: @escaping ToggleSaveHandler
    ) {
        self.fetchHandler = fetchHandler
        self.toggleSaveHandler = toggleSaveHandler
    }

    public func fetchFeed() async throws -> [FeedPost] {
        try await fetchHandler()
    }

    public func toggleSavePost(postId: String) async throws -> FeedPost {
        try await toggleSaveHandler(postId)
    }
}
