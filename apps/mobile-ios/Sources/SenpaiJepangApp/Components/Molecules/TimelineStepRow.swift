import SwiftUI

struct TimelineStepRow: View {
    private let step: ApplicationStep
    private let isLast: Bool
    private let isCurrent: Bool

    init(step: ApplicationStep, isLast: Bool = false, isCurrent: Bool = false) {
        self.step = step
        self.isLast = isLast
        self.isCurrent = isCurrent
    }

    var body: some View {
        HStack(alignment: .top, spacing: AppTheme.spacingM) {
            // Timeline indicator
            VStack(spacing: 0) {
                Circle()
                    .fill(circleColor)
                    .frame(width: isCurrent ? 20 : 16, height: isCurrent ? 20 : 16)
                    .overlay {
                        if step.completedAt != nil {
                            Image(systemName: "checkmark")
                                .font(.system(size: 8, weight: .bold))
                                .foregroundStyle(.white)
                        } else if isCurrent {
                            Circle()
                                .fill(.white)
                                .frame(width: 8, height: 8)
                        }
                    }

                if !isLast {
                    Rectangle()
                        .fill(step.completedAt != nil ? AppTheme.accent : AppTheme.border)
                        .frame(width: 2)
                        .frame(minHeight: 40)
                }
            }

            // Content
            VStack(alignment: .leading, spacing: AppTheme.spacingXS) {
                HStack {
                    Text(step.title)
                        .font(isCurrent ? .subheadline.weight(.bold) : .subheadline)
                        .foregroundStyle(isCurrent ? AppTheme.accent : (step.completedAt != nil ? AppTheme.textPrimary : AppTheme.textTertiary))
                }

                if let date = step.completedAt {
                    Text(date, style: .date)
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                } else if let estimated = step.estimatedCompletion {
                    Text("Estimated completion: \(estimated)")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                } else if !isCurrent {
                    Text("Pending")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textTertiary)
                }

                if let subtitle = step.subtitle, isCurrent {
                    HStack(spacing: 8) {
                        Image(systemName: "doc.text.fill")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                        Text(subtitle)
                            .font(.caption.weight(.medium))
                            .foregroundStyle(AppTheme.textPrimary)
                    }
                    .padding(AppTheme.spacingS)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(AppTheme.grayLight)
                    .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadiusSmall, style: .continuous))

                    // Progress bar for current step
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 3)
                                .fill(AppTheme.grayMedium)
                                .frame(height: 6)
                            RoundedRectangle(cornerRadius: 3)
                                .fill(AppTheme.accent)
                                .frame(width: geo.size.width * 0.7, height: 6)
                        }
                    }
                    .frame(height: 6)
                }
            }
            .padding(.bottom, isLast ? 0 : AppTheme.spacingS)
        }
    }

    private var circleColor: Color {
        if step.completedAt != nil {
            return AppTheme.accent
        } else if isCurrent {
            return AppTheme.accent
        } else {
            return AppTheme.border
        }
    }
}
