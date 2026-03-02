import Foundation
import SwiftUI

/// Manages mock authentication state for the app.
/// When `isLoggedIn` is false, the app shows the Login screen.
/// When `isLoggedIn` is true, the app shows the main tab interface.
@MainActor
final class AuthStateManager: ObservableObject {
    static let shared = AuthStateManager()

    @Published var isLoggedIn: Bool = false

    private init() {}

    func login() {
        withAnimation(.easeInOut(duration: 0.3)) {
            isLoggedIn = true
        }
    }

    func logout() {
        withAnimation(.easeInOut(duration: 0.3)) {
            isLoggedIn = false
        }
    }
}
