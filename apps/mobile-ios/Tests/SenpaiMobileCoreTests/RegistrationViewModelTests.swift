import XCTest
@testable import SenpaiMobileCore

@MainActor
private final class MockRegistrationAuthService: AuthServiceProtocol {
    var registerCallCount = 0
    var registerDelayNanoseconds: UInt64 = 0
    var registerResponse: AuthSession = .init(accessToken: "access", refreshToken: "refresh")

    func login(email: String, password: String) async throws -> AuthSession {
        registerResponse
    }

    func register(fullName: String, email: String, password: String) async throws -> AuthSession {
        registerCallCount += 1
        if registerDelayNanoseconds > 0 {
            try? await Task.sleep(nanoseconds: registerDelayNanoseconds)
        }
        return registerResponse
    }
}

@MainActor
private final class MockRegistrationNavigation: NavigationHandling {
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
final class RegistrationViewModelTests: XCTestCase {
    func testContinueToNextStepShowsLoadingDuringRegister() async {
        let service = MockRegistrationAuthService()
        service.registerDelayNanoseconds = 200_000_000
        let navigation = MockRegistrationNavigation()
        let vm = RegistrationViewModel(authService: service, navigation: navigation)
        vm.fullName = "Demo User"
        vm.email = "demo@example.com"
        vm.password = "password123"

        vm.continueToNextStep()

        XCTAssertTrue(vm.isLoading)
        await waitUntil(vm.currentStep == .preferences, timeoutNanoseconds: 1_000_000_000)

        XCTAssertEqual(service.registerCallCount, 1)
        XCTAssertEqual(vm.currentStep, .preferences)
        XCTAssertFalse(vm.isLoading)
    }

    func testContinueToNextStepIgnoresSecondTapWhileLoading() async {
        let service = MockRegistrationAuthService()
        service.registerDelayNanoseconds = 250_000_000
        let navigation = MockRegistrationNavigation()
        let vm = RegistrationViewModel(authService: service, navigation: navigation)
        vm.fullName = "Demo User"
        vm.email = "demo@example.com"
        vm.password = "password123"

        vm.continueToNextStep()
        vm.continueToNextStep()

        await waitUntil(service.registerCallCount == 1, timeoutNanoseconds: 500_000_000)
        await waitUntil(vm.currentStep == .preferences, timeoutNanoseconds: 1_000_000_000)

        XCTAssertEqual(service.registerCallCount, 1)
        XCTAssertFalse(vm.isLoading)
    }

    func testContinueFromPreferencesMovesToVerifyEmailStep() async {
        let service = MockRegistrationAuthService()
        let navigation = MockRegistrationNavigation()
        let vm = RegistrationViewModel(authService: service, navigation: navigation)
        vm.fullName = "Demo User"
        vm.email = "demo@example.com"
        vm.password = "password123"

        vm.continueToNextStep()
        await waitUntil(vm.currentStep == .preferences, timeoutNanoseconds: 1_000_000_000)

        vm.continueToNextStep()

        XCTAssertEqual(vm.currentStep, .verifyEmail)
        XCTAssertGreaterThan(vm.resendRemainingSeconds, 0)
    }

    func testUpdateVerificationCodeSanitizesToSixDigits() {
        let service = MockRegistrationAuthService()
        let navigation = MockRegistrationNavigation()
        let vm = RegistrationViewModel(authService: service, navigation: navigation)

        vm.updateVerificationCode("12ab34-5678")

        XCTAssertEqual(vm.verificationCode, "123456")
        XCTAssertTrue(vm.isVerificationCodeComplete)
    }

    func testVerifyEmailRequiresCompleteCode() {
        let service = MockRegistrationAuthService()
        let navigation = MockRegistrationNavigation()
        let vm = RegistrationViewModel(authService: service, navigation: navigation)
        vm.currentStep = .verifyEmail
        vm.updateVerificationCode("123")

        vm.continueToNextStep()

        XCTAssertEqual(vm.currentStep, .verifyEmail)
        XCTAssertFalse(vm.isLoading)
        XCTAssertEqual(vm.errorMessage, "Please enter the 6-digit verification code.")
    }

    func testVerifyEmailAdvancesToSuccess() async {
        let service = MockRegistrationAuthService()
        let navigation = MockRegistrationNavigation()
        let vm = RegistrationViewModel(authService: service, navigation: navigation)
        vm.currentStep = .verifyEmail
        vm.updateVerificationCode("123456")

        vm.continueToNextStep()

        XCTAssertTrue(vm.isLoading)
        await waitUntil(vm.currentStep == .allSet, timeoutNanoseconds: 1_000_000_000)
        XCTAssertEqual(vm.currentStep, .allSet)
        XCTAssertFalse(vm.isLoading)
    }

    private func waitUntil(_ condition: @autoclosure @escaping () -> Bool, timeoutNanoseconds: UInt64) async {
        let startedAt = DispatchTime.now().uptimeNanoseconds
        while !condition() {
            if DispatchTime.now().uptimeNanoseconds - startedAt > timeoutNanoseconds {
                return
            }
            await Task.yield()
        }
    }
}
