import Foundation
import SwiftUI

enum NotificationCategory: String, CaseIterable {
    case all = "All"
    case unread = "Unread"
    case jobs = "Jobs"
    case system = "System"
}

enum NotificationType {
    case job
    case verification
    case news
    case comment
    case systemUpdate

    var icon: String {
        switch self {
        case .job: return "briefcase.fill"
        case .verification: return "checkmark.shield.fill"
        case .news: return "newspaper.fill"
        case .comment: return "bubble.left.fill"
        case .systemUpdate: return "gearshape.fill"
        }
    }

    var iconColor: Color {
        switch self {
        case .job: return .green
        case .verification: return .blue
        case .news: return .purple
        case .comment: return .orange
        case .systemUpdate: return Color(.systemGray)
        }
    }

    var backgroundColor: Color {
        switch self {
        case .job: return Color.green.opacity(0.12)
        case .verification: return Color.blue.opacity(0.12)
        case .news: return Color.purple.opacity(0.12)
        case .comment: return Color.orange.opacity(0.12)
        case .systemUpdate: return Color(.systemGray5)
        }
    }

    var category: NotificationCategory {
        switch self {
        case .job: return .jobs
        case .verification, .systemUpdate: return .system
        case .news, .comment: return .all
        }
    }
}

struct NotificationItem: Identifiable {
    let id: String
    let type: NotificationType
    let title: String
    let message: String
    let timeAgo: String
    let dateGroup: String
    var isRead: Bool
    var isDismissable: Bool

    static let mockData: [NotificationItem] = [
        // Today
        NotificationItem(
            id: "n1", type: .job,
            title: "Construction Worker Alert",
            message: "New position in Osaka matching your skills.",
            timeAgo: "2m", dateGroup: "Today",
            isRead: false, isDismissable: true
        ),
        NotificationItem(
            id: "n2", type: .verification,
            title: "Verification Successful",
            message: "Documents verified. You can now apply for premium jobs.",
            timeAgo: "1h", dateGroup: "Today",
            isRead: false, isDismissable: true
        ),
        NotificationItem(
            id: "n3", type: .news,
            title: "Daily Japan News",
            message: "Visa updates and community events for workers.",
            timeAgo: "4h", dateGroup: "Today",
            isRead: true, isDismissable: false
        ),
        // Yesterday
        NotificationItem(
            id: "n4", type: .comment,
            title: "New Comment on your post",
            message: "Budi Santoso replied to \"Best halal food in Tokyo?\"",
            timeAgo: "1d", dateGroup: "Yesterday",
            isRead: true, isDismissable: false
        ),
        NotificationItem(
            id: "n5", type: .systemUpdate,
            title: "System Update v2.4",
            message: "Update now for better performance and stability.",
            timeAgo: "1d", dateGroup: "Yesterday",
            isRead: true, isDismissable: false
        ),
    ]
}

@MainActor
final class NotificationsViewModel: ObservableObject {
    @Published var notifications: [NotificationItem] = NotificationItem.mockData
    @Published var selectedFilter: NotificationCategory = .all
    
    private let navigation: NavigationHandling
    
    init(navigation: NavigationHandling) {
        self.navigation = navigation
    }

    var filteredNotifications: [NotificationItem] {
        switch selectedFilter {
        case .all:
            return notifications
        case .unread:
            return notifications.filter { !$0.isRead }
        case .jobs:
            return notifications.filter { $0.type.category == .jobs }
        case .system:
            return notifications.filter { $0.type.category == .system }
        }
    }

    var groupedNotifications: [(String, [NotificationItem])] {
        let grouped = Dictionary(grouping: filteredNotifications) { $0.dateGroup }
        let order = ["Today", "Yesterday"]
        return order.compactMap { key in
            guard let items = grouped[key], !items.isEmpty else { return nil }
            return (key, items)
        }
    }

    var unreadCount: Int {
        notifications.filter { !$0.isRead }.count
    }

    func markAllRead() {
        withAnimation(AppTheme.animationDefault) {
            for i in notifications.indices {
                notifications[i].isRead = true
            }
        }
    }

    func dismiss(_ notification: NotificationItem) {
        withAnimation(AppTheme.animationDefault) {
            notifications.removeAll { $0.id == notification.id }
        }
    }

    func goBack() {
        navigation.pop()
    }
}
