import XCTest
@testable import SenpaiMobileCore

@MainActor
private final class MockAuthService: AuthServiceProtocol {
    var loginCalled = false
    var response: AuthSession = .init(accessToken: "access", refreshToken: "refresh")

    func login(email: String, password: String) async throws -> AuthSession {
        loginCalled = true
        return response
    }
}

@MainActor
private final class MockNavigation: NavigationHandling {
    var path: [AppRoute] = []

    func push(_ route: AppRoute) {
        path.append(route)
    }

    func pop() {
        guard !path.isEmpty else { return }
        path.removeLast()
    }

    func popToRoot() {
        path.removeAll()
    }

    func replace(with route: AppRoute) {
        path = [route]
    }
}

@MainActor
final class LoginViewModelTests: XCTestCase {
    func testSubmitLoginRejectsInvalidEmail() async {
        let service = MockAuthService()
        let navigation = MockNavigation()
        let vm = LoginViewModel(authService: service, navigation: navigation, email: "invalid-email", password: "password123")

        await vm.submitLogin()

        XCTAssertEqual(vm.errorMessage, "Please enter a valid email address.")
        XCTAssertFalse(service.loginCalled)
        XCTAssertTrue(navigation.path.isEmpty)
    }

    func testSubmitLoginRejectsShortPassword() async {
        let service = MockAuthService()
        let navigation = MockNavigation()
        let vm = LoginViewModel(authService: service, navigation: navigation, email: "user@example.com", password: "short")

        await vm.submitLogin()

        XCTAssertEqual(vm.errorMessage, "Password must be at least 8 characters.")
        XCTAssertFalse(service.loginCalled)
        XCTAssertTrue(navigation.path.isEmpty)
    }

    func testSubmitLoginSuccessNavigatesToJobsList() async {
        let service = MockAuthService()
        let navigation = MockNavigation()
        let vm = LoginViewModel(authService: service, navigation: navigation, email: "user@example.com", password: "password123")

        await vm.submitLogin()

        XCTAssertNil(vm.errorMessage)
        XCTAssertEqual(navigation.path, [.jobsList])
    }
}
