import SwiftUI

struct LoginView: View {
    @ObservedObject private var viewModel: LoginViewModel
    @ObservedObject private var langManager = LanguageManager.shared

    init(viewModel: LoginViewModel) {
        self.viewModel = viewModel
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            ZStack {
                HStack {
                    Button { } label: {
                        Image(systemName: "arrow.left")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(AppTheme.textPrimary)
                            .frame(width: 40, height: 40)
                    }
                    Spacer()
                }
                LText("Log In")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(AppTheme.textPrimary)
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 16)

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {

                    // Welcome text
                    VStack(alignment: .leading, spacing: 8) {
                        LText("Welcome Back")
                            .font(.system(size: 32, weight: .bold))
                            .foregroundStyle(AppTheme.textPrimary)

                        LText("Log in to your Senpai Jepang account to find your dream job.")
                            .font(.system(size: 16))
                            .foregroundStyle(AppTheme.textSecondary)
                            .lineSpacing(4)
                    }
                    .padding(.bottom, 32)

                    // Email field
                    VStack(alignment: .leading, spacing: 8) {
                        LText("EMAIL ADDRESS")
                            .font(.system(size: 11, weight: .bold))
                            .tracking(1.2)
                            .foregroundStyle(AppTheme.textPrimary)
                            .padding(.leading, 4)

                        HStack(spacing: 12) {
                            TextField("email@example.com", text: $viewModel.email)
                                .font(.system(size: 16))
                                .foregroundStyle(AppTheme.textPrimary)
                                .keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()

                            Image(systemName: "envelope.fill")
                                .font(.system(size: 16))
                                .foregroundStyle(AppTheme.textTertiary)
                        }
                        .padding(.horizontal, 16)
                        .frame(height: 56)
                        .background(Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .padding(.bottom, 20)

                    // Password field
                    VStack(alignment: .leading, spacing: 8) {
                        LText("PASSWORD")
                            .font(.system(size: 11, weight: .bold))
                            .tracking(1.2)
                            .foregroundStyle(AppTheme.textPrimary)
                            .padding(.leading, 4)

                        HStack(spacing: 12) {
                            Image(systemName: "lock.fill")
                                .font(.system(size: 16))
                                .foregroundStyle(AppTheme.textTertiary)

                            Group {
                                if viewModel.isPasswordVisible {
                                    TextField("Your password", text: $viewModel.password)
                                } else {
                                    SecureField("Your password", text: $viewModel.password)
                                }
                            }
                            .font(.system(size: 16))
                            .foregroundStyle(AppTheme.textPrimary)

                            Button {
                                viewModel.togglePasswordVisibility()
                            } label: {
                                Image(systemName: viewModel.isPasswordVisible ? "eye.fill" : "eye.slash.fill")
                                    .font(.system(size: 16))
                                    .foregroundStyle(AppTheme.textTertiary)
                                    .contentTransition(.symbolEffect(.replace))
                            }
                        }
                        .padding(.horizontal, 16)
                        .frame(height: 56)
                        .background(Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                        HStack {
                            Spacer()
                            Button { } label: {
                                LText("Forgot Password?")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                        }
                        .padding(.top, 4)
                    }
                    .padding(.bottom, 8)

                    // Error message
                    if let message = viewModel.errorMessage, !message.isEmpty {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.circle.fill")
                                .font(.system(size: 14))
                            Text(message)
                                .font(.system(size: 14))
                        }
                        .foregroundStyle(.red)
                        .padding(.vertical, 8)
                        .transition(.opacity.combined(with: .move(edge: .top)))
                    }

                    // Log In Button
                    Button {
                        Task { await viewModel.submitLogin() }
                    } label: {
                        HStack(spacing: 8) {
                            if viewModel.isLoading {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                LText("Log In")
                                    .font(.system(size: 16, weight: .bold))
                                Image(systemName: "arrow.right")
                                    .font(.system(size: 16, weight: .bold))
                            }
                        }
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background(AppTheme.accent)
                        .clipShape(Capsule())
                        .shadow(color: AppTheme.accent.opacity(0.3), radius: 12, y: 6)
                    }
                    .buttonStyle(PressableButtonStyle())
                    .disabled(viewModel.isLoading)
                    .padding(.top, 16)
                    .animation(AppTheme.animationDefault, value: viewModel.isLoading)
                    .animation(AppTheme.animationSoft, value: viewModel.errorMessage)

                    // OR divider
                    HStack(spacing: 16) {
                        Rectangle()
                            .fill(AppTheme.textTertiary.opacity(0.3))
                            .frame(height: 1)
                        Text("OR")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(AppTheme.textTertiary)
                            .textCase(.uppercase)
                        Rectangle()
                            .fill(AppTheme.textTertiary.opacity(0.3))
                            .frame(height: 1)
                    }
                    .padding(.vertical, 24)

                    // Social login buttons
                    VStack(spacing: 12) {
                        socialButton(icon: "g.circle.fill", label: "Continue with Google")
                        socialButton(icon: "apple.logo", label: "Continue with Apple")
                    }

                    // Sign up link
                    Spacer(minLength: 32)
                    HStack(spacing: 6) {
                        Spacer()
                        LText("Don't have an account?")
                            .font(.system(size: 16))
                            .foregroundStyle(AppTheme.textSecondary)
                        Button { viewModel.navigateToRegistration() } label: {
                            LText("Sign up")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundStyle(AppTheme.accent)
                        }
                        Spacer()
                    }
                    .padding(.top, 16)
                    .padding(.bottom, 24)
                }
                .padding(.horizontal, 24)
            }
        }
        .background(AppTheme.backgroundPrimary)
        .navigationBarBackButtonHidden(true)
    }

    @ViewBuilder
    private func socialButton(icon: String, label: String) -> some View {
        Button { } label: {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundStyle(AppTheme.textPrimary)
                LText(label)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(AppTheme.textPrimary.opacity(0.8))
            }
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(AppTheme.backgroundPrimary)
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(AppTheme.textTertiary.opacity(0.3), lineWidth: 1)
            )
        }
        .buttonStyle(PressableButtonStyle())
    }
}
