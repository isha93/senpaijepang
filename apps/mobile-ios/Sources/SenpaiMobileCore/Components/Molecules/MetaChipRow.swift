import SwiftUI

public struct MetaChipRow: View {
    private let items: [String]

    public init(items: [String]) {
        self.items = items
    }

    public var body: some View {
        HStack(spacing: 8) {
            ForEach(items, id: \.self) { item in
                Text(item)
                    .font(.footnote.weight(.medium))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color(.secondarySystemFill))
                    .clipShape(Capsule())
            }
            Spacer(minLength: 0)
        }
    }
}
