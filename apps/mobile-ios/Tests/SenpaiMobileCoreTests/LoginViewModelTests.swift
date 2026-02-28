import XCTest
@testable import SenpaiMobileCore

@MainActor
private final class MockAuthService: AuthServiceProtocol {
    var loginCalled = false
    var response: AuthSession = .init(accessToken: "access", refreshToken: "refresh")

    func login(phoneNumber: String, otp: String) async throws -> AuthSession {
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
    func testSubmitLoginRejectsInvalidPhone() async {
        let service = MockAuthService()
        let navigation = MockNavigation()
        let vm = LoginViewModel(authService: service, navigation: navigation, phoneNumber: "12", otp: "123456")

        await vm.submitLogin()

        XCTAssertEqual(vm.errorMessage, AuthValidationError.invalidPhone.errorDescription)
        XCTAssertFalse(service.loginCalled)
        XCTAssertTrue(navigation.path.isEmpty)
    }

    func testSubmitLoginRejectsInvalidOtp() async {
        let service = MockAuthService()
        let navigation = MockNavigation()
        let vm = LoginViewModel(authService: service, navigation: navigation, phoneNumber: "08123456789", otp: "999")

        await vm.submitLogin()

        XCTAssertEqual(vm.errorMessage, AuthValidationError.invalidOtp.errorDescription)
        XCTAssertFalse(service.loginCalled)
        XCTAssertTrue(navigation.path.isEmpty)
    }

    func testSubmitLoginSuccessReplacesRouteToJobsList() async {
        let service = MockAuthService()
        let navigation = MockNavigation()
        let vm = LoginViewModel(authService: service, navigation: navigation, phoneNumber: "0812 3456 789", otp: "123456")

        await vm.submitLogin()

        XCTAssertNil(vm.errorMessage)
        XCTAssertTrue(service.loginCalled)
        XCTAssertEqual(vm.currentSession, AuthSession(accessToken: "access", refreshToken: "refresh"))
        XCTAssertEqual(navigation.path, [.jobsList])
    }
}
