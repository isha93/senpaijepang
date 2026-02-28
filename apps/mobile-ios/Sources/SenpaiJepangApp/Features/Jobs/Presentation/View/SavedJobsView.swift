import SwiftUI

struct SavedJobsView: View {
    @ObservedObject private var viewModel: SavedJobsViewModel

    init(viewModel: SavedJobsViewModel) {
        self.viewModel = viewModel
    }

    var body: some View {
        List {
            ForEach(viewModel.savedJobs) { job in
                Button {
                    viewModel.selectJob(job)
                } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(job.title)
                            .font(.headline)
                        Text(job.companyName)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                .buttonStyle(.plain)
            }
        }
        .navigationTitle("Saved Jobs")
        .overlay {
            if viewModel.isLoading {
                ProgressView()
            }
        }
        .task {
            await viewModel.loadSavedJobs()
        }
    }
}
