import SwiftUI

struct LoginView: View {
    @ObservedObject private var viewModel: LoginViewModel

    init(viewModel: LoginViewModel) {
        self.viewModel = viewModel
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Login")
                .font(.title.bold())

            TextField("Phone number", text: $viewModel.phoneNumber)
                .textFieldStyle(.plain)

            TextField("OTP", text: $viewModel.otp)
                .textFieldStyle(.plain)

            if let message = viewModel.errorMessage, !message.isEmpty {
                Text(message)
                    .foregroundStyle(.red)
                    .font(.footnote)
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }

            PrimaryButton(title: viewModel.isLoading ? "Loading..." : "Continue") {
                Task {
                    await viewModel.submitLogin()
                }
            }
            .disabled(viewModel.isLoading)
            .animation(AppTheme.animationDefault, value: viewModel.isLoading)
            .animation(AppTheme.animationSoft, value: viewModel.errorMessage)

            Spacer()
        }
        .padding(20)
    }
}
