import SwiftUI

struct ArticleDetailView: View {
    @StateObject private var viewModel: ArticleDetailViewModel
    @Environment(\.dismiss) private var dismiss

    init(viewModel: ArticleDetailViewModel) {
        self._viewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some View {
        ZStack(alignment: .top) {
            AppTheme.backgroundPrimary.ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    // Hero Section
                    heroSection
                    
                    // Main Article Content
                    articleContent
                        .background(AppTheme.backgroundPrimary)
                        .clipShape(RoundedCorner(radius: 32, corners: [.topLeft, .topRight]))
                        .offset(y: -40)
                        // Add some padding at the bottom so it scrolls fully
                        .padding(.bottom, 60)
                }
            }
            .ignoresSafeArea(edges: .top)
            
            // Top Navigation Bar
            topNavigationBar
        }
        .navigationBarHidden(true)
        .preferredColorScheme(.light) // Or respect system, but design wants clean look
    }

    private var heroSection: some View {
        GeometryReader { geo in
            let minY = geo.frame(in: .global).minY
            let isScrollingDown = minY < 0
            
            ZStack(alignment: .bottomLeading) {
                // Background Image
                if let imageUrl = viewModel.post.imageURL, !imageUrl.isEmpty {
                    AsyncImage(url: URL(string: imageUrl)) { phase in
                        switch phase {
                        case .empty:
                            Rectangle().fill(AppTheme.grayLight)
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        case .failure:
                            Rectangle().fill(AppTheme.grayLight)
                        @unknown default:
                            Rectangle().fill(AppTheme.grayLight)
                        }
                    }
                    .frame(width: geo.size.width, height: max(geo.size.height + (isScrollingDown ? 0 : minY), geo.size.height))
                    .offset(y: isScrollingDown ? minY : -minY)
                } else {
                    // Fallback to gradient if no image
                    LinearGradient(
                        colors: [AppTheme.accent, AppTheme.accentLight],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    .frame(width: geo.size.width, height: max(geo.size.height + (isScrollingDown ? 0 : minY), geo.size.height))
                    .offset(y: isScrollingDown ? minY : -minY)
                }
                
                // Overlay Gradient
                LinearGradient(
                    colors: [.clear, .black.opacity(0.6)],
                    startPoint: .center,
                    endPoint: .bottom
                )
                
                // Category Pill
                if let category = viewModel.post.category {
                    Text(category.uppercased())
                        .font(.caption.bold())
                        .padding(.horizontal, 16)
                        .padding(.vertical, 6)
                        .background(AppTheme.accent.opacity(0.8))
                        .foregroundColor(.white)
                        .clipShape(Capsule())
                        .padding(.leading, AppTheme.spacingL)
                        .padding(.bottom, 60) // Above the overlapping content
                }
            }
        }
        .frame(height: max(UIScreen.main.bounds.height * 0.4, 300))
    }

    private var topNavigationBar: some View {
        HStack {
            Button(action: {
                viewModel.goBack()
            }) {
                Image(systemName: "arrow.left")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(AppTheme.textPrimary)
                    .frame(width: 40, height: 40)
                    .background(Color.white.opacity(0.9))
                    .clipShape(Circle())
            }
            
            Spacer()
            
            HStack(spacing: AppTheme.spacingS) {
                Button(action: {
                    Task { await viewModel.toggleSave() }
                }) {
                    Image(systemName: viewModel.isSaved ? "bookmark.fill" : "bookmark")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(viewModel.isSaved ? AppTheme.accent : AppTheme.textPrimary)
                        .frame(width: 40, height: 40)
                        .background(Color.white.opacity(0.9))
                        .clipShape(Circle())
                }
                .disabled(viewModel.isSaving)
                
                Button(action: {
                    // Share action placeholder
                }) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(AppTheme.textPrimary)
                        .frame(width: 40, height: 40)
                        .background(Color.white.opacity(0.9))
                        .clipShape(Circle())
                }
            }
        }
        .padding(.horizontal, AppTheme.spacingL)
        // Add safe area top padding
        .padding(.top, UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow }?
            .safeAreaInsets.top ?? 44)
    }

    private var articleContent: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            VStack(alignment: .leading, spacing: AppTheme.spacingM) {
                Text(viewModel.post.title)
                    .font(.title.weight(.bold))
                    .foregroundColor(AppTheme.textPrimary)
                    .lineSpacing(4)
                
                HStack(spacing: AppTheme.spacingM) {
                    // Author Avatar
                    Circle()
                        .fill(AppTheme.grayLight)
                        .frame(width: 48, height: 48)
                        .overlay {
                            Text(String(viewModel.post.authorName.prefix(1)).uppercased())
                                .font(.headline.bold())
                                .foregroundColor(AppTheme.textSecondary)
                        }
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text(viewModel.post.authorName)
                            .font(.subheadline.bold())
                            .foregroundColor(AppTheme.textPrimary)
                        
                        HStack(spacing: 8) {
                            Text("12 Okt 2025") // Mocked date or use formatter
                                .font(.caption)
                                .foregroundColor(AppTheme.textTertiary)
                            
                            Circle()
                                .fill(AppTheme.textTertiary)
                                .frame(width: 4, height: 4)
                            
                            Text("3 min read") // Mocked read time
                                .font(.caption)
                                .foregroundColor(AppTheme.textTertiary)
                        }
                    }
                }
                .padding(.vertical, AppTheme.spacingM)
                .overlay(
                    Rectangle()
                        .frame(height: 1)
                        .foregroundColor(AppTheme.grayLight.opacity(0.5)),
                    alignment: .top
                )
                .overlay(
                    Rectangle()
                        .frame(height: 1)
                        .foregroundColor(AppTheme.grayLight.opacity(0.5)),
                    alignment: .bottom
                )
            }
            .padding(.horizontal, AppTheme.spacingL)
            .padding(.top, AppTheme.spacingXL)
            .padding(.bottom, AppTheme.spacingL)
            
            // Body Content (Mocked rich text based on HTML)
            VStack(alignment: .leading, spacing: AppTheme.spacingL) {
                Text(viewModel.post.content) // Could be extended to support real Markdown/HTML
                    .font(.system(size: 17))
                    .foregroundColor(AppTheme.textPrimary)
                    .lineSpacing(8)
                
                Text("Poin Utama Perubahan Regulasi")
                    .font(.title2.bold())
                    .foregroundColor(AppTheme.textPrimary)
                    .padding(.top, AppTheme.spacingM)
                
                Text("Beberapa sektor kini mendapatkan prioritas lebih tinggi dalam proses verifikasi dokumen. Berikut adalah beberapa persyaratan terbaru yang perlu Anda siapkan:")
                    .font(.system(size: 17))
                    .foregroundColor(AppTheme.textPrimary)
                    .lineSpacing(8)
                    
                VStack(alignment: .leading, spacing: AppTheme.spacingM) {
                    bulletPoint("Sertifikat JFT-Basic atau JLPT N4 masih menjadi syarat mutlak kemampuan bahasa.")
                    bulletPoint("Penambahan sektor baru dalam kategori SSW 1 untuk industri teknologi hijau.")
                    bulletPoint("Sistem pelaporan kesehatan digital yang terintegrasi dengan aplikasi imigrasi.")
                }
                
                // Blockquote
                HStack(spacing: 0) {
                    Rectangle()
                        .fill(AppTheme.accent)
                        .frame(width: 4)
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("\"Visi 2026 adalah menciptakan ekosistem kerja yang lebih inklusif bagi tenaga kerja global, di mana efisiensi birokrasi menjadi prioritas utama kami.\"")
                            .font(.system(size: 17, weight: .regular, design: .serif).italic())
                            .foregroundColor(AppTheme.textSecondary)
                            .lineSpacing(6)
                        
                        Text("— Kementrian Kehakiman Jepang")
                            .font(.caption.bold())
                            .foregroundColor(AppTheme.textPrimary)
                    }
                    .padding(.all, AppTheme.spacingL)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(AppTheme.accentLight.opacity(0.3))
                }
                .clipShape(RoundedCorner(radius: 12, corners: [.topRight, .bottomRight]))
                .padding(.vertical, AppTheme.spacingM)
                
                Text("Bagi para kandidat yang sedang dalam proses persiapan, sangat disarankan untuk segera memperbarui data paspor dan memastikan sertifikat keahlian bidang (Skill Test) masih dalam masa berlaku.")
                    .font(.system(size: 17))
                    .foregroundColor(AppTheme.textPrimary)
                    .lineSpacing(8)
            }
            .padding(.horizontal, AppTheme.spacingL)
            
            // Feedback UI
            VStack(spacing: AppTheme.spacingM) {
                Text("Apakah artikel ini membantu?")
                    .font(.headline.bold())
                    .foregroundColor(AppTheme.textPrimary)
                
                if viewModel.feedbackGiven {
                    Text("Terima kasih atas masukan Anda!")
                        .font(.subheadline)
                        .foregroundColor(AppTheme.accent)
                        .padding(.top, 4)
                } else {
                    HStack(spacing: AppTheme.spacingL) {
                        Button(action: {
                            viewModel.giveFeedback(isHelpful: true)
                        }) {
                            HStack {
                                Image(systemName: "hand.thumbsup")
                                Text("Ya")
                                    .fontWeight(.medium)
                            }
                            .padding(.horizontal, 24)
                            .padding(.vertical, 10)
                            .overlay(RoundedRectangle(cornerRadius: 30).stroke(AppTheme.grayLight, lineWidth: 1))
                            .foregroundColor(AppTheme.textPrimary)
                        }
                        
                        Button(action: {
                            viewModel.giveFeedback(isHelpful: false)
                        }) {
                            HStack {
                                Image(systemName: "hand.thumbsdown")
                                Text("Tidak")
                                    .fontWeight(.medium)
                            }
                            .padding(.horizontal, 24)
                            .padding(.vertical, 10)
                            .overlay(RoundedRectangle(cornerRadius: 30).stroke(AppTheme.grayLight, lineWidth: 1))
                            .foregroundColor(AppTheme.textPrimary)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, AppTheme.spacingXL)
            .background(AppTheme.grayLight.opacity(0.3))
            .cornerRadius(16)
            .padding(.horizontal, AppTheme.spacingL)
            .padding(.top, AppTheme.spacingXXL)
            
            // Related Articles
            VStack(alignment: .leading, spacing: AppTheme.spacingM) {
                HStack {
                    Text("Related Articles")
                        .font(.title3.bold())
                        .foregroundColor(AppTheme.textPrimary)
                    Spacer()
                    Button("View All") { }
                        .font(.subheadline.bold())
                        .foregroundColor(AppTheme.accent)
                }
                .padding(.horizontal, AppTheme.spacingL)
                
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: AppTheme.spacingL) {
                        // Mock Related Cards
                        relatedCard(
                            title: "Tips Bertahan di Musim Dingin Pertama Anda di Jepang",
                            category: "LIFESTYLE",
                            imageUrl: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800&q=80"
                        )
                        relatedCard(
                            title: "Panduan Lengkap Menggunakan JR Pass Tahun 2026",
                            category: "TRANSPORT",
                            imageUrl: "https://images.unsplash.com/photo-1555541604-585aefdcbdf7?w=800&q=80"
                        )
                    }
                    .padding(.horizontal, AppTheme.spacingL)
                    .padding(.bottom, AppTheme.spacingL) // shadow clip
                }
            }
            .padding(.top, AppTheme.spacingXXL)
        }
    }

    private func bulletPoint(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(AppTheme.accent)
                .padding(.top, 2)
            Text(text)
                .font(.system(size: 16))
                .foregroundColor(AppTheme.textPrimary)
                .lineSpacing(4)
        }
    }

    private func relatedCard(title: String, category: String, imageUrl: String) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            AsyncImage(url: URL(string: imageUrl)) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                default:
                    Rectangle().fill(AppTheme.grayLight)
                }
            }
            .frame(height: 140)
            .clipped()
            
            VStack(alignment: .leading, spacing: 8) {
                Text(category)
                    .font(.caption2.bold())
                    .foregroundColor(AppTheme.accent)
                
                Text(title)
                    .font(.subheadline.bold())
                    .foregroundColor(AppTheme.textPrimary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
            }
            .padding(AppTheme.spacingM)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppTheme.backgroundPrimary)
        }
        .frame(width: 260)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 4)
    }
}

// Minimal shape for rounding specific corners
struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(roundedRect: rect, byRoundingCorners: corners, cornerRadii: CGSize(width: radius, height: radius))
        return Path(path.cgPath)
    }
}
