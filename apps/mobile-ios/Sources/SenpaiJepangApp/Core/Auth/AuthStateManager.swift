import Foundation
import SwiftUI

@MainActor
final class AuthStateManager: ObservableObject {
    static let shared = AuthStateManager()

    @Published var isLoggedIn: Bool = false

    private init() {
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

extension AuthStateManager: AuthTokenProvider {
    nonisolated func getAccessToken() async throws -> String? {
        UserDefaultsManager.shared.accessToken
    }

    nonisolated func refreshToken() async throws -> String? {
        UserDefaultsManager.shared.refreshToken
    }

    nonisolated func updateTokens(accessToken: String, refreshToken: String?) async {
        UserDefaultsManager.shared.accessToken = accessToken
        if let refreshToken, !refreshToken.isEmpty {
            UserDefaultsManager.shared.refreshToken = refreshToken
        }
    }

    nonisolated func handleUnauthorized() async {
        await MainActor.run {
            AuthStateManager.shared.logout()
        }
    }
}

extension Notification.Name {
    static let authDidLogout = Notification.Name("authDidLogout")
}
