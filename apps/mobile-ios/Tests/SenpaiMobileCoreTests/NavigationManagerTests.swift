import XCTest
@testable import SenpaiMobileCore

@MainActor
final class NavigationManagerTests: XCTestCase {
    func testPushAndPop() {
        let manager = NavigationManager()

        manager.push(.jobsList)
        manager.push(.jobDetail(jobId: "job_123"))

        XCTAssertEqual(manager.path, [.jobsList, .jobDetail(jobId: "job_123")])

        manager.pop()
        XCTAssertEqual(manager.path, [.jobsList])
    }

    func testReplaceAndPopToRoot() {
        let manager = NavigationManager(path: [.jobsList, .savedJobs])

        manager.replace(with: .profile)
        XCTAssertEqual(manager.path, [.profile])

        manager.popToRoot()
        XCTAssertTrue(manager.path.isEmpty)
    }
}
