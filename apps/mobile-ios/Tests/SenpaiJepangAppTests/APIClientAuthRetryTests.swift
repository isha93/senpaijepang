import Foundation
import XCTest
@testable import SenpaiJepang

private final class MockAuthTokenProvider: AuthTokenProvider {
    var accessToken: String?
    var storedRefreshToken: String?
    var refreshSessionCallCount = 0
    var refreshSessionResult = true
    var refreshedAccessToken = "fresh-access-token"

    init(accessToken: String?, refreshToken: String?) {
        self.accessToken = accessToken
        self.storedRefreshToken = refreshToken
    }

    func getAccessToken() async throws -> String? {
        accessToken
    }

    func refreshToken() async throws -> String? {
        storedRefreshToken
    }

    func refreshSession() async -> Bool {
        refreshSessionCallCount += 1
        guard refreshSessionResult else { return false }
        accessToken = refreshedAccessToken
        return true
    }
}

private final class URLProtocolStub: URLProtocol {
    static var requestHandler: ((URLRequest) throws -> (HTTPURLResponse, Data))?

    override class func canInit(with request: URLRequest) -> Bool {
        true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        request
    }

    override func startLoading() {
        guard let handler = URLProtocolStub.requestHandler else {
            XCTFail("URLProtocolStub.requestHandler must be configured before use.")
            return
        }

        do {
            let (response, data) = try handler(request)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}

private struct ProtectedResponseDTO: Decodable {
    let ok: Bool
}

private enum ProtectedEndpoint: APIEndpoint {
    case value

    var path: String { "/protected" }
    var method: HTTPMethod { .get }
    var queryItems: [URLQueryItem]? { nil }
    var headers: [String : String]? { nil }
    var body: Data? { nil }
    var requiresAuth: Bool { true }
}

final class APIClientAuthRetryTests: XCTestCase {
    override func tearDown() {
        URLProtocolStub.requestHandler = nil
        super.tearDown()
    }

    func testAuthenticatedRequestRetriesOnceAfterRefresh() async throws {
        let tokenProvider = MockAuthTokenProvider(
            accessToken: "expired-access-token",
            refreshToken: "refresh-token"
        )
        var authorizationHeaders: [String?] = []

        URLProtocolStub.requestHandler = { request in
            authorizationHeaders.append(request.value(forHTTPHeaderField: "Authorization"))

            let statusCode = authorizationHeaders.count == 1 ? 401 : 200
            let payload =
                authorizationHeaders.count == 1
                ? #"{"error":{"message":"access token expired"}}"#
                : #"{"ok":true}"#

            let response = HTTPURLResponse(
                url: try XCTUnwrap(request.url),
                statusCode: statusCode,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!
            return (response, Data(payload.utf8))
        }

        let client = APIClient(
            session: makeURLSession(),
            tokenProvider: tokenProvider
        )

        let response = try await client.request(
            ProtectedEndpoint.value,
            responseType: ProtectedResponseDTO.self
        )

        XCTAssertTrue(response.ok)
        XCTAssertEqual(tokenProvider.refreshSessionCallCount, 1)
        XCTAssertEqual(
            authorizationHeaders,
            ["Bearer expired-access-token", "Bearer fresh-access-token"]
        )
    }

    func testAuthenticatedRequestThrowsUnauthorizedWhenRefreshFails() async {
        let tokenProvider = MockAuthTokenProvider(
            accessToken: "expired-access-token",
            refreshToken: "refresh-token"
        )
        tokenProvider.refreshSessionResult = false

        URLProtocolStub.requestHandler = { request in
            let response = HTTPURLResponse(
                url: try XCTUnwrap(request.url),
                statusCode: 401,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!
            return (response, Data(#"{"error":{"message":"access token expired"}}"#.utf8))
        }

        let client = APIClient(
            session: makeURLSession(),
            tokenProvider: tokenProvider
        )

        do {
            _ = try await client.request(
                ProtectedEndpoint.value,
                responseType: ProtectedResponseDTO.self
            )
            XCTFail("Expected unauthorized request to throw.")
        } catch {
            XCTAssertEqual(
                error.localizedDescription,
                "You are not authorized to perform this action. Please log in again."
            )
            XCTAssertEqual(tokenProvider.refreshSessionCallCount, 1)
        }
    }

    private func makeURLSession() -> URLSession {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [URLProtocolStub.self]
        return URLSession(configuration: configuration)
    }
}
