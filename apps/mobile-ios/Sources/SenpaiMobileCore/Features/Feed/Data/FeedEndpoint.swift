import Foundation

enum FeedEndpoint: APIEndpoint {
    case fetchPosts

    var path: String { "/v1/feed/posts" }
    var method: HTTPMethod { .get }
    // Send token when available so viewerState.saved reflects real state
    var requiresAuth: Bool { true }
}
