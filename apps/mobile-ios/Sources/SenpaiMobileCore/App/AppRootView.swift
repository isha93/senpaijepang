import SwiftUI

public struct AppRootView: View {
    @StateObject private var navigation: NavigationManager
    private let authService: AuthServiceProtocol

    public init(
        navigation: NavigationManager = NavigationManager(),
        authService: AuthServiceProtocol = AuthService { _, _ in
            AuthSession(accessToken: "demo-access", refreshToken: "demo-refresh")
        }
    ) {
        _navigation = StateObject(wrappedValue: navigation)
        self.authService = authService
    }

    public var body: some View {
        NavigationStack(
            path: Binding(
                get: { navigation.path },
                set: { navigation.sync(path: $0) }
            )
        ) {
            LoginView(
                viewModel: LoginViewModel(
                    authService: authService,
                    navigation: navigation
                )
            )
            .navigationDestination(for: AppRoute.self, destination: destinationView)
        }
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
        case .jobsList:
            Text("Jobs List")
        case .jobDetail(let jobId):
            Text("Job Detail: \(jobId)")
        case .savedJobs:
            Text("Saved Jobs")
        case .profile:
            Text("Profile")
        case .applicationJourney(let applicationId):
            Text("Application Journey: \(applicationId)")
        }
    }
}
