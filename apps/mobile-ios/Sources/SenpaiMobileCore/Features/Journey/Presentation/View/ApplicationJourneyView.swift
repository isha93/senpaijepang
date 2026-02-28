import SwiftUI

public struct ApplicationJourneyView: View {
    @ObservedObject private var viewModel: ApplicationJourneyViewModel

    public init(viewModel: ApplicationJourneyViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        ScrollView {
            if let journey = viewModel.journey {
                VStack(spacing: AppTheme.spacingL) {
                    // Status hero card
                    statusCard(journey)

                    // Timeline card
                    timelineCard(journey)

                    // Recent Updates
                    if !journey.recentUpdates.isEmpty {
                        recentUpdatesSection(journey.recentUpdates)
                    }
                }
                .padding(.horizontal, AppTheme.spacingL)
                .padding(.bottom, AppTheme.spacingXXL)
            }
        }
        .background(AppTheme.backgroundPrimary)
        .navigationTitle("My Application")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .overlay {
            if viewModel.isLoading { ProgressView() }
        }
        .task {
            await viewModel.loadJourney()
        }
    }

    // MARK: - Status Card
    @ViewBuilder
    private func statusCard(_ journey: ApplicationJourney) -> some View {
        VStack(alignment: .leading, spacing: AppTheme.spacingM) {
            HStack {
                VStack(alignment: .leading, spacing: AppTheme.spacingXS) {
                    // Active badge
                    Text("Active")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(AppTheme.accent)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(AppTheme.accentLight)
                        .clipShape(Capsule())

                    Text(journey.jobTitle)
                        .font(.title2.bold())
                        .foregroundStyle(AppTheme.textPrimary)

                    if let location = journey.jobLocation {
                        Text("\(location) • \(journey.companyName)")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.textSecondary)
                    } else {
                        Text(journey.companyName)
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }

                Spacer()

                Circle()
                    .fill(AppTheme.grayMedium)
                    .frame(width: 48, height: 48)
                    .overlay {
                        Text(String(journey.companyName.prefix(1)))
                            .font(.headline)
                            .foregroundStyle(AppTheme.textTertiary)
                    }
            }

            // Step counter
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("Step \(viewModel.currentStepIndex + 1)")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(AppTheme.accent)
                Text("of \(journey.totalSteps)")
                    .font(.headline)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            .padding(.top, AppTheme.spacingS)

            // Current step info
            if let currentStep = journey.steps.first(where: { $0.completedAt == nil }) {
                Text(currentStep.title)
                    .font(.headline)
                    .foregroundStyle(AppTheme.textPrimary)

                if let estimated = currentStep.estimatedCompletion {
                    Text("Your documents are currently being reviewed by the immigration bureau.")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.textSecondary)
                        .lineSpacing(2)
                } else {
                    Text("Waiting for next step in the process.")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
        }
        .padding(AppTheme.spacingXL)
        .cardStyle()
    }

    // MARK: - Timeline Card
    @ViewBuilder
    private func timelineCard(_ journey: ApplicationJourney) -> some View {
        VStack(alignment: .leading, spacing: AppTheme.spacingXL) {
            Text("Timeline")
                .font(.headline.bold())
                .foregroundStyle(AppTheme.textPrimary)

            ForEach(Array(journey.steps.enumerated()), id: \.element.id) { index, step in
                TimelineStepRow(
                    step: step,
                    isLast: index == journey.steps.count - 1,
                    isCurrent: index == viewModel.currentStepIndex
                )
            }
        }
        .padding(AppTheme.spacingXL)
        .cardStyle()
    }

    // MARK: - Recent Updates
    @ViewBuilder
    private func recentUpdatesSection(_ updates: [RecentUpdate]) -> some View {
        VStack(alignment: .leading, spacing: AppTheme.spacingM) {
            Text("Recent Updates")
                .font(.headline.bold())
                .foregroundStyle(AppTheme.textPrimary)
                .padding(.horizontal, 4)

            ForEach(updates) { update in
                HStack(spacing: AppTheme.spacingM) {
                    Circle()
                        .fill(updateIconBackground(update.iconName))
                        .frame(width: 40, height: 40)
                        .overlay {
                            Image(systemName: update.iconName)
                                .font(.system(size: 16))
                                .foregroundStyle(updateIconColor(update.iconName))
                        }

                    VStack(alignment: .leading, spacing: 2) {
                        Text(update.title)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(AppTheme.textPrimary)
                        Text(update.date)
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textTertiary)
                }
                .padding(AppTheme.spacingL)
                .cardStyle()
            }
        }
    }

    private func updateIconBackground(_ icon: String) -> Color {
        if icon.contains("envelope") { return Color.blue.opacity(0.1) }
        return AppTheme.accentLight
    }

    private func updateIconColor(_ icon: String) -> Color {
        if icon.contains("envelope") { return .blue }
        return AppTheme.accent
    }
}
