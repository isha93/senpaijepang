import SwiftUI

public struct FeedListView: View {
    @ObservedObject private var viewModel: FeedListViewModel

    public init(viewModel: FeedListViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Search bar
                SearchBar(text: $viewModel.searchText, placeholder: "Search news, visa info...")
                    .padding(.horizontal, AppTheme.spacingL)
                    .padding(.top, AppTheme.spacingM)

                // Category pills
                CategoryFilterRow(
                    categories: viewModel.categories,
                    selected: $viewModel.selectedCategory
                )
                .padding(.top, AppTheme.spacingM)

                // Trending banner
                trendingBanner
                    .padding(.horizontal, AppTheme.spacingL)
                    .padding(.top, AppTheme.spacingL)

                // Section header
                HStack(spacing: AppTheme.spacingS) {
                    Image(systemName: "newspaper.fill")
                        .foregroundStyle(AppTheme.accent)
                    Text("Updates for Japan")
                        .font(.headline.bold())
                        .foregroundStyle(AppTheme.textPrimary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, AppTheme.spacingL)
                .padding(.top, AppTheme.spacingL)
                .padding(.bottom, AppTheme.spacingS)

                // Feed cards
                LazyVStack(spacing: AppTheme.spacingL) {
                    ForEach(viewModel.posts) { post in
                        FeedPostCard(post: post) {
                            Task { await viewModel.toggleSave(post) }
                        }
                        .cardStyle()
                    }
                }
                .padding(.horizontal, AppTheme.spacingL)
                .padding(.top, AppTheme.spacingS)
                .padding(.bottom, AppTheme.spacingXXL)
            }
        }
        .background(AppTheme.backgroundPrimary)
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Text("Senpai Jepang")
                    .font(.title3.bold())
                    .foregroundStyle(AppTheme.textPrimary)
            }
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: 8) {
                    Button { } label: {
                        Image(systemName: "bell")
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    Circle()
                        .fill(AppTheme.accentLight)
                        .frame(width: 32, height: 32)
                        .overlay {
                            Text("B")
                                .font(.caption.bold())
                                .foregroundStyle(AppTheme.accent)
                        }
                }
            }
        }
        .overlay {
            if viewModel.isLoading { ProgressView() }
        }
        .task {
            await viewModel.loadFeed()
        }
    }

    @ViewBuilder
    private var trendingBanner: some View {
        ZStack(alignment: .bottomLeading) {
            RoundedRectangle(cornerRadius: AppTheme.cornerRadiusLarge, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [Color.pink.opacity(0.3), Color.purple.opacity(0.2)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(height: 192)

            // Gradient overlay
            LinearGradient(
                colors: [.clear, .black.opacity(0.7)],
                startPoint: .top,
                endPoint: .bottom
            )
            .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadiusLarge, style: .continuous))

            VStack(alignment: .leading, spacing: 8) {
                Text("Trending")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(AppTheme.accent.opacity(0.9))
                    .clipShape(RoundedRectangle(cornerRadius: 4))

                Text("Spring 2024: New SSW Visa quotas announced for Hospitality sector")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.white)
                    .lineLimit(3)
            }
            .padding(AppTheme.spacingL)
        }
    }
}
