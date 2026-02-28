import Foundation

public struct FeedPost: Equatable, Sendable, Identifiable {
    public let id: String
    public let authorName: String
    public let content: String
    public let createdAt: Date
    public let isSaved: Bool
    public let title: String
    public let category: String?
    public let source: String?
    public let imageURL: String?

    public init(
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
public protocol FeedServiceProtocol {
    func fetchFeed() async throws -> [FeedPost]
    func toggleSavePost(postId: String) async throws -> FeedPost
}
