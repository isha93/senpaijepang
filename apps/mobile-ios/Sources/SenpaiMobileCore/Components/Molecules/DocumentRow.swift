import SwiftUI

struct DocumentRow: View {
    private let document: VerificationDocument

    init(document: VerificationDocument) {
        self.document = document
    }

    var body: some View {
        HStack(spacing: AppTheme.spacingM) {
            // Icon
            Circle()
                .fill(iconBackground)
                .frame(width: 40, height: 40)
                .overlay {
                    Image(systemName: document.iconName)
                        .font(.system(size: 16))
                        .foregroundStyle(iconColor)
                }

            // Text
            VStack(alignment: .leading, spacing: 2) {
                LText(document.name)
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.textPrimary)
                LText(document.status.rawValue.capitalized) // Relies on enum naming; could need specific maps
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(statusTextColor)
            }

            Spacer()

            // Status indicator
            statusView
        }
        .padding(AppTheme.spacingM)
        .background(AppTheme.backgroundCard)
        .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadiusMedium, style: .continuous))
    }

    @ViewBuilder
    private var statusView: some View {
        switch document.status {
        case .verified:
            Image(systemName: "checkmark.circle.fill")
                .font(.title3)
                .foregroundStyle(AppTheme.accent)
        case .pendingReview:
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(AppTheme.textTertiary)
        case .upload:
            Text("Upload")
                .font(.caption.weight(.bold))
                .foregroundStyle(AppTheme.accent)
        }
    }

    private var iconBackground: Color {
        switch document.status {
        case .verified: return AppTheme.accentLight
        case .pendingReview: return Color.orange.opacity(0.12)
        case .upload: return AppTheme.grayMedium
        }
    }

    private var iconColor: Color {
        switch document.status {
        case .verified: return AppTheme.accent
        case .pendingReview: return .orange
        case .upload: return AppTheme.textSecondary
        }
    }

    private var statusTextColor: Color {
        switch document.status {
        case .verified: return AppTheme.accent
        case .pendingReview: return .orange
        case .upload: return AppTheme.textSecondary
        }
    }
}
