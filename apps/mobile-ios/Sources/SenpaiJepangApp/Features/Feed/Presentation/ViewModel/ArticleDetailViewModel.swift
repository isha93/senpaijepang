import Foundation
import Combine
import SwiftUI

@MainActor
final class ArticleDetailViewModel: ObservableObject {
    let post: FeedPost
    private let feedService: FeedServiceProtocol
    private let navigation: NavigationHandling

    @Published var isSaved: Bool
    @Published var isSaving: Bool = false
    @Published var feedbackGiven: Bool = false

    init(post: FeedPost, feedService: FeedServiceProtocol, navigation: NavigationHandling) {
        self.post = post
        self.feedService = feedService
        self.navigation = navigation
        self.isSaved = post.isSaved
    }

    func goBack() {
        navigation.pop()
    }

    func toggleSave() async {
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
    
    func giveFeedback(isHelpful: Bool) {
        withAnimation(AppTheme.animationDefault) {
            feedbackGiven = true
        }
        // In a real app, send this feedback to backend
    }
}
