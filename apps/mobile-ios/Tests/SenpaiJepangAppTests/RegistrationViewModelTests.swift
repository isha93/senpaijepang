import XCTest
@testable import SenpaiJepang

@MainActor
private final class MockAuthService: AuthServiceProtocol {
    struct RegisterCall: Equatable {
        let fullName: String
        let email: String
        let password: String
    }

    struct VerifyCall: Equatable {
        let email: String
        let code: String
    }

    var registerCalls: [RegisterCall] = []
    var resendCalls: [String] = []
    var verifyCalls: [VerifyCall] = []

    var loginResponse = AuthSession(accessToken: "access", refreshToken: "refresh")
    var registerResponse = RegistrationResult(
        session: AuthSession(accessToken: "access", refreshToken: "refresh"),
        emailVerification: EmailVerificationChallenge(
            email: "user@example.com",
            required: true,
            verified: false,
            sent: true,
            expiresInSec: 600,
            resendAvailableInSec: 30
        )
    )
    var resendResponse = EmailVerificationChallenge(
        email: "user@example.com",
        required: true,
        verified: false,
        sent: true,
        expiresInSec: 600,
        resendAvailableInSec: 45
    )
    var verifyResponse = EmailVerificationResult(email: "user@example.com", verified: true, alreadyVerified: false)

    func login(email: String, password: String) async throws -> AuthSession {
        loginResponse
    }

    func register(fullName: String, email: String, password: String) async throws -> RegistrationResult {
        registerCalls.append(.init(fullName: fullName, email: email, password: password))
        return registerResponse
    }

    func resendEmailVerification(email: String) async throws -> EmailVerificationChallenge {
        resendCalls.append(email)
        return resendResponse
    }

    func verifyEmailVerification(email: String, code: String) async throws -> EmailVerificationResult {
        verifyCalls.append(.init(email: email, code: code))
        return verifyResponse
    }
}

@MainActor
private final class MockNavigation: NavigationHandling {
    var path: [AppRoute] = []
    var presentedApplication: Job?

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

    func presentApplication(for job: Job) {
        presentedApplication = job
    }

    func dismissApplication() {
        presentedApplication = nil
    }
}

@MainActor
final class RegistrationViewModelTests: XCTestCase {
    func testContinueRejectsMismatchedPasswords() {
        let service = MockAuthService()
        let navigation = MockNavigation()
        let viewModel = RegistrationViewModel(authService: service, navigation: navigation)
        viewModel.fullName = "Isa NF"
        viewModel.email = "isa@example.com"
        viewModel.password = "password123"
        viewModel.confirmPassword = "password456"

        viewModel.continueToNextStep()

        XCTAssertEqual(viewModel.currentStep, .accountInfo)
        XCTAssertEqual(viewModel.errorMessage, "Passwords do not match.")
        XCTAssertTrue(service.registerCalls.isEmpty)
    }

    func testRegisterTransitionsToVerifyEmailStep() async {
        let service = MockAuthService()
        let navigation = MockNavigation()
        let viewModel = RegistrationViewModel(authService: service, navigation: navigation)
        viewModel.fullName = "Isa NF"
        viewModel.email = "isa@example.com"
        viewModel.password = "password123"
        viewModel.confirmPassword = "password123"

        viewModel.continueToNextStep()

        await waitUntil {
            viewModel.currentStep == .verifyEmail && service.registerCalls.count == 1
        }

        XCTAssertEqual(service.registerCalls.first, .init(fullName: "Isa NF", email: "isa@example.com", password: "password123"))
        XCTAssertEqual(viewModel.resendCountdown, 30)
        XCTAssertEqual(viewModel.displayedEmail, "isa@example.com")
        XCTAssertFalse(viewModel.canResendCode)
    }

    func testVerifyEmailTransitionsToPreferencesStep() async {
        let service = MockAuthService()
        service.registerResponse = RegistrationResult(
            session: AuthSession(accessToken: "access", refreshToken: "refresh"),
            emailVerification: EmailVerificationChallenge(
                email: "isa@example.com",
                required: true,
                verified: false,
                sent: true,
                expiresInSec: 600,
                resendAvailableInSec: 0
            )
        )
        let navigation = MockNavigation()
        let viewModel = RegistrationViewModel(authService: service, navigation: navigation)
        viewModel.fullName = "Isa NF"
        viewModel.email = "isa@example.com"
        viewModel.password = "password123"
        viewModel.confirmPassword = "password123"

        viewModel.continueToNextStep()
        await waitUntil {
            viewModel.currentStep == .verifyEmail
        }

        viewModel.setVerificationCode("123456")
        viewModel.continueToNextStep()

        await waitUntil {
            viewModel.currentStep == .preferences && service.verifyCalls.count == 1
        }

        XCTAssertEqual(service.verifyCalls.first, .init(email: "isa@example.com", code: "123456"))
        XCTAssertNil(viewModel.errorMessage)
    }

    func testPreferencesContinueTransitionsToSuccessStep() async {
        let service = MockAuthService()
        let navigation = MockNavigation()
        let viewModel = RegistrationViewModel(authService: service, navigation: navigation)

        viewModel.currentStep = .preferences
        viewModel.continueToNextStep()

        XCTAssertEqual(viewModel.currentStep, .allSet)
    }

    func testResendCodeUsesDisplayedEmailAndUpdatesCountdown() async {
        let service = MockAuthService()
        service.registerResponse = RegistrationResult(
            session: AuthSession(accessToken: "access", refreshToken: "refresh"),
            emailVerification: EmailVerificationChallenge(
                email: "isa@example.com",
                required: true,
                verified: false,
                sent: true,
                expiresInSec: 600,
                resendAvailableInSec: 0
            )
        )
        service.resendResponse = EmailVerificationChallenge(
            email: "isa@example.com",
            required: true,
            verified: false,
            sent: true,
            expiresInSec: 600,
            resendAvailableInSec: 45
        )
        let navigation = MockNavigation()
        let viewModel = RegistrationViewModel(authService: service, navigation: navigation)
        viewModel.fullName = "Isa NF"
        viewModel.email = "isa@example.com"
        viewModel.password = "password123"
        viewModel.confirmPassword = "password123"

        viewModel.continueToNextStep()
        await waitUntil {
            viewModel.currentStep == .verifyEmail
        }
        XCTAssertTrue(viewModel.canResendCode)

        viewModel.resendVerificationCode()

        await waitUntil {
            service.resendCalls.count == 1 && viewModel.resendCountdown == 45
        }

        XCTAssertEqual(service.resendCalls, ["isa@example.com"])
        XCTAssertEqual(viewModel.infoMessage, "A new verification code has been sent.")
    }

    private func waitUntil(
        timeoutNanoseconds: UInt64 = 2_000_000_000,
        pollNanoseconds: UInt64 = 50_000_000,
        condition: @escaping @MainActor () -> Bool
    ) async {
        let deadline = DispatchTime.now().uptimeNanoseconds + timeoutNanoseconds

        while DispatchTime.now().uptimeNanoseconds < deadline {
            if condition() {
                return
            }
            try? await Task.sleep(nanoseconds: pollNanoseconds)
        }

        XCTFail("Timed out waiting for condition")
    }
}
