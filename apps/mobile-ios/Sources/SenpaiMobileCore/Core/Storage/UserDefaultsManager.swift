import Foundation

/// A centralized manager for handling UserDefaults
final class UserDefaultsManager {
    static let shared = UserDefaultsManager()
    private let defaults = UserDefaults.standard
    
    private init() {}
    
    // MARK: - Keys
    private enum Keys {
        static let hasSeenOnboarding = "hasSeenOnboarding"
    }
    
    // MARK: - Properties
    
    /// Tracks if the user has completed the initial security onboarding flow
    var hasSeenOnboarding: Bool {
        get {
            defaults.bool(forKey: Keys.hasSeenOnboarding)
        }
        set {
            defaults.set(newValue, forKey: Keys.hasSeenOnboarding)
        }
    }
    
    // Add more future user defaults here like theme preference, etc.
}
