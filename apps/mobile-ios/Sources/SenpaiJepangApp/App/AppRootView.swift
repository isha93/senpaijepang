import SwiftUI

struct AppRootView: View {
    @StateObject private var navigation: NavigationManager
    @ObservedObject private var authState = AuthStateManager.shared
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
        Group {
            if authState.isLoggedIn {
                MainTabView(
                    navigation: navigation,
                    jobService: jobService,
                    journeyService: journeyService,
                    profileService: profileService,
                    feedService: feedService
                )
            } else {
                NavigationStack(path: $navigation.path) {
                    LoginView(
                        viewModel: LoginViewModel(
                            authService: authService,
                            navigation: navigation
                        )
                    )
                    .navigationDestination(for: AppRoute.self) { route in
                        switch route {
                        case .registration:
                            RegistrationView(
                                viewModel: RegistrationViewModel(navigation: navigation)
                            )
                        default:
                            EmptyView()
                        }
                    }
                }
            }
        }
        .animation(.easeInOut(duration: 0.3), value: authState.isLoggedIn)
        .onChange(of: authState.isLoggedIn) { _, isLoggedIn in
            if !isLoggedIn {
                navigation.popToRoot()
            }
        }
    }
}
