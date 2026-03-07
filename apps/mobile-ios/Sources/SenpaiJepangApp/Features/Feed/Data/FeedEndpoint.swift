import Foundation

enum FeedEndpoint: APIEndpoint {
    case fetchPosts
    case savePost(postId: String)
    case unsavePost(postId: String)

    var path: String {
        switch self {
        case .fetchPosts:
            return "/v1/feed/posts"
        case .savePost:
            return "/v1/users/me/saved-posts"
        case .unsavePost(let postId):
            return "/v1/users/me/saved-posts/\(postId)"
        }
    }

    var method: HTTPMethod {
        switch self {
        case .fetchPosts:
            return .get
        case .savePost:
            return .post
        case .unsavePost:
            return .delete
        }
    }

    var body: Data? {
        switch self {
        case .savePost(let postId):
            return try? JSONEncoder().encode(SavePostRequestDTO(postId: postId))
        case .fetchPosts, .unsavePost:
            return nil
        }
    }

    // Feed list is public, but authenticated requests enrich viewerState.saved.
    var requiresAuth: Bool { true }
}
