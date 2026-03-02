import SwiftUI

@MainActor
struct MainTabView: View {
    @ObservedObject private var navigation: NavigationManager
    @StateObject private var feedVM: FeedListViewModel
    @StateObject private var jobsVM: JobsListViewModel
    @StateObject private var journeyVM: ApplicationJourneyViewModel
    @StateObject private var profileVM: ProfileViewModel
    private let jobService: JobServiceProtocol
    private let journeyService: JourneyServiceProtocol
    private let feedService: FeedServiceProtocol

    init(
        navigation: NavigationManager,
        jobService: JobServiceProtocol,
        journeyService: JourneyServiceProtocol,
        profileService: ProfileServiceProtocol,
        feedService: FeedServiceProtocol
    ) {
        self._navigation = ObservedObject(wrappedValue: navigation)
        self.jobService = jobService
        self.journeyService = journeyService
        self.feedService = feedService
        _feedVM = StateObject(wrappedValue: FeedListViewModel(feedService: feedService, navigation: navigation))
        _jobsVM = StateObject(wrappedValue: JobsListViewModel(jobService: jobService, navigation: navigation))
        _journeyVM = StateObject(wrappedValue: ApplicationJourneyViewModel(applicationId: "app-001", journeyService: journeyService, navigation: navigation))
        _profileVM = StateObject(wrappedValue: ProfileViewModel(profileService: profileService, navigation: navigation))
    }

    @State private var selectedTab = 0
    @ObservedObject private var langManager = LanguageManager.shared

    var body: some View {
        TabView(selection: $selectedTab) {
            // Home Tab
            NavigationStack(path: $navigation.path) {
                FeedListView(viewModel: feedVM) {
                    selectedTab = 3
                }
                .navigationDestination(for: AppRoute.self) { route in
                    routeView(route)
                }
            }
            .background(AppTheme.backgroundPrimary)
            .tag(0)
            .tabItem {
                Label("Home".localized(), systemImage: "house")
            }

            // Jobs Tab
            NavigationStack(path: $navigation.path) {
                JobsListView(viewModel: jobsVM)
                    .navigationDestination(for: AppRoute.self) { route in
                        routeView(route)
                    }
            }
            .background(AppTheme.backgroundPrimary)
            .tag(1)
            .tabItem {
                Label("Jobs".localized(), systemImage: "briefcase")
            }

            // Journey Tab
            NavigationStack(path: $navigation.path) {
                ApplicationJourneyView(viewModel: journeyVM)
                    .navigationDestination(for: AppRoute.self) { route in
                        routeView(route)
                    }
            }
            .background(AppTheme.backgroundPrimary)
            .tag(2)
            .tabItem {
                Label("Journey".localized(), systemImage: "map")
            }

            // Profile Tab
            NavigationStack(path: $navigation.path) {
                ProfileView(viewModel: profileVM)
                    .navigationDestination(for: AppRoute.self) { route in
                        routeView(route)
                    }
            }
            .background(AppTheme.backgroundPrimary)
            .tag(3)
            .tabItem {
                Label("Profile".localized(), systemImage: "person")
            }
        }
        .tint(AppTheme.accent)
        .animation(AppTheme.animationSoft, value: selectedTab)
        .onChange(of: selectedTab) { _, _ in
            navigation.popToRoot()
        }
        .fullScreenCover(item: $navigation.presentedJobApplication) { job in
            JobApplicationView(
                viewModel: JobApplicationViewModel(
                    job: job,
                    navigation: navigation
                )
            )
        }
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
        case .settings:
            SettingsView()
        case .registration:
            RegistrationView(viewModel: RegistrationViewModel(navigation: navigation))
        case .notifications:
            NotificationsView(viewModel: NotificationsViewModel(navigation: navigation))
        case .kycVerification:
            KYCVerificationView(viewModel: KYCViewModel(navigation: navigation))
        case .articleDetail(let post):
            ArticleDetailView(
                viewModel: ArticleDetailViewModel(
                    post: post,
                    feedService: feedService,
                    navigation: navigation
                )
            )
        default:
            EmptyView()
        }
    }
}
