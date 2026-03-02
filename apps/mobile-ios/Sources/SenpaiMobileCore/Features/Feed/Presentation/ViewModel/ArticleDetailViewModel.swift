import Foundation
import Combine
import SwiftUI

@MainActor
public final class ArticleDetailViewModel: ObservableObject {
    public let post: FeedPost
    private let feedService: FeedServiceProtocol
    private let navigation: NavigationHandling

    @Published public var isSaved: Bool
    @Published public var isSaving: Bool = false
    @Published public var feedbackGiven: Bool = false

    public init(post: FeedPost, feedService: FeedServiceProtocol, navigation: NavigationHandling) {
        self.post = post
        self.feedService = feedService
        self.navigation = navigation
        self.isSaved = post.isSaved
    }

    public func goBack() {
        navigation.pop()
    }

    public func toggleSave() async {
        guard !isSaving else { return }
        isSaving = true
        do {
            let updated = try await feedService.toggleSavePost(postId: post.id)
            self.isSaved = updated.isSaved
        } catch {
            print("Error toggling save: \(error)")
        }
        isSaving = false
    }
    
    public func giveFeedback(isHelpful: Bool) {
        withAnimation(AppTheme.animationDefault) {
            feedbackGiven = true
        }
    }
}
