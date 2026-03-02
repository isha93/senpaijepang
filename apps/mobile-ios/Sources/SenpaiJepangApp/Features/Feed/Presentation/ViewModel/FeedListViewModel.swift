import Combine
import Foundation

@MainActor
final class FeedListViewModel: ObservableObject, ManagedTask {
    @Published var allPosts: [FeedPost]
    @Published var isLoading: Bool
    @Published var errorMessage: String?
    @Published var searchText: String
    @Published var selectedCategory: String
    @Published var profileCompletion: Int

    let categories = ["All", "Visa Info", "Safety", "Job Market", "Living Guide", "Community"]

    /// Filtered posts based on selected category and search text
    var posts: [FeedPost] {
        var filtered = allPosts

        if selectedCategory != "All" {
            filtered = filtered.filter { $0.category == selectedCategory }
        }

        if !searchText.isEmpty {
            let query = searchText.lowercased()
            filtered = filtered.filter {
                $0.title.lowercased().contains(query) ||
                $0.content.lowercased().contains(query) ||
                ($0.source?.lowercased().contains(query) ?? false)
            }
        }

        return filtered
    }

    private let feedService: FeedServiceProtocol
    private let navigation: NavigationHandling

    init(
        feedService: FeedServiceProtocol,
        navigation: NavigationHandling
    ) {
        self.feedService = feedService
        self.navigation = navigation
        self.allPosts = []
        self.isLoading = false
        self.errorMessage = nil
        self.searchText = ""
        self.selectedCategory = "All"
        self.profileCompletion = 70 // Mock data for gamification banner (matches Profile mock)
    }

    func loadFeed() async {
        if let result = await executeTask({
            try await self.feedService.fetchFeed()
        }) {
            allPosts = result.isEmpty ? Self.mockPosts : result
        } else {
            allPosts = Self.mockPosts
        }
    }

    func navigateToNotifications() {
        navigation.push(.notifications)
    }

    func toggleSave(_ post: FeedPost) async {
        // Try service first, fall back to local toggle
        if let updated = await executeTask({
            try await self.feedService.toggleSavePost(postId: post.id)
        }) {
            if let index = allPosts.firstIndex(where: { $0.id == updated.id }) {
                allPosts[index] = updated
            }
        } else if let index = allPosts.firstIndex(where: { $0.id == post.id }) {
            // Local fallback: flip isSaved in-place
            let p = allPosts[index]
            allPosts[index] = FeedPost(
                id: p.id, authorName: p.authorName, content: p.content,
                createdAt: p.createdAt, isSaved: !p.isSaved, title: p.title,
                category: p.category, source: p.source, imageURL: p.imageURL
            )
        }
    }

