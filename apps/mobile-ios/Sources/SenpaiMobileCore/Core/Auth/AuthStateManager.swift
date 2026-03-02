import Foundation
import SwiftUI

/// Manages authentication state and token persistence for the app.
/// Conforms to AuthTokenProvider so it can be injected into APIClient.
@MainActor
final class AuthStateManager: ObservableObject {
    static let shared = AuthStateManager()

    @Published var isLoggedIn: Bool = false

    private init() {
        // Restore session from persisted tokens
        if UserDefaultsManager.shared.accessToken != nil {
            isLoggedIn = true
        }
    }

    func login(session: AuthSession) {
        UserDefaultsManager.shared.accessToken = session.accessToken
        UserDefaultsManager.shared.refreshToken = session.refreshToken
        withAnimation(.easeInOut(duration: 0.3)) {
            isLoggedIn = true
        }
    }

    func logout() {
        UserDefaultsManager.shared.accessToken = nil
        UserDefaultsManager.shared.refreshToken = nil
        withAnimation(.easeInOut(duration: 0.3)) {
            isLoggedIn = false
        }
        NotificationCenter.default.post(name: .authDidLogout, object: nil)
    }
}

// MARK: - AuthTokenProvider

extension AuthStateManager: AuthTokenProvider {
    /// Reads the persisted access token. Nonisolated so APIClient can call from any context.
    nonisolated func getAccessToken() async throws -> String? {
        UserDefaultsManager.shared.accessToken
    }

    /// Returns the persisted refresh token. Token refresh logic can be added here.
    nonisolated func refreshToken() async throws -> String? {
        UserDefaultsManager.shared.refreshToken
    }
}

extension Notification.Name {
    static let authDidLogout = Notification.Name("authDidLogout")
}
