import SwiftUI

struct FeedListView: View {
    @ObservedObject private var viewModel: FeedListViewModel
    @ObservedObject private var langManager = LanguageManager.shared
    private let onNavigateToProfile: () -> Void

    init(viewModel: FeedListViewModel, onNavigateToProfile: @escaping () -> Void = {}) {
        self.viewModel = viewModel
        self.onNavigateToProfile = onNavigateToProfile
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Search bar
                SearchBar(text: $viewModel.searchText, placeholder: "Search news, visa info...".localized())
                    .padding(.horizontal, AppTheme.spacingL)
                    .padding(.top, AppTheme.spacingM)

                // Gamification Banner
                if viewModel.profileCompletion < 100 {
                    gamificationBanner
                        .padding(.horizontal, AppTheme.spacingL)
                        .padding(.top, AppTheme.spacingM)
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .scale(scale: 0.95)),
                            removal: .opacity.combined(with: .scale(scale: 0.95))
                        ))
                }

                // Category pills
                CategoryFilterRow(
                    categories: viewModel.categories.map { $0.localized() },
                    selected: Binding(
                        get: { viewModel.selectedCategory.localized() },
                        set: { localizedSelection in
                            if let original = viewModel.categories.first(where: { $0.localized() == localizedSelection }) {
                                viewModel.selectedCategory = original
                            } else {
                                viewModel.selectedCategory = localizedSelection
                            }
                        }
                    )
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
                    LText(viewModel.selectedCategory == "All" ? "Updates for Japan" : viewModel.selectedCategory)
                        .font(.headline.bold())
                        .foregroundStyle(AppTheme.textPrimary)
                        .contentTransition(.numericText())
                    Spacer()
                    Text(String(format: "%@ articles".localized(), "\(viewModel.posts.count)"))
                        .font(.caption)
                        .foregroundStyle(AppTheme.textTertiary)
                        .contentTransition(.numericText())
                }
                .padding(.horizontal, AppTheme.spacingL)
                .padding(.top, AppTheme.spacingL)
                .padding(.bottom, AppTheme.spacingS)
                .animation(AppTheme.animationDefault, value: viewModel.selectedCategory)

                // Feed cards
                LazyVStack(spacing: AppTheme.spacingL) {
                    ForEach(Array(viewModel.posts.enumerated()), id: \.element.id) { index, post in
                        FeedPostCard(post: post) {
                            Task { await viewModel.toggleSave(post) }
                        }
                        .cardStyle()
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .offset(y: 12)),
                            removal: .opacity
                        ))
                    }
                }
                .padding(.horizontal, AppTheme.spacingL)
                .padding(.top, AppTheme.spacingS)
                .padding(.bottom, AppTheme.spacingXXL)
                .animation(AppTheme.animationSoft, value: viewModel.selectedCategory)
                .animation(AppTheme.animationSoft, value: viewModel.searchText)
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
                LText("Trending")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(AppTheme.accent.opacity(0.9))
                    .clipShape(RoundedRectangle(cornerRadius: 4))

                Text("Spring 2026: New SSW Visa quotas announced for Hospitality sector") // Usually from API
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.white)
                    .lineLimit(3)
            }
            .padding(AppTheme.spacingL)
        }
        .staggeredAppear()
    }

    @ViewBuilder
    private var gamificationBanner: some View {
        Button {
            withAnimation(AppTheme.animationDefault) {
                onNavigateToProfile()
            }
        } label: {
            VStack(alignment: .leading, spacing: AppTheme.spacingM) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        LText("Complete your profile")
                            .font(.subheadline.bold())
                            .foregroundStyle(AppTheme.textPrimary)
                        LText("Get verified to apply for high-salary jobs")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    Spacer()
                    Image(systemName: "chevron.right.circle.fill")
                        .font(.title3)
                        .foregroundStyle(AppTheme.accent)
                }

                // Progress Bar
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.white.opacity(0.5))
                            .frame(height: 6)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(AppTheme.accent)
                            .frame(width: geo.size.width * CGFloat(viewModel.profileCompletion) / 100, height: 6)
                    }
                }
                .frame(height: 6)

                Text(String(format: "%@%% Completed".localized(), "\(viewModel.profileCompletion)"))
                    .font(.caption2.bold())
                    .foregroundStyle(AppTheme.accent)
            }
            .padding(AppTheme.spacingL)
            .background(AppTheme.accentLight)
            .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadiusLarge, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: AppTheme.cornerRadiusLarge, style: .continuous)
                    .stroke(AppTheme.accent.opacity(0.2), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}
