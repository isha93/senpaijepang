import SwiftUI

struct SearchBar: View {
    @Binding private var text: String
    private let placeholder: String

    init(text: Binding<String>, placeholder: String = "Search...") {
        self._text = text
        self.placeholder = placeholder
    }

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(AppTheme.accent)
                .font(.system(size: 16, weight: .medium))

            TextField(placeholder, text: $text)
                .font(.body)
                .foregroundStyle(AppTheme.textPrimary)

            if !text.isEmpty {
                Button {
                    withAnimation(AppTheme.animationSoft) {
                        text = ""
                    }
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(AppTheme.textTertiary)
                }
                .transition(.opacity.combined(with: .scale(scale: 0.8)))
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(AppTheme.grayLight)
        .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadiusMedium, style: .continuous))
    }
}
