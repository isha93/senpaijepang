import Foundation

struct FeedPost: Equatable, Sendable, Identifiable, Hashable {
    let id: String
    let authorName: String
    let content: String
    let createdAt: Date
    let isSaved: Bool
    let title: String
    let category: String?
    let source: String?
    let imageURL: String?

    init(
        id: String,
        authorName: String,
        content: String,
        createdAt: Date,
        isSaved: Bool = false,
        title: String = "",
        category: String? = nil,
        source: String? = nil,
        imageURL: String? = nil
    ) {
        self.id = id
        self.authorName = authorName
        self.content = content
        self.createdAt = createdAt
        self.isSaved = isSaved
        self.title = title
        self.category = category
        self.source = source
        self.imageURL = imageURL
    }
}

@MainActor
protocol FeedServiceProtocol {
    func fetchFeed() async throws -> [FeedPost]
    func toggleSavePost(postId: String) async throws -> FeedPost
}
