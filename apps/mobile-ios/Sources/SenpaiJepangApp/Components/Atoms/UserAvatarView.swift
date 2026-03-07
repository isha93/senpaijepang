import SwiftUI

struct UserAvatarView: View {
    let fullName: String
    let avatarURL: String?
    let size: CGFloat
    let backgroundColor: Color
    let foregroundColor: Color
    let font: Font

    init(
        fullName: String,
        avatarURL: String?,
        size: CGFloat,
        backgroundColor: Color = AppTheme.accentLight,
        foregroundColor: Color = AppTheme.accent,
        font: Font
    ) {
        self.fullName = fullName
        self.avatarURL = avatarURL
        self.size = size
        self.backgroundColor = backgroundColor
        self.foregroundColor = foregroundColor
        self.font = font
    }

    var body: some View {
        Group {
            if let avatarURL, let url = URL(string: avatarURL), !avatarURL.isEmpty {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    default:
                        fallbackAvatar
                    }
                }
            } else {
                fallbackAvatar
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
    }

    private var fallbackAvatar: some View {
        Circle()
            .fill(backgroundColor)
            .overlay {
                Text(displayInitial)
                    .font(font)
                    .foregroundStyle(foregroundColor)
            }
    }

    private var displayInitial: String {
        let trimmed = fullName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let first = trimmed.first else { return "S" }
        return String(first).uppercased()
    }
}
