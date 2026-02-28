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
            jobService: jobService,
            journeyService: journeyService,
            profileService: profileService,
            feedService: feedService
        )
        .environmentObject(navigation)
    }

    @ViewBuilder
    private func destinationView(route: AppRoute) -> some View {
        switch route {
        case .login:
            LoginView(
                viewModel: LoginViewModel(
                    authService: authService,
                    navigation: navigation
                )
            )

        case .mainTabs:
            MainTabView(
                jobService: jobService,
                journeyService: journeyService,
                profileService: profileService,
                feedService: feedService
            )
            .environmentObject(navigation)
            .navigationBarBackButtonHidden(true)

        case .jobsList:
            JobsListView(
                viewModel: JobsListViewModel(
                    jobService: jobService,
                    navigation: navigation
                )
            )

        case .jobDetail(let jobId):
            JobDetailView(
                viewModel: JobDetailViewModel(
                    jobId: jobId,
                    jobService: jobService,
                    navigation: navigation
                )
            )

        case .savedJobs:
            SavedJobsView(
                viewModel: SavedJobsViewModel(
                    jobService: jobService,
                    navigation: navigation
                )
            )

        case .profile:
            ProfileView(
                viewModel: ProfileViewModel(
                    profileService: profileService,
                    navigation: navigation
                )
            )

        case .applicationJourney(let applicationId):
            ApplicationJourneyView(
                viewModel: ApplicationJourneyViewModel(
                    applicationId: applicationId,
                    journeyService: journeyService,
                    navigation: navigation
                )
            )

        case .feed:
            FeedListView(
                viewModel: FeedListViewModel(
                    feedService: feedService,
                    navigation: navigation
                )
            )
        }
    }
}

