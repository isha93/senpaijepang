import Foundation
import Combine
import SwiftUI

@MainActor
final class ArticleDetailViewModel: ObservableObject {
    let post: FeedPost
    private let feedService: FeedServiceProtocol
    private let navigation: NavigationHandling
    private let onSaveStateChange: ((String, Bool) -> Void)?

    @Published var isSaved: Bool
    @Published var isSaving: Bool = false
    @Published var feedbackGiven: Bool = false

    init(
        post: FeedPost,
        feedService: FeedServiceProtocol,
        navigation: NavigationHandling,
        onSaveStateChange: ((String, Bool) -> Void)? = nil
    ) {
        self.post = post
        self.feedService = feedService
        self.navigation = navigation
        self.onSaveStateChange = onSaveStateChange
        self.isSaved = post.isSaved
    }

    func goBack() {
        navigation.pop()
    }

    func toggleSave() async {
        guard !isSaving else { return }
        isSaving = true
        do {
            let updatedSavedState = try await feedService.toggleSavePost(
                postId: post.id,
                currentlySaved: isSaved
            )
            self.isSaved = updatedSavedState
            onSaveStateChange?(post.id, updatedSavedState)
        } catch {
            print("Error toggling save: \(error)")
        }
        isSaving = false
    }
    
    func giveFeedback(isHelpful: Bool) {
        withAnimation(AppTheme.animationDefault) {
            feedbackGiven = true
        }
    }

    // MARK: - Derived display data

    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.locale = Locale(identifier: "en_US")
        return formatter.string(from: post.createdAt)
    }

    var readTime: String {
        let words = post.content.split(separator: " ").count + post.title.split(separator: " ").count
        let minutes = max(1, words / 180)
        return "\(minutes) min read"
    }

    var bodySection: ArticleBodySection {
        ArticleBodySection.forCategory(post.category ?? "General", source: post.source)
    }

    var shareItems: [Any] {
        [shareMessage]
    }

    var shareMessage: String {
        let source = post.source?.trimmingCharacters(in: .whitespacesAndNewlines)
        let teaser = post.content.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedTeaser = teaser.count > 140 ? String(teaser.prefix(137)) + "..." : teaser

        var lines = [post.title]
        if !trimmedTeaser.isEmpty {
            lines.append(trimmedTeaser)
        }
        if let source, !source.isEmpty {
            lines.append("Source: \(source)")
        }
        lines.append("Shared from Senpai Jepang")
        return lines.joined(separator: "\n\n")
    }
}

struct ArticleBodySection {
    let heading: String
    let body: String
    let bullets: [String]
    let quote: String
    let quoteAuthor: String

    static func forCategory(_ category: String, source: String?) -> ArticleBodySection {
        let src = source ?? "Senpai Jepang"
        switch category {
        case "Visa Info":
            return ArticleBodySection(
                heading: "Key Points to Prepare",
                body: "Navigating Japan's visa system can be complex, but understanding the latest requirements puts you ahead. Whether you are applying for the first time or renewing, these are the most critical things to know right now.",
                bullets: [
                    "JFT-Basic or JLPT N4 certification remains mandatory for language proficiency.",
                    "Skill Test (Tokutei Ginou) results must be from an approved testing center.",
                    "Medical certificate from a certified clinic is required within 3 months of application.",
                    "Employer sponsorship letter must be stamped and notarized."
                ],
                quote: "Our goal is to make the visa process more transparent and accessible to all qualified foreign workers who wish to contribute to Japan's workforce.",
                quoteAuthor: "— Immigration Services Agency of Japan"
            )
        case "Safety":
            return ArticleBodySection(
                heading: "What You Should Prepare Now",
                body: "Living in Japan means being ready for natural disasters and seasonal hazards. The good news: Japan has world-class safety infrastructure. But preparation on your part makes all the difference — especially when instructions are in Japanese.",
                bullets: [
                    "Register your address at your local municipal office (役所) to receive disaster alerts.",
                    "Download the Disaster Prevention app (Safety tips) in multiple languages.",
                    "Keep a 3-day emergency kit: water, food, flashlight, documents, and cash.",
                    "Know your nearest evacuation shelter (避難場所) — ask your employer or landlord."
                ],
                quote: "Foreign residents who prepare in advance are significantly better protected during emergency events. Don't wait for disaster to learn the evacuation routes.",
                quoteAuthor: "— Tokyo Metropolitan Government, Disaster Management Bureau"
            )
        case "Job Market":
            return ArticleBodySection(
                heading: "Opportunities for Foreign Workers",
                body: "Japan's labor shortage continues to drive demand for skilled foreign workers across almost every sector. Salaries are rising, visa pathways are expanding, and companies are actively investing in multicultural workplaces.",
                bullets: [
                    "Manufacturing, nursing care, and construction remain the highest-demand sectors.",
                    "SSW Type 2 expansion means more routes to long-term residency.",
                    "Companies offering Japanese language training on the job are increasingly common.",
                    "Average salaries in skilled sectors have risen 10–18% year-over-year since 2024."
                ],
                quote: "The expansion of the Specified Skilled Worker program is a direct response to Japan's structural need for a globally integrated workforce.",
                quoteAuthor: "— Ministry of Economy, Trade and Industry (METI)"
            )
        case "Living Guide":
            return ArticleBodySection(
                heading: "Practical Tips for Daily Life",
                body: "Settling into life in Japan is a rewarding journey, but the initial steps — banking, insurance, housing — can be overwhelming. Here is what experienced foreign residents wish they had known from day one.",
                bullets: [
                    "Open a Japan Post Bank (ゆうちょ銀行) account first — easiest for newcomers with foreign ID.",
                    "Register for National Health Insurance (国民健康保険) within 14 days of arrival.",
                    "Use Suica or ICOCA IC cards for all train and bus travel — accepted almost everywhere.",
                    "Set up NHK subscription only if you own a TV — otherwise you are not obligated."
                ],
                quote: "The more you integrate into local life — learning the language, joining community events — the more Japan gives back to you.",
                quoteAuthor: "— \(src)"
            )
        case "Community":
            return ArticleBodySection(
                heading: "Staying Connected Abroad",
                body: "One of the most important things for foreign workers in Japan is finding their community. Loneliness and isolation are real challenges, but Indonesia's community in Japan is vibrant, supportive, and growing every year.",
                bullets: [
                    "Indonesian communities are active in Tokyo, Osaka, Nagoya, and Hiroshima.",
                    "KBRI Tokyo hosts regular events — from legal consultations to cultural celebrations.",
                    "Online groups on LINE and Facebook connect workers by region and industry.",
                    "Local mosques and prayer rooms are available in most major cities."
                ],
                quote: "You are never alone in Japan. There are tens of thousands of Indonesian workers here — reach out, share your experience, and help each other grow.",
                quoteAuthor: "— KBRI Tokyo, Indonesian Embassy in Japan"
            )
        default:
            return ArticleBodySection(
                heading: "What This Means for You",
                body: "Staying informed is the first step to making the most of your experience as a foreign worker in Japan. This update has direct implications for your day-to-day life, career prospects, and legal status.",
                bullets: [
                    "Review your current documentation and ensure everything is up to date.",
                    "Consult your employer or a registered immigration lawyer if you have questions.",
                    "Follow official government channels for the most accurate and timely updates."
                ],
                quote: "Informed workers make better decisions — for themselves, their families, and the communities they serve.",
                quoteAuthor: "— \(src)"
            )
        }
    }
}
