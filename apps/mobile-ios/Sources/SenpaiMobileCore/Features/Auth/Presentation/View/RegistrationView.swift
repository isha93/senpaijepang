import SwiftUI

struct RegistrationView: View {
    @ObservedObject private var viewModel: RegistrationViewModel
    @ObservedObject private var langManager = LanguageManager.shared

    init(viewModel: RegistrationViewModel) {
        self.viewModel = viewModel
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            registrationHeader

            // Step content
            Group {
                switch viewModel.currentStep {
                case .accountInfo:
                    accountInfoStep
                case .preferences:
                    preferencesStep
                case .allSet:
                    successStep
                }
            }
            .transition(.asymmetric(
                insertion: .opacity.combined(with: .offset(x: 30)),
                removal: .opacity.combined(with: .offset(x: -30))
            ))
        }
        .background(AppTheme.backgroundCard)
        .navigationBarBackButtonHidden(true)
        #if os(iOS)
        .toolbar(.hidden, for: .tabBar)
        #endif
        .animation(AppTheme.animationDefault, value: viewModel.currentStep)
        .animation(AppTheme.animationSoft, value: viewModel.errorMessage)
    }

    // MARK: - Header with Progress Bar

    @ViewBuilder
    private var registrationHeader: some View {
        VStack(spacing: 0) {
            // Navigation bar
            ZStack {
                HStack {
                    if viewModel.currentStep != .allSet {
                        Button { viewModel.goBack() } label: {
                            Image(systemName: "arrow.left")
                                .font(.system(size: 18, weight: .medium))
                                .foregroundStyle(AppTheme.textSecondary)
                                .frame(width: 40, height: 40)
                        }
                    }
                    Spacer()
                }
                Text(viewModel.currentStep.title)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(AppTheme.textPrimary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)

            // Progress bar
            HStack(spacing: 4) {
                ForEach(0..<3, id: \.self) { index in
                    VStack(alignment: .leading, spacing: 4) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(progressColor(for: index))
                            .frame(height: 3)

                        Text(RegistrationStep.accountInfo.stepLabels[index])
                            .font(.system(size: 9, weight: index == viewModel.currentStep.rawValue ? .bold : .medium))
                            .foregroundStyle(index == viewModel.currentStep.rawValue ? AppTheme.accent : AppTheme.textTertiary)
                            .textCase(.uppercase)
                            .tracking(0.8)
                    }
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 12)

            Divider()
        }
    }

    private func progressColor(for index: Int) -> Color {
        if index == viewModel.currentStep.rawValue {
            return AppTheme.accent
        } else if index < viewModel.currentStep.rawValue {
            return AppTheme.accent.opacity(0.35)
        } else {
            return Color(.systemGray5)
        }
    }

    // MARK: - Step 1: Account Info

    @ViewBuilder
    private var accountInfoStep: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {
                // Title
                VStack(alignment: .leading, spacing: 4) {
                    LText("Create your account")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(AppTheme.textPrimary)
                    LText("Join Senpai Jepang to connect with jobs.")
                        .font(.system(size: 14))
                        .foregroundStyle(AppTheme.textSecondary)
                }
                .padding(.bottom, 24)

                // Full Name
                inputSection(label: "Full Name") {
                    HStack(spacing: 12) {
                        Image(systemName: "person.fill")
                            .font(.system(size: 16))
                            .foregroundStyle(AppTheme.textTertiary)
                        TextField("Full name", text: $viewModel.fullName)
                            .font(.system(size: 14))
                            .foregroundStyle(AppTheme.textPrimary)
                    }
                }
                .padding(.bottom, 16)

                // Email
                inputSection(label: "Email Address") {
                    HStack(spacing: 12) {
                        Image(systemName: "envelope.fill")
                            .font(.system(size: 16))
                            .foregroundStyle(AppTheme.textTertiary)
                        TextField("email@example.com", text: $viewModel.email)
                            .font(.system(size: 14))
                            .foregroundStyle(AppTheme.textPrimary)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                    }
                }
                .padding(.bottom, 16)

                // Password
                inputSection(label: "Password") {
                    HStack(spacing: 12) {
                        Image(systemName: "lock.fill")
                            .font(.system(size: 16))
                            .foregroundStyle(AppTheme.textTertiary)

                        Group {
                            if viewModel.isPasswordVisible {
                                TextField("Min. 8 characters", text: $viewModel.password)
                            } else {
                                SecureField("Min. 8 characters", text: $viewModel.password)
                            }
                        }
                        .font(.system(size: 14))
                        .foregroundStyle(AppTheme.textPrimary)

                        Button { viewModel.togglePasswordVisibility() } label: {
                            Image(systemName: viewModel.isPasswordVisible ? "eye.fill" : "eye.slash.fill")
                                .font(.system(size: 16))
                                .foregroundStyle(AppTheme.textTertiary)
                                .contentTransition(.symbolEffect(.replace))
                        }
                    }
                }
                .padding(.bottom, 8)

                // Error
                errorView

                // Continue button
                Button { viewModel.continueToNextStep() } label: {
                    HStack(spacing: 8) {
                        LText("Continue")
                            .font(.system(size: 16, weight: .bold))
                        Image(systemName: "arrow.right")
                            .font(.system(size: 16, weight: .bold))
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(AppTheme.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .shadow(color: AppTheme.accent.opacity(0.2), radius: 12, y: 6)
                }
                .buttonStyle(PressableButtonStyle())
                .padding(.top, 16)

                // Log in link
                HStack(spacing: 4) {
                    Spacer()
                    LText("Already have an account?")
                        .font(.system(size: 12))
                        .foregroundStyle(AppTheme.textSecondary)
                    Button { viewModel.goBack() } label: {
                        LText("Log in")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(AppTheme.accent)
                    }
                    Spacer()
                }
                .padding(.top, 16)
            }
            .padding(.horizontal, 24)
            .padding(.top, 24)
            .padding(.bottom, 32)
        }
    }

    // MARK: - Step 2: Preferences

    @ViewBuilder
    private var preferencesStep: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {
                // Title
                VStack(alignment: .leading, spacing: 4) {
                    LText("Tell us about yourself")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(AppTheme.textPrimary)
                    LText("Personalize your job recommendations.")
                        .font(.system(size: 14))
                        .foregroundStyle(AppTheme.textSecondary)
                }
                .padding(.bottom, 24)

                // Current Status
                VStack(alignment: .leading, spacing: 8) {
                    Text("CURRENT STATUS")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(AppTheme.textSecondary)
                        .tracking(0.8)
                        .padding(.leading, 4)

                    HStack(spacing: 12) {
                        ForEach(WorkStatus.allCases, id: \.self) { status in
                            statusCard(status: status, isSelected: viewModel.workStatus == status)
                        }
                    }
                }
                .padding(.bottom, 24)

                // Current Location
                VStack(alignment: .leading, spacing: 8) {
                    Text("CURRENT LOCATION")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(AppTheme.textSecondary)
                        .tracking(0.8)
                        .padding(.leading, 4)

                    // Dropdown-like picker
                    Menu {
                        ForEach(viewModel.prefectures, id: \.self) { prefecture in
                            Button(prefecture) {
                                viewModel.selectQuickPrefecture(prefecture)
                            }
                        }
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "location.fill")
                                .font(.system(size: 16))
                                .foregroundStyle(AppTheme.accent)
                            Text(viewModel.selectedPrefecture.isEmpty ? "Select Prefecture" : viewModel.selectedPrefecture)
                                .font(.system(size: 14))
                                .foregroundStyle(viewModel.selectedPrefecture.isEmpty ? AppTheme.textTertiary : AppTheme.textPrimary)
                            Spacer()
                            Image(systemName: "chevron.down")
                                .font(.system(size: 12))
                                .foregroundStyle(AppTheme.textTertiary)
                        }
                        .padding(.horizontal, 16)
                        .frame(height: 48)
                        .background(Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .stroke(Color(.systemGray4), lineWidth: 1)
                        )
                    }

                    // Quick prefecture pills
                    HStack(spacing: 8) {
                        ForEach(viewModel.quickPrefectures, id: \.self) { prefecture in
                            Button {
                                viewModel.selectQuickPrefecture(prefecture)
                            } label: {
                                Text(prefecture)
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundStyle(viewModel.selectedPrefecture == prefecture ? AppTheme.accent : AppTheme.textSecondary)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(AppTheme.backgroundCard)
                                    .clipShape(Capsule())
                                    .overlay(
                                        Capsule()
                                            .stroke(viewModel.selectedPrefecture == prefecture ? AppTheme.accent : Color(.systemGray4), lineWidth: 1)
                                    )
                            }
                        }
                    }
                    .padding(.top, 4)
                }

                Spacer(minLength: 40)

                // Bottom buttons
                HStack(spacing: 12) {
                    Button { viewModel.goBack() } label: {
                        LText("Back")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(AppTheme.textSecondary)
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(AppTheme.backgroundCard)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .stroke(Color(.systemGray4), lineWidth: 1)
                            )
                    }
                    .buttonStyle(PressableButtonStyle())

                    Button { viewModel.continueToNextStep() } label: {
                        LText("Next Step")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(AppTheme.accent)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            .shadow(color: AppTheme.accent.opacity(0.2), radius: 12, y: 6)
                    }
                    .buttonStyle(PressableButtonStyle())
                    .frame(maxWidth: .infinity)
                }
                .padding(.top, 32)
            }
            .padding(.horizontal, 24)
            .padding(.top, 24)
            .padding(.bottom, 32)
        }
    }

    @ViewBuilder
    private func statusCard(status: WorkStatus, isSelected: Bool) -> some View {
        Button {
            withAnimation(AppTheme.animationDefault) {
                viewModel.workStatus = status
            }
        } label: {
            VStack(spacing: 8) {
                Image(systemName: status.icon)
                    .font(.system(size: 20))
                    .foregroundStyle(isSelected ? AppTheme.accent : AppTheme.textTertiary)
                Text(status.rawValue)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(isSelected ? AppTheme.textPrimary : AppTheme.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(isSelected ? AppTheme.accent.opacity(0.05) : Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(isSelected ? AppTheme.accent : Color(.systemGray4), lineWidth: isSelected ? 1.5 : 1)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Step 3: Success

    @ViewBuilder
    private var successStep: some View {
        VStack(spacing: 0) {
            Spacer()

            // Checkmark icon
            ZStack {
                Circle()
                    .fill(AppTheme.accent.opacity(0.15))
                    .frame(width: 100, height: 100)
                    .blur(radius: 20)

                Circle()
                    .fill(AppTheme.accent)
                    .frame(width: 80, height: 80)
                    .shadow(color: AppTheme.accent.opacity(0.4), radius: 20, y: 8)

                Image(systemName: "checkmark")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundStyle(.white)
            }
            .padding(.bottom, 24)

            LText("Registration Complete!")
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(AppTheme.textPrimary)
                .padding(.bottom, 8)

            LText("Welcome to the family. Your journey starts here.")
                .font(.system(size: 14))
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 240)
                .padding(.bottom, 40)

            // Buttons
            VStack(spacing: 12) {
                Button { viewModel.goToDashboard() } label: {
                    LText("Go to Dashboard")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background(AppTheme.accent)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .shadow(color: AppTheme.accent.opacity(0.2), radius: 12, y: 6)
                }
                .buttonStyle(PressableButtonStyle())

                Button { viewModel.goToDashboard() } label: {
                    LText("Complete Profile Later")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(AppTheme.textTertiary)
                }
            }
            .padding(.horizontal, 32)

            Spacer()
        }
    }

    // MARK: - Shared Components

    @ViewBuilder
    private func inputSection<Content: View>(label: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(AppTheme.textSecondary)
                .tracking(0.8)
                .padding(.leading, 4)

            content()
                .padding(.horizontal, 14)
                .frame(height: 48)
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .stroke(Color(.systemGray4), lineWidth: 1)
                )
        }
    }

    @ViewBuilder
    private var errorView: some View {
        if let message = viewModel.errorMessage, !message.isEmpty {
            HStack(spacing: 8) {
                Image(systemName: "exclamationmark.circle.fill")
                    .font(.system(size: 14))
                Text(message)
                    .font(.system(size: 13))
            }
            .foregroundStyle(.red)
            .padding(.vertical, 8)
            .transition(.opacity.combined(with: .move(edge: .top)))
        }
    }
}
