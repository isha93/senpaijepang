import Foundation

/// A centralized manager for handling UserDefaults
final class UserDefaultsManager: @unchecked Sendable {
    static let shared = UserDefaultsManager()
    private let defaults = UserDefaults.standard
    
    private init() {}
    
    // MARK: - Keys
    private enum Keys {
        static let hasSeenOnboarding = "hasSeenOnboarding"
        static let accessToken = "auth.accessToken"
        static let refreshToken = "auth.refreshToken"
    }

    // MARK: - Properties

    /// Tracks if the user has completed the initial security onboarding flow
    var hasSeenOnboarding: Bool {
        get { defaults.bool(forKey: Keys.hasSeenOnboarding) }
        set { defaults.set(newValue, forKey: Keys.hasSeenOnboarding) }
    }

    var accessToken: String? {
        get { defaults.string(forKey: Keys.accessToken) }
        set {
            if let value = newValue { defaults.set(value, forKey: Keys.accessToken) }
            else { defaults.removeObject(forKey: Keys.accessToken) }
        }
    }

    var refreshToken: String? {
        get { defaults.string(forKey: Keys.refreshToken) }
        set {
            if let value = newValue { defaults.set(value, forKey: Keys.refreshToken) }
            else { defaults.removeObject(forKey: Keys.refreshToken) }
        }
    }
}
