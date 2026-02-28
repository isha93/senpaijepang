import SwiftUI

public struct CategoryFilterRow: View {
    private let categories: [String]
    @Binding private var selected: String

    public init(categories: [String], selected: Binding<String>) {
        self.categories = categories
        self._selected = selected
    }

    public var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(categories, id: \.self) { category in
                    CategoryPill(
                        title: category,
                        isSelected: selected == category
                    ) {
                        selected = category
                    }
                }
            }
            .padding(.horizontal, AppTheme.spacingL)
        }
    }
}
