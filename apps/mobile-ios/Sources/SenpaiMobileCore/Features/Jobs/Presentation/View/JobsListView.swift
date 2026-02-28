import SwiftUI

struct JobsListView: View {
    @ObservedObject private var viewModel: JobsListViewModel

    init(viewModel: JobsListViewModel) {
        self.viewModel = viewModel
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Tabs
                HStack(spacing: 0) {
                    tabButton("Browse Jobs", isSelected: viewModel.selectedTab == 0) {
                        withAnimation(AppTheme.animationDefault) {
                            viewModel.selectedTab = 0
                        }
                    }
                    tabButton("My Jobs", isSelected: viewModel.selectedTab == 1) {
                        withAnimation(AppTheme.animationDefault) {
                            viewModel.selectedTab = 1
                        }
                    }
                }
                .padding(.horizontal, AppTheme.spacingL)

                // Search bar
                SearchBar(text: $viewModel.searchText, placeholder: "Search jobs, companies...".localized())
                    .padding(.horizontal, AppTheme.spacingL)
                    .padding(.top, AppTheme.spacingM)

                // Category pills
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: AppTheme.spacingS) {
                        ForEach(viewModel.filterOptions, id: \.self) { filter in
                            CategoryPill(
                                title: filter.localized(),
                                isSelected: viewModel.selectedFilter.localized() == filter.localized()
                            ) {
                                withAnimation(AppTheme.animationDefault) {
                                    if let original = viewModel.filterOptions.first(where: { $0.localized() == filter.localized() }) {
                                        viewModel.selectedFilter = original
                                    } else {
                                        // Backup
                                        viewModel.selectedFilter = filter
                                    }
                                }
                            }
                        }
                    }
                    .padding(.horizontal, AppTheme.spacingL)
                }
                .padding(.top, AppTheme.spacingM)

                // Results header
                HStack {
                    LText(viewModel.selectedFilter == "All Jobs" ? "Available Jobs" : viewModel.selectedFilter)
                        .font(.headline.bold())
                        .foregroundStyle(AppTheme.textPrimary)
                        .contentTransition(.numericText())
                    Spacer()
                    Text(String(format: "%@ jobs".localized(), "\(viewModel.jobs.count)"))
                        .font(.caption)
                        .foregroundStyle(AppTheme.textTertiary)
                        .contentTransition(.numericText())
                }
                .padding(.horizontal, AppTheme.spacingL)
                .padding(.top, AppTheme.spacingL)
                .animation(AppTheme.animationDefault, value: viewModel.selectedFilter)

                // Job cards
                LazyVStack(spacing: AppTheme.spacingL) {
                    ForEach(Array(viewModel.jobs.enumerated()), id: \.element.id) { index, job in
                        JobCard(
                            job: job,
                            onTap: { viewModel.selectJob(job) },
                            onBookmark: {
                                Task { await viewModel.toggleSave(job) }
                            }
                        )
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .offset(y: 12)),
                            removal: .opacity
                        ))
                    }
                }
                .padding(.horizontal, AppTheme.spacingL)
                .padding(.top, AppTheme.spacingM)
                .animation(AppTheme.animationSoft, value: viewModel.selectedFilter)
                .animation(AppTheme.animationSoft, value: viewModel.searchText)
                .animation(AppTheme.animationSoft, value: viewModel.selectedTab)
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
