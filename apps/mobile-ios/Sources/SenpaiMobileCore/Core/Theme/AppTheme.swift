import SwiftUI

public enum AppTheme {
    // MARK: - Colors
    public static let accent = Color(red: 0.20, green: 0.78, blue: 0.35)       // #34C759
    public static let accentLight = Color(red: 0.20, green: 0.78, blue: 0.35).opacity(0.12)
    public static let accentDark = Color(red: 0.15, green: 0.60, blue: 0.28)
    public static let backgroundPrimary = Color(red: 0.97, green: 0.98, blue: 0.97) // light mint
    public static let backgroundCard = Color.white
    public static let textPrimary = Color(red: 0.12, green: 0.14, blue: 0.17)
    public static let textSecondary = Color(red: 0.44, green: 0.47, blue: 0.50)
    public static let textTertiary = Color(red: 0.65, green: 0.67, blue: 0.70)
    public static let border = Color(red: 0.91, green: 0.92, blue: 0.93)
    public static let destructive = Color.red
    public static let warning = Color.orange
    public static let pending = Color.orange
    public static let grayLight = Color(red: 0.94, green: 0.94, blue: 0.96)   // ~systemGray6
    public static let grayMedium = Color(red: 0.90, green: 0.90, blue: 0.92)  // ~systemGray5

    // MARK: - Corner Radius
    public static let cornerRadiusSmall: CGFloat = 8
    public static let cornerRadiusMedium: CGFloat = 12
    public static let cornerRadiusLarge: CGFloat = 16
    public static let cornerRadiusXL: CGFloat = 20

    // MARK: - Spacing
    public static let spacingXS: CGFloat = 4
    public static let spacingS: CGFloat = 8
    public static let spacingM: CGFloat = 12
    public static let spacingL: CGFloat = 16
    public static let spacingXL: CGFloat = 20
    public static let spacingXXL: CGFloat = 24

    // MARK: - Card Style
    public static func cardBackground() -> some ViewModifier {
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

public extension View {
    func cardStyle() -> some View {
        modifier(CardBackgroundModifier())
    }
}
