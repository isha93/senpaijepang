import SwiftUI

struct NotificationsView: View {
    @ObservedObject private var viewModel: NotificationsViewModel
    @ObservedObject private var langManager = LanguageManager.shared

    init(viewModel: NotificationsViewModel) {
        self.viewModel = viewModel
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            notificationsHeader

            // Filter pills
            filterPills

            // Notification list
            notificationList
        }
        .background(AppTheme.backgroundCard)
        .navigationBarBackButtonHidden(true)
        #if os(iOS)
        .toolbar(.hidden, for: .tabBar)
        #endif
    }

    // MARK: - Header

    @ViewBuilder
    private var notificationsHeader: some View {
        VStack(spacing: 0) {
            HStack {
                Button { viewModel.goBack() } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(AppTheme.textSecondary)
                        .frame(width: 40, height: 40)
                }

                Text("Notifications")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(AppTheme.textPrimary)

                Spacer()

                if viewModel.unreadCount > 0 {
                    Button { viewModel.markAllRead() } label: {
                        Text("Mark all read")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(AppTheme.accent)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 12)
        }
    }

    // MARK: - Filter Pills

    @ViewBuilder
    private var filterPills: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(NotificationCategory.allCases, id: \.self) { category in
                    filterPill(category)
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.bottom, 12)
    }

    @ViewBuilder
    private func filterPill(_ category: NotificationCategory) -> some View {
        let isSelected = viewModel.selectedFilter == category
        Button {
            withAnimation(AppTheme.animationDefault) {
                viewModel.selectedFilter = category
            }
        } label: {
            Text(category.rawValue)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(isSelected ? .white : AppTheme.textSecondary)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(isSelected ? Color(.label) : Color(.systemGray6))
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    // MARK: - Notification List

    @ViewBuilder
    private var notificationList: some View {
        let groups = viewModel.groupedNotifications

        if groups.isEmpty {
            emptyState
        } else {
            ScrollView(showsIndicators: false) {
                LazyVStack(spacing: 0, pinnedViews: .sectionHeaders) {
                    ForEach(groups, id: \.0) { group in
                        Section {
                            ForEach(group.1) { notification in
                                notificationRow(notification)
                            }
                        } header: {
                            sectionHeader(group.0)
                        }
                    }

                    // Footer
                    VStack(spacing: 8) {
                        Image(systemName: "tray")
                            .font(.system(size: 32))
                            .foregroundStyle(AppTheme.textTertiary.opacity(0.3))
                        Text("No more notifications")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(AppTheme.textTertiary.opacity(0.3))
                    }
                    .padding(.vertical, 40)
                }
            }
        }
    }

    // MARK: - Section Header

    @ViewBuilder
    private func sectionHeader(_ title: String) -> some View {
        HStack {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .bold))
                .tracking(1)
                .foregroundStyle(AppTheme.textTertiary)
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(AppTheme.backgroundPrimary.opacity(0.5))
    }

    // MARK: - Notification Row

    @ViewBuilder
    private func notificationRow(_ item: NotificationItem) -> some View {
        HStack(alignment: .top, spacing: 12) {
            // Icon circle
            ZStack {
                Circle()
                    .fill(item.type.backgroundColor)
                    .frame(width: 36, height: 36)
                Image(systemName: item.type.icon)
                    .font(.system(size: 14))
                    .foregroundStyle(item.type.iconColor)
            }
            .padding(.top, 2)

            // Content
            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .top) {
                    Text(item.title)
                        .font(.system(size: 14, weight: item.isRead ? .medium : .bold))
                        .foregroundStyle(item.isRead ? AppTheme.textSecondary : AppTheme.textPrimary)
                        .lineLimit(1)

                    Spacer()

                    Text(item.timeAgo)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(AppTheme.textTertiary)
                }

                Text(item.message)
                    .font(.system(size: 12))
                    .foregroundStyle(item.isRead ? AppTheme.textTertiary : AppTheme.textSecondary)
                    .lineLimit(1)
            }

            // Dismiss button
            if item.isDismissable {
                Button { viewModel.dismiss(item) } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(AppTheme.textTertiary)
                        .frame(width: 28, height: 28)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(item.isRead ? AppTheme.backgroundCard : AppTheme.accent.opacity(0.04))
        .overlay(
            Rectangle()
                .fill(Color(.separator).opacity(0.3))
                .frame(height: 0.5),
            alignment: .bottom
        )
    }

    // MARK: - Empty State

    @ViewBuilder
    private var emptyState: some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: "bell.slash")
                .font(.system(size: 40))
                .foregroundStyle(AppTheme.textTertiary.opacity(0.3))
            Text("No notifications")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(AppTheme.textTertiary)
            Text("You're all caught up!")
                .font(.system(size: 12))
                .foregroundStyle(AppTheme.textTertiary.opacity(0.7))
            Spacer()
        }
    }
}
