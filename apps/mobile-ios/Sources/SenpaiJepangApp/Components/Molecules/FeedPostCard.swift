import SwiftUI

struct FeedPostCard: View {
    private let post: FeedPost
    private let onSave: () -> Void

    init(post: FeedPost, onSave: @escaping () -> Void) {
        self.post = post
        self.onSave = onSave
    }

    var body: some View {
        VStack(alignment: .leading, spacing: AppTheme.spacingS) {
            // Category + time
            HStack {
                if let category = post.category {
                    Text(category)
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(categoryColor(category))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(categoryColor(category).opacity(0.12))
                        .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
                }
                Spacer()
                Text(post.createdAt, style: .relative)
                    .font(.caption2)
                    .foregroundStyle(AppTheme.textTertiary)
            }

            // Title
            Text(post.title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(AppTheme.textPrimary)
                .lineLimit(3)

            // Source
            if let source = post.source {
                HStack(spacing: 6) {
                    Circle()
                        .fill(AppTheme.accentLight)
                        .frame(width: 20, height: 20)
                        .overlay {
                            Text(String(source.prefix(1)))
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(AppTheme.accent)
                        }
                    Text(source)
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }

            // Action row
            HStack(spacing: 16) {
                Button(action: onSave) {
                    Label(
                        post.isSaved ? "Saved" : "Login to save",
                        systemImage: post.isSaved ? "bookmark.fill" : "arrow.right.square"
                    )
                    .font(.caption)
                    .foregroundStyle(post.isSaved ? AppTheme.accent : AppTheme.textSecondary)
                }
                .buttonStyle(.plain)

                Spacer()

                HStack(spacing: 12) {
                    Image(systemName: "message")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textTertiary)
                    Image(systemName: "square.and.arrow.up")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textTertiary)
                }
            }
        }
        .padding(AppTheme.spacingL)
    }

    private func categoryColor(_ category: String) -> Color {
        switch category.lowercased() {
        case "visa info": return .blue
        case "safety": return .orange
        case "community": return .purple
        case "living guide": return .teal
        case "job market": return AppTheme.accent
        default: return AppTheme.accent
        }
    }
}
