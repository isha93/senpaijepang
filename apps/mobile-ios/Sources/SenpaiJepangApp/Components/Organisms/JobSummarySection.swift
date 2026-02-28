import SwiftUI

struct JobSummarySection: View {
    private let title: String
    private let companyName: String
    private let meta: [String]

    init(title: String, companyName: String, meta: [String]) {
        self.title = title
        self.companyName = companyName
        self.meta = meta
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.title2.bold())
            Text(companyName)
                .font(.headline)
                .foregroundStyle(.secondary)
            MetaChipRow(items: meta)
        }
    }
}
