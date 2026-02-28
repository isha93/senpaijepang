import SwiftUI

struct AppRootView: View {
    @StateObject private var navigation: NavigationManager
    private let authService: AuthServiceProtocol
    private let jobService: JobServiceProtocol
    private let journeyService: JourneyServiceProtocol
    private let profileService: ProfileServiceProtocol
    private let feedService: FeedServiceProtocol

    init(
        authService: AuthServiceProtocol,
        jobService: JobServiceProtocol,
        journeyService: JourneyServiceProtocol,
        profileService: ProfileServiceProtocol,
        feedService: FeedServiceProtocol
    ) {
        _navigation = StateObject(wrappedValue: NavigationManager())
        self.authService = authService
        self.jobService = jobService
        self.journeyService = journeyService
        self.profileService = profileService
        self.feedService = feedService
    }

    var body: some View {
        MainTabView(
            navigation: navigation,
            jobService: jobService,
            journeyService: journeyService,
            profileService: profileService,
            feedService: feedService
        )
    }
}
