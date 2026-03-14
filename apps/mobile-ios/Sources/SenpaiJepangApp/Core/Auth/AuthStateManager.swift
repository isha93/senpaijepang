import Foundation
import SwiftUI

@MainActor
final class AuthStateManager: ObservableObject {
    static let shared = AuthStateManager()

    typealias SessionRefreshHandler = (String) async throws -> AuthSession
    typealias SessionValidationHandler = () async throws -> Void

    @Published private(set) var isLoggedIn: Bool = false
    @Published private(set) var isBootstrappingSession: Bool = false

    private var sessionRefreshHandler: SessionRefreshHandler?
    private var sessionValidationHandler: SessionValidationHandler?
    private var refreshTask: Task<Bool, Never>?
    private var hasBootstrappedSession = false

    private init() {
        let hasStoredAccessToken = UserDefaultsManager.shared.accessToken != nil
        isLoggedIn = false
        isBootstrappingSession = hasStoredAccessToken
    }

    func configure(
        sessionRefreshHandler: @escaping SessionRefreshHandler,
        sessionValidationHandler: @escaping SessionValidationHandler
    ) {
        self.sessionRefreshHandler = sessionRefreshHandler
        self.sessionValidationHandler = sessionValidationHandler
    }

    func bootstrapSessionIfNeeded() async {
        guard !hasBootstrappedSession else { return }
        hasBootstrappedSession = true

        guard UserDefaultsManager.shared.accessToken != nil else {
            isBootstrappingSession = false
            isLoggedIn = false
            return
        }

        isBootstrappingSession = true

        do {
            if let sessionValidationHandler {
                try await sessionValidationHandler()
            }
            isLoggedIn = true
        } catch {
            if isAuthenticationFailure(error) {
                let refreshed = await refreshSession()
                if refreshed {
                    do {
                        if let sessionValidationHandler {
                            try await sessionValidationHandler()
                        }
                        isLoggedIn = true
                    } catch {
                        if isAuthenticationFailure(error) {
                            clearSession(notifyLogout: false)
                        } else {
                            isLoggedIn = true
                        }
                    }
                } else {
                    clearSession(notifyLogout: false)
                }
            } else {
                // Keep the persisted session while offline or when startup validation
                // cannot complete for non-auth reasons.
                isLoggedIn = true
            }
        }

        isBootstrappingSession = false
    }

    func login(session: AuthSession) {
        storeSession(session)
        hasBootstrappedSession = true
        isBootstrappingSession = false
        withAnimation(.easeInOut(duration: 0.3)) {
            isLoggedIn = true
        }
    }

    func logout() {
        clearSession(notifyLogout: true)
    }

    func refreshSession() async -> Bool {
        if let refreshTask {
            return await refreshTask.value
        }

        guard let handler = sessionRefreshHandler,
              let refreshToken = UserDefaultsManager.shared.refreshToken,
              !refreshToken.isEmpty else {
            clearSession(notifyLogout: false)
            return false
        }

        let task = Task<Bool, Never> { [weak self] in
            guard let self else { return false }
            do {
                let session = try await handler(refreshToken)
                self.persistRefreshedSession(session)
                return true
            } catch {
                self.handleFailedRefresh()
                return false
            }
        }

        refreshTask = task
        let result = await task.value
        refreshTask = nil
        return result
    }

    private func persistRefreshedSession(_ session: AuthSession) {
        storeSession(session)
        withAnimation(.easeInOut(duration: 0.3)) {
            isLoggedIn = true
        }
    }

    private func handleFailedRefresh() {
        clearSession(notifyLogout: false)
    }

    private func storeSession(_ session: AuthSession) {
        UserDefaultsManager.shared.accessToken = session.accessToken
        UserDefaultsManager.shared.refreshToken = session.refreshToken
    }

    private func clearSession(notifyLogout: Bool) {
        UserDefaultsManager.shared.accessToken = nil
        UserDefaultsManager.shared.refreshToken = nil
        isBootstrappingSession = false
        refreshTask?.cancel()
        refreshTask = nil
        withAnimation(.easeInOut(duration: 0.3)) {
            isLoggedIn = false
        }
        if notifyLogout {
            NotificationCenter.default.post(name: .authDidLogout, object: nil)
        }
    }

    private func isAuthenticationFailure(_ error: Error) -> Bool {
        guard let apiError = error as? APIError else {
            return false
        }
        if case .unauthorized = apiError {
            return true
        }
        return false
    }
}

extension AuthStateManager: AuthTokenProvider {
    func getAccessToken() async throws -> String? {
        UserDefaultsManager.shared.accessToken
    }

    func refreshToken() async throws -> String? {
        UserDefaultsManager.shared.refreshToken
    }
}

#if DEBUG
extension AuthStateManager {
    func resetForTesting() {
        sessionRefreshHandler = nil
        sessionValidationHandler = nil
        refreshTask?.cancel()
        refreshTask = nil
        hasBootstrappedSession = false
        isLoggedIn = false
        isBootstrappingSession = UserDefaultsManager.shared.accessToken != nil
    }
}
#endif

extension Notification.Name {
    static let authDidLogout = Notification.Name("authDidLogout")
}
