import Foundation

// MARK: - Feed list

struct FeedListResponseDTO: Decodable {
    let items: [FeedPostDTO]
    let pageInfo: PageInfoDTO
}

struct FeedPostDTO: Decodable {
    let id: String
    let title: String
    let excerpt: String
    let category: String
    let author: String
    let imageUrl: String?
    let publishedAt: String
    let viewerState: FeedViewerStateDTO?

    func toFeedPost() -> FeedPost {
        FeedPost(
            id: id,
            authorName: author,
            content: excerpt,
            createdAt: parseDate(publishedAt),
            isSaved: viewerState?.saved ?? false,
            title: title,
            category: mapCategory(category),
            source: author,
            imageURL: imageUrl
        )
    }
}

struct FeedViewerStateDTO: Decodable {
    let authenticated: Bool
    let saved: Bool
}

// MARK: - Helpers

private func parseDate(_ iso: String) -> Date {
    let formatter = ISO8601DateFormatter()
    return formatter.date(from: iso) ?? Date()
}

private func mapCategory(_ raw: String) -> String {
    switch raw.uppercased() {
    case "VISA":                return "Visa Info"
    case "CAREER", "INTERVIEW": return "Job Market"
    case "LIFESTYLE":           return "Living Guide"
    case "SAFETY":              return "Safety"
    case "COMMUNITY":           return "Community"
    default:                    return raw.capitalized
    }
}
