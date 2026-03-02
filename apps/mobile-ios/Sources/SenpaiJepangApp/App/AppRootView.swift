import SwiftUI
import netfox

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

    @State private var showOnboarding: Bool = !UserDefaultsManager.shared.hasSeenOnboarding

    var body: some View {
        Group {
            if authState.isLoggedIn {
                MainTabView(
                    navigation: navigation,
                    authService: authService,
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
                                viewModel: RegistrationViewModel(
                                    authService: authService,
                                    navigation: navigation
                                )
                            )
                        default:
                            EmptyView()
                        }
                    }
                }
            }
        }
        .animation(.easeInOut(duration: 0.3), value: authState.isLoggedIn)
        .onChange(of: authState.isLoggedIn) { _, _ in
            navigation.popToRoot()
        }
        .onShake {
            NFX.sharedInstance().show()
        }
        .fullScreenCover(isPresented: $showOnboarding) {
            OnboardingContainerView(isPresented: $showOnboarding)
        }
    }
}

private struct OnboardingContainerView: View {
    @Binding var isPresented: Bool
    @StateObject private var onboardingVM = OnboardingViewModel()
    
    var body: some View {
        OnboardingView()
            .environmentObject(onboardingVM)
            .onAppear {
                onboardingVM.onComplete = {
                    withAnimation {
                        isPresented = false
                    }
                }
            }
    }
}
