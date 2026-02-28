import SwiftUI

public struct JobsListView: View {
    @ObservedObject private var viewModel: JobsListViewModel

    public init(viewModel: JobsListViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Tabs
                HStack(spacing: 0) {
                    tabButton("Browse Jobs", isSelected: viewModel.selectedTab == 0) {
                        viewModel.selectedTab = 0
                    }
                    tabButton("My Jobs", isSelected: viewModel.selectedTab == 1) {
                        viewModel.selectedTab = 1
                    }
                }
                .padding(.horizontal, AppTheme.spacingL)

                // Search bar
                SearchBar(text: $viewModel.searchText, placeholder: "Search for jobs in Japan...")
                    .padding(.horizontal, AppTheme.spacingL)
                    .padding(.top, AppTheme.spacingL)

                // Filter pills
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: AppTheme.spacingS) {
                        ForEach(viewModel.filterOptions, id: \.self) { filter in
                            CategoryPill(
                                title: filter,
                                isSelected: viewModel.selectedFilter == filter
                            ) {
                                viewModel.selectedFilter = filter
                            }
                        }
                    }
                    .padding(.horizontal, AppTheme.spacingL)
                }
                .padding(.top, AppTheme.spacingM)

                // Job cards
                LazyVStack(spacing: AppTheme.spacingL) {
                    ForEach(viewModel.jobs) { job in
                        JobCard(
                            job: job,
                            onTap: { viewModel.selectJob(job) },
                            onBookmark: {
                                Task { await viewModel.toggleSave(job) }
                            }
                        )
                    }
                }
                .padding(.horizontal, AppTheme.spacingL)
                .padding(.top, AppTheme.spacingL)
            }
            .padding(.bottom, AppTheme.spacingXXL)
        }
        .background(AppTheme.backgroundPrimary)
        .navigationTitle("Jobs")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button { } label: {
                    Image(systemName: "line.3.horizontal")
                        .foregroundStyle(AppTheme.textPrimary)
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button { } label: {
                    Image(systemName: "slider.horizontal.3")
                        .foregroundStyle(AppTheme.accent)
                }
            }
        }
        .overlay {
            if viewModel.isLoading {
                ProgressView()
            }
        }
        .task {
            await viewModel.loadJobs()
        }
    }

    @ViewBuilder
    private func tabButton(_ title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Text(title)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(isSelected ? AppTheme.textPrimary : AppTheme.textTertiary)
                Rectangle()
                    .fill(isSelected ? AppTheme.accent : Color.clear)
                    .frame(height: 3)
                    .clipShape(RoundedRectangle(cornerRadius: 2))
            }
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity)
    }
}
