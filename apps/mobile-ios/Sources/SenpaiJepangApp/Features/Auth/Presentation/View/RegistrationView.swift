import SwiftUI

struct RegistrationView: View {
    @ObservedObject private var viewModel: RegistrationViewModel
    @ObservedObject private var langManager = LanguageManager.shared
    @FocusState private var isVerificationFieldFocused: Bool

    init(viewModel: RegistrationViewModel) {
        self.viewModel = viewModel
    }

    var body: some View {
        VStack(spacing: 0) {
            registrationHeader

            Group {
                switch viewModel.currentStep {
                case .accountInfo:
                    accountInfoStep
                case .verifyEmail:
                    verifyEmailStep
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
        .animation(AppTheme.animationSoft, value: viewModel.infoMessage)
    }

    // MARK: - Header with Progress Bar

    @ViewBuilder
    private var registrationHeader: some View {
        VStack(spacing: 0) {
            ZStack {
                HStack {
                    if viewModel.currentStep != .allSet {
                        Button { viewModel.goBack() } label: {
                            Image(systemName: "arrow.left")
                                .font(.system(size: 18, weight: .medium))
                                .foregroundStyle(AppTheme.textSecondary)
                                .frame(width: 40, height: 40)
                        }
                        .accessibilityIdentifier("registration_back_button")
                    }
                    Spacer()
                }
                Text(viewModel.currentStep.title)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(AppTheme.textPrimary)
                    .accessibilityIdentifier("registration_header_title")
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)

            HStack(spacing: 4) {
                ForEach(0..<4, id: \.self) { index in
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
                VStack(alignment: .leading, spacing: 4) {
                    LText("Create your account")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(AppTheme.textPrimary)
                    LText("Join Senpai Jepang to connect with jobs.")
                        .font(.system(size: 14))
                        .foregroundStyle(AppTheme.textSecondary)
                }
                .padding(.bottom, 24)

                inputSection(label: "Full Name") {
                    HStack(spacing: 12) {
                        Image(systemName: "person.fill")
                            .font(.system(size: 16))
                            .foregroundStyle(AppTheme.textTertiary)
                        TextField("Full name", text: $viewModel.fullName)
                            .font(.system(size: 14))
                            .foregroundStyle(AppTheme.textPrimary)
                            .accessibilityIdentifier("registration_full_name_input")
                    }
                }
                .padding(.bottom, 16)

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
                            .accessibilityIdentifier("registration_email_input")
                    }
                }
                .padding(.bottom, 16)

                inputSection(label: "Password") {
                    secureInput(
                        text: $viewModel.password,
                        isVisible: viewModel.isPasswordVisible,
                        placeholder: "Min. 8 characters",
                        systemImage: "lock.fill",
                        textContentType: .newPassword,
                        toggleAction: viewModel.togglePasswordVisibility,
                        toggleAccessibilityIdentifier: "registration_password_visibility_button",
                        accessibilityIdentifier: "registration_password_input"
                    )
                }
                .padding(.bottom, 16)

                inputSection(label: "Confirm Password") {
                    secureInput(
                        text: $viewModel.confirmPassword,
                        isVisible: viewModel.isConfirmPasswordVisible,
                        placeholder: "Repeat password",
                        systemImage: "lock.rotation",
                        textContentType: .newPassword,
                        toggleAction: viewModel.toggleConfirmPasswordVisibility,
                        toggleAccessibilityIdentifier: "registration_confirm_password_visibility_button",
                        accessibilityIdentifier: "registration_confirm_password_input"
                    )
                }
                .padding(.bottom, 8)

                statusMessageView

                primaryButton(
                    title: "Continue",
                    systemImage: "arrow.right",
                    isLoading: viewModel.isRegistering,
                    isDisabled: viewModel.isRegistering,
                    accessibilityIdentifier: "registration_continue_button",
                    action: viewModel.continueToNextStep
                )
                .padding(.top, 16)

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
        #if os(iOS)
        .scrollDismissesKeyboard(.immediately)
        #endif
        .accessibilityIdentifier("registration_account_view")
    }

    // MARK: - Step 3: Preferences

    @ViewBuilder
    private var preferencesStep: some View {
        VStack(spacing: 0) {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    VStack(alignment: .leading, spacing: 4) {
                        LText("Tell us about yourself")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundStyle(AppTheme.textPrimary)
                        LText("Set your preferences before you enter the app.")
                            .font(.system(size: 14))
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .padding(.bottom, 24)

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

                    VStack(alignment: .leading, spacing: 8) {
                        Text("CURRENT LOCATION")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(AppTheme.textSecondary)
                            .tracking(0.8)
                            .padding(.leading, 4)

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

                    statusMessageView
                        .padding(.top, 16)

                    Spacer(minLength: 40)
                }
                .padding(.horizontal, 24)
                .padding(.top, 24)
                .padding(.bottom, 32)
            }
            #if os(iOS)
            .scrollDismissesKeyboard(.immediately)
            #endif

            Divider()

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
                .disabled(viewModel.isRegistering)

                primaryButton(
                    title: "Continue",
                    systemImage: "arrow.right",
                    isLoading: false,
                    isDisabled: false,
                    accessibilityIdentifier: "registration_create_account_button",
                    action: viewModel.continueToNextStep
                )
            }
            .padding(.horizontal, 24)
            .padding(.top, 20)
            .padding(.bottom, 24)
        }
        .accessibilityIdentifier("registration_preferences_view")
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

    // MARK: - Step 2: Verify Email

    @ViewBuilder
    private var verifyEmailStep: some View {
        VStack(spacing: 0) {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    Circle()
                        .fill(AppTheme.accent.opacity(0.14))
                        .frame(width: 92, height: 92)
                        .overlay {
                            Image(systemName: "envelope.badge")
                                .font(.system(size: 34, weight: .semibold))
                                .foregroundStyle(AppTheme.accent)
                        }
                        .padding(.top, 56)
                        .padding(.bottom, 28)

                    LText("Check your email")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(AppTheme.textPrimary)
                        .padding(.bottom, 12)

                    VStack(spacing: 6) {
                        LText("We sent a 6-digit code to")
                            .font(.system(size: 15))
                            .foregroundStyle(AppTheme.textSecondary)
                        Text(viewModel.displayedEmail)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(AppTheme.textPrimary)
                            .italic()
                    }
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
                    .padding(.bottom, 36)

                    otpInputRow
                        .padding(.horizontal, 24)

                    statusMessageView
                        .padding(.top, 24)
                        .padding(.horizontal, 24)

                    Button { viewModel.changeEmail() } label: {
                        Text("Change email")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(AppTheme.accent)
                    }
                    .accessibilityIdentifier("registration_change_email_button")
                    .padding(.top, 28)

                    resendCard
                        .padding(.top, 24)
                        .padding(.horizontal, 24)
                        .padding(.bottom, 24)
                }
            }

            Divider()

            VStack(spacing: 16) {
                primaryButton(
                    title: "Verify Email",
                    systemImage: nil,
                    isLoading: viewModel.isVerifyingEmail,
                    isDisabled: viewModel.verificationCode.count < 6 || viewModel.isVerifyingEmail,
                    accessibilityIdentifier: "registration_verify_email_button",
                    action: viewModel.continueToNextStep
                )

                Text("By continuing, you agree to our Terms of Service and Privacy Policy.")
                    .font(.system(size: 12))
                    .foregroundStyle(AppTheme.textTertiary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)
            }
            .padding(.horizontal, 24)
            .padding(.top, 20)
            .padding(.bottom, 24)
        }
        .accessibilityIdentifier("registration_verify_view")
        .onAppear {
            isVerificationFieldFocused = true
        }
    }

    @ViewBuilder
    private var otpInputRow: some View {
        ZStack {
            HStack(spacing: 12) {
                ForEach(0..<6, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(Color(.systemGray6))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .stroke(otpBorderColor(for: index), lineWidth: 1.5)
                        )
                        .frame(height: 64)
                        .overlay {
                            Text(viewModel.verificationCodeDigits[index])
                                .font(.system(size: 24, weight: .bold))
                                .foregroundStyle(AppTheme.textPrimary)
                        }
                }
            }

            TextField("", text: Binding(
                get: { viewModel.verificationCode },
                set: { viewModel.setVerificationCode($0) }
            ))
            .keyboardType(.numberPad)
            .textContentType(.oneTimeCode)
            .focused($isVerificationFieldFocused)
            .opacity(0.01)
            .frame(width: 1, height: 1)
            .accessibilityIdentifier("registration_verify_code_input")
        }
        .contentShape(Rectangle())
        .onTapGesture {
            isVerificationFieldFocused = true
        }
    }

    private func otpBorderColor(for index: Int) -> Color {
        if index < viewModel.verificationCode.count {
            return AppTheme.accent
        }
        if index == viewModel.verificationCode.count && isVerificationFieldFocused {
            return AppTheme.accent.opacity(0.6)
        }
        return Color(.systemGray5)
    }

    @ViewBuilder
    private var resendCard: some View {
        if viewModel.canResendCode {
            Button {
                viewModel.resendVerificationCode()
            } label: {
                HStack(spacing: 10) {
                    if viewModel.isResendingCode {
                        ProgressView()
                            .tint(AppTheme.textSecondary)
                    } else {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    Text(viewModel.isResendingCode ? "Sending new code..." : "Resend code")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(AppTheme.textSecondary)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(Color(.systemGray6))
                .clipShape(Capsule())
            }
            .buttonStyle(.plain)
            .disabled(viewModel.isResendingCode)
            .accessibilityIdentifier("registration_resend_code_button")
        } else {
            HStack(spacing: 10) {
                Image(systemName: "clock.fill")
                    .font(.system(size: 15))
                    .foregroundStyle(AppTheme.textTertiary)
                Text("Resend code in \(viewModel.formattedResendCountdown)")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(AppTheme.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 54)
            .background(Color(.systemGray6))
            .clipShape(Capsule())
        }
    }

    // MARK: - Step 4: Success

    @ViewBuilder
    private var successStep: some View {
        VStack(spacing: 0) {
            Spacer()

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

            LText("Email Verified!")
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(AppTheme.textPrimary)
                .padding(.bottom, 8)

            LText("Your account is ready. Continue to explore jobs and complete your profile.")
                .font(.system(size: 14))
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 260)
                .padding(.bottom, 40)

            VStack(spacing: 12) {
                primaryButton(
                    title: "Go to Dashboard",
                    systemImage: nil,
                    isLoading: false,
                    isDisabled: false,
                    accessibilityIdentifier: "registration_go_to_dashboard_button",
                    action: viewModel.goToDashboard
                )

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
    private func secureInput(
        text: Binding<String>,
        isVisible: Bool,
        placeholder: String,
        systemImage: String,
        textContentType: UITextContentType,
        toggleAction: @escaping () -> Void,
        toggleAccessibilityIdentifier: String,
        accessibilityIdentifier: String
    ) -> some View {
        HStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.system(size: 16))
                .foregroundStyle(AppTheme.textTertiary)

            Group {
                if isVisible {
                    TextField(placeholder, text: text)
                        .accessibilityIdentifier(accessibilityIdentifier)
                } else {
                    SecureField(placeholder, text: text)
                        .accessibilityIdentifier(accessibilityIdentifier)
                }
            }
            .font(.system(size: 14))
            .foregroundStyle(AppTheme.textPrimary)
            .textContentType(textContentType)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()

            Button(action: toggleAction) {
                Image(systemName: isVisible ? "eye.fill" : "eye.slash.fill")
                    .font(.system(size: 16))
                    .foregroundStyle(AppTheme.textTertiary)
                    .contentTransition(.symbolEffect(.replace))
            }
            .accessibilityIdentifier(toggleAccessibilityIdentifier)
        }
    }

    @ViewBuilder
    private func primaryButton(
        title: String,
        systemImage: String?,
        isLoading: Bool,
        isDisabled: Bool,
        accessibilityIdentifier: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if isLoading {
                    ProgressView()
                        .tint(.white)
                } else {
                    LText(title)
                        .font(.system(size: 16, weight: .bold))
                    if let systemImage {
                        Image(systemName: systemImage)
                            .font(.system(size: 16, weight: .bold))
                    }
                }
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(isDisabled ? AppTheme.accent.opacity(0.55) : AppTheme.accent)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .shadow(color: AppTheme.accent.opacity(isDisabled ? 0.08 : 0.2), radius: 12, y: 6)
        }
        .buttonStyle(PressableButtonStyle())
        .disabled(isDisabled)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(title)
        .accessibilityIdentifier(accessibilityIdentifier)
    }

    @ViewBuilder
    private var statusMessageView: some View {
        VStack(spacing: 8) {
            if let message = viewModel.errorMessage, !message.isEmpty {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.circle.fill")
                        .font(.system(size: 14))
                    Text(message)
                        .font(.system(size: 13))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .foregroundStyle(.red)
                .transition(.opacity.combined(with: .move(edge: .top)))
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(message)
                .accessibilityIdentifier("registration_error_text")
            }

            if let message = viewModel.infoMessage, !message.isEmpty {
                HStack(spacing: 8) {
                    Image(systemName: "info.circle.fill")
                        .font(.system(size: 14))
                    Text(message)
                        .font(.system(size: 13))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .foregroundStyle(AppTheme.textSecondary)
                .transition(.opacity.combined(with: .move(edge: .top)))
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(message)
                .accessibilityIdentifier("registration_info_text")
            }
        }
    }
}
