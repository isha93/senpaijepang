import SwiftUI

struct ProfileView: View {
    @ObservedObject private var viewModel: ProfileViewModel

    init(viewModel: ProfileViewModel) {
        self.viewModel = viewModel
    }

    var body: some View {
        ScrollView {
            if let profile = viewModel.profile {
                VStack(spacing: AppTheme.spacingL) {
                    // Profile Card
                    profileCard(profile)

                    // Profile Completion
                    completionCard(profile)

                    // Verification Documents
                    documentsSection(profile.documents)

                    // CTA
                    verificationCTA
                }
                .padding(.horizontal, AppTheme.spacingL)
                .padding(.bottom, AppTheme.spacingXXL)
            }
        }
        .background(AppTheme.backgroundPrimary)
        .navigationTitle("My Profile")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { } label: {
                    Image(systemName: "gearshape")
                        .foregroundStyle(AppTheme.textPrimary)
                }
            }
        }
        .overlay {
            if viewModel.isLoading { ProgressView() }
        }
        .task {
            await viewModel.loadProfile()
        }
    }

    // MARK: - Profile Card
    @ViewBuilder
    private func profileCard(_ profile: UserProfile) -> some View {
        VStack(spacing: 0) {
            // Green gradient background
            ZStack(alignment: .bottom) {
                LinearGradient(
                    colors: [AppTheme.accent.opacity(0.08), AppTheme.accent.opacity(0.18)],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .frame(height: 80)

                // Avatar
                VStack(spacing: 0) {
                    ZStack(alignment: .bottomTrailing) {
                        Circle()
                            .fill(Color.gray)
                            .frame(width: 96, height: 96)
                            .overlay {
                                Text(String(profile.fullName.prefix(1)))
                                    .font(.largeTitle.bold())
                                    .foregroundStyle(.white)
                            }
                            .overlay(
                                Circle()
                                    .stroke(.white, lineWidth: 4)
                            )

                        Circle()
                            .fill(AppTheme.accent)
                            .frame(width: 28, height: 28)
                            .overlay {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundStyle(.white)
                            }
                            .overlay(
                                Circle().stroke(.white, lineWidth: 2)
                            )
                    }
                }
                .offset(y: 48)
            }

            VStack(spacing: AppTheme.spacingXS) {
                Text(profile.fullName)
                    .font(.title3.bold())
                    .foregroundStyle(AppTheme.textPrimary)

                HStack(spacing: 4) {
                    if let jobTitle = profile.jobTitle {
                        Text(jobTitle)
                    }
                    if let userId = profile.userId {
                        Text("•")
                        Text("ID: \(userId)")
                    }
                }
                .font(.caption)
                .foregroundStyle(AppTheme.textSecondary)
            }
            .padding(.top, 56)

            // Trust Score + Status badges
            HStack(spacing: AppTheme.spacingM) {
                // Trust Score
                VStack(spacing: 4) {
                    Text("Trust Score")
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(AppTheme.accent.opacity(0.8))
                    Text(profile.trustScore ?? "—")
                        .font(.headline.bold())
                        .foregroundStyle(AppTheme.accent)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, AppTheme.spacingM)
                .background(AppTheme.accentLight)
                .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadiusMedium, style: .continuous))

                // Status
                VStack(spacing: 4) {
                    Text("Status")
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(AppTheme.textSecondary)
                    HStack(spacing: 4) {
                        Text(profile.verificationStatus.rawValue.capitalized)
                            .font(.headline.bold())
                            .foregroundStyle(AppTheme.textPrimary)
                        if profile.verificationStatus == .verified {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.caption)
                                .foregroundStyle(AppTheme.accent)
                        }
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, AppTheme.spacingM)
                .background(AppTheme.grayLight)
                .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadiusMedium, style: .continuous))
            }
            .padding(.horizontal, AppTheme.spacingXL)
            .padding(.top, AppTheme.spacingL)
            .padding(.bottom, AppTheme.spacingXL)
        }
        .cardStyle()
    }

    // MARK: - Completion Card
    @ViewBuilder
    private func completionCard(_ profile: UserProfile) -> some View {
        VStack(alignment: .leading, spacing: AppTheme.spacingS) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Profile Completion")
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.textPrimary)
                    Text("Complete your profile to apply for jobs")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                Spacer()
                Text("\(profile.completionPercentage)%")
                    .font(.headline.bold())
                    .foregroundStyle(AppTheme.accent)
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(AppTheme.grayMedium)
                        .frame(height: 8)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(AppTheme.accent)
                        .frame(width: geo.size.width * CGFloat(profile.completionPercentage) / 100, height: 8)
                }
            }
            .frame(height: 8)
        }
        .padding(AppTheme.spacingXL)
        .cardStyle()
    }

    // MARK: - Documents Section
    @ViewBuilder
    private func documentsSection(_ documents: [VerificationDocument]) -> some View {
        VStack(alignment: .leading, spacing: AppTheme.spacingM) {
            Text("Verification Documents")
                .font(.headline.bold())
                .foregroundStyle(AppTheme.textPrimary)
                .padding(.horizontal, 4)

            ForEach(documents) { doc in
                DocumentRow(document: doc)
            }
        }
    }

    // MARK: - CTA
    @ViewBuilder
    private var verificationCTA: some View {
        VStack(spacing: AppTheme.spacingM) {
            Circle()
                .fill(AppTheme.accentLight)
                .frame(width: 48, height: 48)
                .overlay {
                    Image(systemName: "shield.checkered")
                        .font(.title3)
                        .foregroundStyle(AppTheme.accent)
                }

            Text("Verify your identity")
                .font(.subheadline.bold())
                .foregroundStyle(AppTheme.textPrimary)

            Text("Complete all steps to apply for high-salary jobs in Japan.")
                .font(.caption)
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)

            PrimaryButton(title: "Request Final Verification") {
                viewModel.requestVerification()
            }
        }
        .padding(AppTheme.spacingXL)
        .cardStyle()
    }
}
