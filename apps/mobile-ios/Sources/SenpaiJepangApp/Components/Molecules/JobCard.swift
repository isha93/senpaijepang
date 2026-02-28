import SwiftUI

struct JobCard: View {
    private let job: Job
    private let onTap: () -> Void
    private let onBookmark: () -> Void

    init(job: Job, onTap: @escaping () -> Void, onBookmark: @escaping () -> Void) {
        self.job = job
        self.onTap = onTap
        self.onBookmark = onBookmark
    }

    var body: some View {
        VStack(alignment: .leading, spacing: AppTheme.spacingM) {
            // Company header row
            HStack(alignment: .top) {
                // Company logo
                Circle()
                    .fill(AppTheme.accentLight)
                    .frame(width: 44, height: 44)
                    .overlay {
                        Text(job.companyLogoInitial ?? String(job.companyName.prefix(1)))
                            .font(.headline.bold())
                            .foregroundStyle(AppTheme.accent)
                    }

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 4) {
                        Text(job.companyName.uppercased())
                            .font(.caption.weight(.bold))
                            .foregroundStyle(AppTheme.textSecondary)
                        if job.isVerifiedEmployer {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.caption2)
                                .foregroundStyle(AppTheme.accent)
                        }
                    }
                    Text(job.title)
                        .font(.headline)
                        .foregroundStyle(AppTheme.textPrimary)
                }

                Spacer()

                Button {
                    withAnimation(AppTheme.animationSpring) {
                        onBookmark()
                    }
                } label: {
                    Image(systemName: job.isSaved ? "bookmark.fill" : "bookmark")
                        .font(.title3)
                        .foregroundStyle(job.isSaved ? AppTheme.accent : AppTheme.textSecondary)
                        .symbolEffect(.bounce, value: job.isSaved)
                }
                .buttonStyle(.plain)
            }

            // Meta row
            HStack(spacing: AppTheme.spacingM) {
                if !job.location.isEmpty {
                    Label(job.location, systemImage: "mappin.and.ellipse")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                if let sector = job.sector {
                    Label(sector, systemImage: "building.2")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                if let salary = job.salaryRange {
                    Label(salary, systemImage: "yensign.circle")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }

            // Footer row
            HStack {
                if let postedAt = job.postedAt {
                    Text("Posted \(postedAt, style: .relative) ago")
                        .font(.caption2)
                        .foregroundStyle(AppTheme.textTertiary)
                }

                Spacer()

                Button(action: onTap) {
                    Text("View Detail")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(AppTheme.accent)
                        .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadiusSmall, style: .continuous))
                }
                .buttonStyle(PressableButtonStyle())
            }
        }
        .padding(AppTheme.spacingL)
        .cardStyle()
    }
}
