import SwiftUI

enum AppTheme {
    // MARK: - Colors
    static let accent = Color(red: 0.20, green: 0.78, blue: 0.35)       // #34C759
    static let accentLight = Color(red: 0.20, green: 0.78, blue: 0.35).opacity(0.12)
    static let accentDark = Color(red: 0.15, green: 0.60, blue: 0.28)
    static let backgroundPrimary = Color(red: 0.97, green: 0.98, blue: 0.97) // light mint
    static let backgroundCard = Color.white
    static let textPrimary = Color(red: 0.12, green: 0.14, blue: 0.17)
    static let textSecondary = Color(red: 0.44, green: 0.47, blue: 0.50)
    static let textTertiary = Color(red: 0.65, green: 0.67, blue: 0.70)
    static let border = Color(red: 0.91, green: 0.92, blue: 0.93)
    static let destructive = Color.red
    static let warning = Color.orange
    static let pending = Color.orange
    static let grayLight = Color(red: 0.94, green: 0.94, blue: 0.96)   // ~systemGray6
    static let grayMedium = Color(red: 0.90, green: 0.90, blue: 0.92)  // ~systemGray5

    // MARK: - Corner Radius
    static let cornerRadiusSmall: CGFloat = 8
    static let cornerRadiusMedium: CGFloat = 12
    static let cornerRadiusLarge: CGFloat = 16
    static let cornerRadiusXL: CGFloat = 20

    // MARK: - Spacing
    static let spacingXS: CGFloat = 4
    static let spacingS: CGFloat = 8
    static let spacingM: CGFloat = 12
    static let spacingL: CGFloat = 16
    static let spacingXL: CGFloat = 20
    static let spacingXXL: CGFloat = 24

    // MARK: - Card Style
    static func cardBackground() -> some ViewModifier {
        CardBackgroundModifier()
    }
}

struct CardBackgroundModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(AppTheme.backgroundCard)
            .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadiusLarge, style: .continuous))
            .shadow(color: .black.opacity(0.04), radius: 8, x: 0, y: 2)
    }
}

extension View {
    func cardStyle() -> some View {
        modifier(CardBackgroundModifier())
    }
}
