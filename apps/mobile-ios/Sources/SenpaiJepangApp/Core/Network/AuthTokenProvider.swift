import Foundation

public protocol AuthTokenProvider {
    func getAccessToken() async throws -> String?
    func refreshToken() async throws -> String?
}
