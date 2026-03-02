import SwiftUI

struct JobDetailView: View {
    @StateObject private var viewModel: JobDetailViewModel
    @ObservedObject private var langManager = LanguageManager.shared

    init(viewModel: JobDetailViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            ScrollView {
                if let detail = viewModel.detail {
                    VStack(spacing: 0) {
                        // Header — logo + info
                        VStack(spacing: AppTheme.spacingM) {
                            // Company logo
                            ZStack(alignment: .bottomTrailing) {
                                RoundedRectangle(cornerRadius: AppTheme.cornerRadiusLarge, style: .continuous)
                                    .fill(Color.white)
                                    .frame(width: 96, height: 96)
                                    .shadow(color: .black.opacity(0.06), radius: 8, x: 0, y: 2)
                                    .overlay {
                                        Text(detail.job.companyLogoInitial ?? String(detail.job.companyName.prefix(1)))
                                            .font(.largeTitle.bold())
                                            .foregroundStyle(AppTheme.accent)
                                    }

                                if detail.job.isVerifiedEmployer {
                                    Circle()
                                        .fill(AppTheme.accent)
                                        .frame(width: 28, height: 28)
                                        .overlay {
                                            Image(systemName: "checkmark")
                                                .font(.system(size: 12, weight: .bold))
                                                .foregroundStyle(.white)
                                        }
                                        .offset(x: 4, y: 4)
                                }
                            }

                            Text(detail.job.title)
                                .font(.title2.bold())
                                .foregroundStyle(AppTheme.textPrimary)
                                .multilineTextAlignment(.center)

                            Text(detail.job.companyName)
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(AppTheme.textSecondary)

                            if detail.job.isVerifiedEmployer {
                                HStack(spacing: 4) {
                                    Image(systemName: "checkmark.shield.fill")
                                        .font(.caption)
                                    LText("Verified Employer")
                                        .font(.caption.weight(.medium))
                                }
                                .foregroundStyle(AppTheme.accent)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(AppTheme.accentLight)
                                .clipShape(Capsule())
                            }
                        }
                        .padding(.top, AppTheme.spacingXXL)
                        .frame(maxWidth: .infinity)

                        // Tags
                        HStack(spacing: AppTheme.spacingS) {
                            if let type = detail.employmentType {
                                tagPill(icon: "clock", text: type.localized())
                            }
                            if detail.isVisaSponsored {
                                tagPill(icon: "briefcase.fill", text: "Visa Sponsored".localized())
                            }
                            if let loc = detail.locationDetail {
                                tagPill(icon: "mappin", text: loc)
                            }
                        }
                        .padding(.top, AppTheme.spacingXL)
                        .padding(.horizontal, AppTheme.spacingL)

                        // Salary Range
                        if let salary = detail.job.salaryRange {
                            HStack(spacing: AppTheme.spacingS) {
                                Image(systemName: "yensign.circle.fill")
                                    .font(.title3)
                                    .foregroundStyle(AppTheme.accent)
                                Text(salary)
                                    .font(.headline.bold())
                                    .foregroundStyle(AppTheme.textPrimary)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(AppTheme.spacingL)
                            .background(AppTheme.accentLight)
                            .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadiusMedium, style: .continuous))
                            .padding(.horizontal, AppTheme.spacingXL)
                            .padding(.top, AppTheme.spacingL)
                        }

                        // About the Role
                        VStack(alignment: .leading, spacing: AppTheme.spacingM) {
                            sectionTitle("About the Role".localized())
                            Text(detail.description)
                                .font(.subheadline)
                                .foregroundStyle(AppTheme.textSecondary)
                                .lineSpacing(4)
                        }
                        .padding(.horizontal, AppTheme.spacingXL)
                        .padding(.top, AppTheme.spacingXXL)

                        // Requirements
                        if !detail.requirements.isEmpty {
                            VStack(alignment: .leading, spacing: AppTheme.spacingM) {
                                sectionTitle("Requirements".localized())
                                ForEach(detail.requirements, id: \.self) { req in
                                    HStack(alignment: .top, spacing: AppTheme.spacingM) {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundStyle(AppTheme.accent)
                                            .font(.body)
                                            .padding(.top, 1)
                                        Text(req)
                                            .font(.subheadline)
                                            .foregroundStyle(AppTheme.textSecondary)
                                            .lineSpacing(3)
                                    }
                                }
                            }
                            .padding(.horizontal, AppTheme.spacingXL)
                            .padding(.top, AppTheme.spacingXXL)
                        }

                        // Benefits
                        if !detail.benefits.isEmpty {
                            VStack(alignment: .leading, spacing: AppTheme.spacingM) {
                                sectionTitle("Benefits")
                                ForEach(detail.benefits, id: \.self) { benefit in
                                    HStack(alignment: .top, spacing: AppTheme.spacingM) {
                                        Image(systemName: "star.fill")
                                            .foregroundStyle(.orange)
                                            .font(.caption)
                                            .padding(.top, 3)
                                        Text(benefit)
                                            .font(.subheadline)
                                            .foregroundStyle(AppTheme.textSecondary)
                                            .lineSpacing(3)
                                    }
                                }
                            }
                            .padding(AppTheme.spacingXL)
                            .background(Color.orange.opacity(0.05))
                            .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadiusLarge, style: .continuous))
                            .padding(.horizontal, AppTheme.spacingL)
                            .padding(.top, AppTheme.spacingXL)
                        }

                        // Location
                        VStack(alignment: .leading, spacing: AppTheme.spacingM) {
                            sectionTitle("Location".localized())
                            RoundedRectangle(cornerRadius: AppTheme.cornerRadiusLarge, style: .continuous)
                                .fill(AppTheme.grayMedium)
                                .frame(height: 160)
                                .overlay {
                                    VStack(spacing: 8) {
                                        Circle()
                                            .fill(.white)
                                            .frame(width: 40, height: 40)
                                            .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
                                            .overlay {
                                                Image(systemName: "mappin.and.ellipse")
                                                    .foregroundStyle(AppTheme.accent)
                                            }
                                        Text(detail.locationDetail ?? detail.job.location)
                                            .font(.caption.weight(.medium))
                                            .foregroundStyle(AppTheme.textSecondary)
                                    }
                                }
                        }
                        .padding(.horizontal, AppTheme.spacingXL)
                        .padding(.top, AppTheme.spacingXXL)
                        .padding(.bottom, 100) // Bottom padding for CTA
                    }
                    .transition(.opacity)
                }
            }
            .background(AppTheme.backgroundPrimary)

            // Sticky CTA
            VStack {
                PrimaryButton(title: "Lamar Pekerjaan") {
                    viewModel.applyJob()
                }
                .padding(.horizontal, AppTheme.spacingL)
            }
            .padding(.vertical, AppTheme.spacingL)
            .background(.ultraThinMaterial)
            .transition(.move(edge: .bottom).combined(with: .opacity))
        }
        .navigationTitle(langManager.localize(key: "Job Details"))
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { } label: {
                    Image(systemName: "bookmark")
                        .foregroundStyle(AppTheme.textPrimary)
                }
            }
        }
        .overlay {
            if viewModel.isLoading { ProgressView() }
        }
        .task {
            await viewModel.loadDetail()
        }
    }

    @ViewBuilder
    private func tagPill(icon: String, text: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption2)
            Text(text)
                .font(.caption.weight(.medium))
        }
        .foregroundStyle(AppTheme.textSecondary)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(AppTheme.grayLight)
        .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadiusSmall, style: .continuous))
    }

    @ViewBuilder
    private func sectionTitle(_ title: String) -> some View {
        LText(title)
            .font(.headline.bold())
            .foregroundStyle(AppTheme.textPrimary)
    }
}
