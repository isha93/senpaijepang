import SwiftUI

public struct MainTabView: View {
    @EnvironmentObject private var navigation: NavigationManager
    private let jobService: JobServiceProtocol
    private let journeyService: JourneyServiceProtocol
    private let profileService: ProfileServiceProtocol
    private let feedService: FeedServiceProtocol

    public init(
        jobService: JobServiceProtocol,
        journeyService: JourneyServiceProtocol,
        profileService: ProfileServiceProtocol,
        feedService: FeedServiceProtocol
    ) {
        self.jobService = jobService
        self.journeyService = journeyService
        self.profileService = profileService
        self.feedService = feedService
    }

    public var body: some View {
        TabView {
            // Feed Tab
            NavigationStack {
                FeedListView(
                    viewModel: FeedListViewModel(
                        feedService: feedService,
                        navigation: navigation
                    )
                )
            }
            .tabItem {
                Label("Feed", systemImage: "newspaper")
            }

            // Jobs Tab
            NavigationStack {
                JobsListView(
                    viewModel: JobsListViewModel(
                        jobService: jobService,
                        navigation: navigation
                    )
                )
                .navigationDestination(for: AppRoute.self) { route in
                    routeView(route)
                }
            }
            .tabItem {
                Label("Jobs", systemImage: "briefcase")
            }

            // Journey Tab
            NavigationStack {
                ApplicationJourneyView(
                    viewModel: ApplicationJourneyViewModel(
                        applicationId: "app-001",
                        journeyService: journeyService,
                        navigation: navigation
                    )
                )
            }
            .tabItem {
                Label("Journey", systemImage: "map")
            }

            // Profile Tab
            NavigationStack {
                ProfileView(
                    viewModel: ProfileViewModel(
                        profileService: profileService,
                        navigation: navigation
                    )
                )
            }
            .tabItem {
                Label("Profile", systemImage: "person")
            }
        }
        .tint(AppTheme.accent)
    }

    @ViewBuilder
    private func routeView(_ route: AppRoute) -> some View {
        switch route {
        case .jobDetail(let jobId):
            JobDetailView(
                viewModel: JobDetailViewModel(
                    jobId: jobId,
                    jobService: jobService,
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
        case .savedJobs:
            SavedJobsView(
                viewModel: SavedJobsViewModel(
                    jobService: jobService,
                    navigation: navigation
                )
            )
        default:
            EmptyView()
        }
    }
}
