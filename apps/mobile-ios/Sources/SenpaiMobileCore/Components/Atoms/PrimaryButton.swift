import SwiftUI

struct PrimaryButton: View {
    private let title: String
    private let isLoading: Bool
    private let isDisabled: Bool
    private let trailingSystemImage: String?
    private let action: () -> Void

    init(
        title: String,
        isLoading: Bool = false,
        isDisabled: Bool = false,
        trailingSystemImage: String? = nil,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.isLoading = isLoading
        self.isDisabled = isDisabled
        self.trailingSystemImage = trailingSystemImage
        self.action = action
    }

    private var isInteractionDisabled: Bool {
        isLoading || isDisabled
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: AppTheme.spacingS) {
                if isLoading {
                    ProgressView()
                        .tint(.white)
                } else {
                    Text(title)
                        .font(.headline)
                    if let trailingSystemImage, !trailingSystemImage.isEmpty {
                        Image(systemName: trailingSystemImage)
                            .font(.system(size: 16, weight: .bold))
                    }
                }
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(AppTheme.accent)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .opacity(isInteractionDisabled ? 0.78 : 1.0)
        }
        .buttonStyle(PressableButtonStyle())
        .disabled(isInteractionDisabled)
        .animation(AppTheme.animationDefault, value: isLoading)
    }
}
