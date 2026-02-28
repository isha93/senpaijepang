import Combine
import Foundation

@MainActor
final class FeedListViewModel: ObservableObject, ManagedTask {
    @Published var posts: [FeedPost]
    @Published var isLoading: Bool
    @Published var errorMessage: String?
    @Published var searchText: String
    @Published var selectedCategory: String

    let categories = ["All", "Visa Updates", "Safety", "Job Market", "Living Guide"]

    private let feedService: FeedServiceProtocol
    private let navigation: NavigationHandling

    init(
        feedService: FeedServiceProtocol,
        navigation: NavigationHandling
    ) {
        self.feedService = feedService
        self.navigation = navigation
        self.posts = []
        self.isLoading = false
        self.errorMessage = nil
        self.searchText = ""
        self.selectedCategory = "All"
    }

    func loadFeed() async {
        if let result = await executeTask({
            try await self.feedService.fetchFeed()
        }) {
            posts = result.isEmpty ? Self.mockPosts : result
        } else {
            posts = Self.mockPosts
        }
    }

    func toggleSave(_ post: FeedPost) async {
        if let updated = await executeTask({
            try await self.feedService.toggleSavePost(postId: post.id)
        }) {
            if let index = posts.firstIndex(where: { $0.id == updated.id }) {
                posts[index] = updated
            }
        }
    }

    // MARK: - Mock Data
    static let mockPosts: [FeedPost] = [
        FeedPost(
            id: "1",
            authorName: "NHK World",
            content: "Understanding the new Specified Skilled Worker (SSW) Type 2 expansion rules",
            createdAt: Date().addingTimeInterval(-2 * 3600),
            title: "Understanding the new Specified Skilled Worker (SSW) Type 2 expansion rules",
            category: "Visa Info",
            source: "NHK World"
        ),
        FeedPost(
            id: "2",
            authorName: "Japan Meteorological Agency",
            content: "Typhoon season preparation guide for residents in Western Japan",
            createdAt: Date().addingTimeInterval(-5 * 3600),
            title: "Typhoon season preparation guide for residents in Western Japan",
            category: "Safety",
            source: "Japan Meteorological Agency"
        ),
        FeedPost(
            id: "3",
            authorName: "Senpai Jepang Official",
            content: "Indonesian community meetup in Osaka this weekend: Details & Registration",
            createdAt: Date().addingTimeInterval(-24 * 3600),
            title: "Indonesian community meetup in Osaka this weekend: Details & Registration",
            category: "Community",
            source: "Senpai Jepang Official"
        ),
        FeedPost(
            id: "4",
            authorName: "Tokyo Cheapo",
            content: "How to open a Japan Post Bank account: A step-by-step guide for beginners",
            createdAt: Date().addingTimeInterval(-48 * 3600),
            title: "How to open a Japan Post Bank account: A step-by-step guide for beginners",
            category: "Living Guide",
            source: "Tokyo Cheapo"
        ),
    ]
}
