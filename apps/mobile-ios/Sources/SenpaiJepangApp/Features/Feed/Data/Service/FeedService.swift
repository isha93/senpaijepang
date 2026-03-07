import Foundation

@MainActor
final class FeedService: FeedServiceProtocol {
    typealias FetchHandler = @Sendable () async throws -> [FeedPost]
    typealias ToggleSaveHandler = @Sendable (String, Bool) async throws -> Bool

    private let fetchHandler: FetchHandler
    private let toggleSaveHandler: ToggleSaveHandler

    init(
        fetchHandler: @escaping FetchHandler,
        toggleSaveHandler: @escaping ToggleSaveHandler
    ) {
        self.fetchHandler = fetchHandler
        self.toggleSaveHandler = toggleSaveHandler
    }

    func fetchFeed() async throws -> [FeedPost] {
        try await fetchHandler()
    }

    func toggleSavePost(postId: String, currentlySaved: Bool) async throws -> Bool {
        try await toggleSaveHandler(postId, currentlySaved)
    }
}
