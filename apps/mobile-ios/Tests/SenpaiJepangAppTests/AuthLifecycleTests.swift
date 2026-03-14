import XCTest
@testable import SenpaiJepang

@MainActor
final class AuthLifecycleTests: XCTestCase {
    override func setUp() {
        super.setUp()
        UserDefaultsManager.shared.accessToken = nil
        UserDefaultsManager.shared.refreshToken = nil
        AuthStateManager.shared.resetForTesting()
    }

    override func tearDown() {
        UserDefaultsManager.shared.accessToken = nil
        UserDefaultsManager.shared.refreshToken = nil
        AuthStateManager.shared.resetForTesting()
        super.tearDown()
    }

    func testBootstrapSessionRestoresAuthenticatedStateWhenValidationSucceeds() async {
        UserDefaultsManager.shared.accessToken = "access-token"
        UserDefaultsManager.shared.refreshToken = "refresh-token"

        let authState = AuthStateManager.shared
        authState.resetForTesting()

        var validationCallCount = 0
        authState.configure(
            sessionRefreshHandler: { _ in
                XCTFail("Refresh should not be called when access token is still valid.")
                return AuthSession(accessToken: "unused", refreshToken: "unused")
            },
            sessionValidationHandler: {
                validationCallCount += 1
            }
        )

        await authState.bootstrapSessionIfNeeded()

        XCTAssertTrue(authState.isLoggedIn)
        XCTAssertFalse(authState.isBootstrappingSession)
        XCTAssertEqual(validationCallCount, 1)
        XCTAssertEqual(UserDefaultsManager.shared.accessToken, "access-token")
        XCTAssertEqual(UserDefaultsManager.shared.refreshToken, "refresh-token")
    }

    func testBootstrapSessionClearsStoredTokensWhenValidationAndRefreshFail() async {
        UserDefaultsManager.shared.accessToken = "expired-token"
        UserDefaultsManager.shared.refreshToken = "expired-refresh"

        let authState = AuthStateManager.shared
        authState.resetForTesting()

        var validationCallCount = 0
        var refreshCallCount = 0
        authState.configure(
            sessionRefreshHandler: { _ in
                refreshCallCount += 1
                throw APIError.unauthorized
            },
            sessionValidationHandler: {
                validationCallCount += 1
                throw APIError.unauthorized
            }
        )

        await authState.bootstrapSessionIfNeeded()

        XCTAssertFalse(authState.isLoggedIn)
        XCTAssertFalse(authState.isBootstrappingSession)
        XCTAssertEqual(validationCallCount, 1)
        XCTAssertEqual(refreshCallCount, 1)
        XCTAssertNil(UserDefaultsManager.shared.accessToken)
        XCTAssertNil(UserDefaultsManager.shared.refreshToken)
    }

    func testBootstrapSessionKeepsStoredTokensWhenValidationFailsOffline() async {
        UserDefaultsManager.shared.accessToken = "existing-token"
        UserDefaultsManager.shared.refreshToken = "existing-refresh"

        let authState = AuthStateManager.shared
        authState.resetForTesting()

        authState.configure(
            sessionRefreshHandler: { _ in
                XCTFail("Refresh should not run for non-auth startup failures.")
                return AuthSession(accessToken: "unused", refreshToken: "unused")
            },
            sessionValidationHandler: {
                throw APIError.networkError(URLError(.notConnectedToInternet))
            }
        )

        await authState.bootstrapSessionIfNeeded()

        XCTAssertTrue(authState.isLoggedIn)
        XCTAssertFalse(authState.isBootstrappingSession)
        XCTAssertEqual(UserDefaultsManager.shared.accessToken, "existing-token")
        XCTAssertEqual(UserDefaultsManager.shared.refreshToken, "existing-refresh")
    }
}