    // MARK: - Mock Data
    static let mockPosts: [FeedPost] = [
        // Visa Info
        FeedPost(
            id: "1",
            authorName: "NHK World",
            content: "Understanding the new Specified Skilled Worker (SSW) Type 2 expansion rules",
            createdAt: Date().addingTimeInterval(-2 * 3600),
            title: "SSW Type 2 Expansion: What Foreign Workers Need to Know in 2026",
            category: "Visa Info",
            source: "NHK World"
        ),
        FeedPost(
            id: "2",
            authorName: "Immigration Bureau",
            content: "Step-by-step guide to renewing your work visa before expiration",
            createdAt: Date().addingTimeInterval(-8 * 3600),
            title: "Work Visa Renewal Guide: Documents, Timeline & Common Mistakes",
            category: "Visa Info",
            source: "Immigration Bureau Japan"
        ),
        FeedPost(
            id: "3",
            authorName: "MOFA Japan",
            content: "New digital visa application system launches for SSW applicants",
            createdAt: Date().addingTimeInterval(-36 * 3600),
            title: "Japan Launches Digital Visa Portal for Skilled Workers",
            category: "Visa Info",
            source: "MOFA Japan"
        ),

        // Safety
        FeedPost(
            id: "4",
            authorName: "Japan Meteorological Agency",
            content: "Typhoon season preparation guide for residents in Western Japan",
            createdAt: Date().addingTimeInterval(-5 * 3600),
            title: "Typhoon Season 2026: Safety Guide for Foreign Residents",
            category: "Safety",
            source: "Japan Meteorological Agency"
        ),
        FeedPost(
            id: "5",
            authorName: "Tokyo Fire Dept",
            content: "Earthquake preparedness essentials every resident should know",
            createdAt: Date().addingTimeInterval(-18 * 3600),
            title: "Earthquake Emergency Kit: What to Prepare Before the Next One",
            category: "Safety",
            source: "Tokyo Fire Department"
        ),

        // Job Market
        FeedPost(
            id: "6",
            authorName: "Nikkei Asia",
            content: "Japan's labor shortage drives 15% salary increase in manufacturing sector",
            createdAt: Date().addingTimeInterval(-3 * 3600),
            title: "Manufacturing Salaries Surge 15% as Japan Faces Record Labor Shortage",
            category: "Job Market",
            source: "Nikkei Asia"
        ),
        FeedPost(
            id: "7",
            authorName: "Japan Times",
            content: "Top 10 in-demand jobs for foreign workers in Japan this spring",
            createdAt: Date().addingTimeInterval(-12 * 3600),
            title: "Spring 2026: Top 10 In-Demand Jobs for Foreign Workers",
            category: "Job Market",
            source: "Japan Times"
        ),
        FeedPost(
            id: "8",
            authorName: "Senpai Jepang Official",
            content: "How to negotiate salary in Japan: cultural tips and practical advice",
            createdAt: Date().addingTimeInterval(-72 * 3600),
            title: "Salary Negotiation in Japan: A Cultural Guide for Foreign Workers",
            category: "Job Market",
            source: "Senpai Jepang Official"
        ),

        // Living Guide
        FeedPost(
            id: "9",
            authorName: "Tokyo Cheapo",
            content: "How to open a Japan Post Bank account: A step-by-step guide for beginners",
            createdAt: Date().addingTimeInterval(-48 * 3600),
            title: "Opening a Japan Post Bank Account: Complete Beginner's Guide",
            category: "Living Guide",
            source: "Tokyo Cheapo"
        ),
        FeedPost(
            id: "10",
            authorName: "GaijinPot",
            content: "Finding affordable apartments in Tokyo, Osaka, and Nagoya as a foreigner",
            createdAt: Date().addingTimeInterval(-24 * 3600),
            title: "Apartment Hunting in Japan: Best Apps & Tips for Foreigners",
            category: "Living Guide",
            source: "GaijinPot"
        ),
        FeedPost(
            id: "11",
            authorName: "Senpai Jepang Official",
            content: "Understanding Japanese health insurance: National vs. company plans",
            createdAt: Date().addingTimeInterval(-96 * 3600),
            title: "Health Insurance in Japan: Which Plan Is Right for You?",
            category: "Living Guide",
            source: "Senpai Jepang Official"
        ),

        // Community
        FeedPost(
            id: "12",
            authorName: "Senpai Jepang Official",
            content: "Indonesian community meetup in Osaka this weekend: Details & Registration",
            createdAt: Date().addingTimeInterval(-6 * 3600),
            title: "Osaka Indonesian Community Meetup: March 2026 🇮🇩",
            category: "Community",
            source: "Senpai Jepang Official"
        ),
        FeedPost(
            id: "13",
            authorName: "KBRI Tokyo",
            content: "Free Japanese language classes for Indonesian workers every Saturday",
            createdAt: Date().addingTimeInterval(-30 * 3600),
            title: "Free Japanese Classes by KBRI Tokyo — Every Saturday!",
            category: "Community",
            source: "KBRI Tokyo"
        ),
        FeedPost(
            id: "14",
            authorName: "Senpai Jepang Official",
            content: "Success story: From SSW trainee to restaurant manager in 3 years",
            createdAt: Date().addingTimeInterval(-120 * 3600),
            title: "Success Story: Budi's Journey from Trainee to Manager 🌟",
            category: "Community",
            source: "Senpai Jepang Official"
        ),
    ]
}
