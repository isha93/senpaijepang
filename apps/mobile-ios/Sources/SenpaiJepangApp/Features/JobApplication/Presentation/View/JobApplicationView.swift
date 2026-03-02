import SwiftUI

struct JobApplicationView: View {
    @StateObject private var viewModel: JobApplicationViewModel
    
    // For bouncing success animation
    @State private var successScale: CGFloat = 0.5
    @State private var successOpacity: Double = 0
    
    init(viewModel: JobApplicationViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }
    
    var body: some View {
        VStack(spacing: 0) {
            if !viewModel.submissionSuccess {
                headerView
                stepIndicator
            }
            
            ZStack {
                if viewModel.submissionSuccess {
                    successView
                        .transition(.scale.combined(with: .opacity))
                } else {
                    TabView(selection: $viewModel.currentStep) {
                        step1Review.tag(0)
                        step2Message.tag(1)
                        step3Confirm.tag(2)
                    }
                    .tabViewStyle(.page(indexDisplayMode: .never))
                    #if os(iOS)
                    .animation(AppTheme.animationDefault, value: viewModel.currentStep)
                    #endif
                }
            }
            
            if !viewModel.submissionSuccess {
                bottomAction
            }
        }
        .background(AppTheme.backgroundPrimary)
        .onAppear {
            // Trigger haptic feedback for initial load
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
        }
        .onChange(of: viewModel.currentStep) { _, _ in
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
        }
        .onChange(of: viewModel.submissionSuccess) { _, isSuccess in
            if isSuccess {
                let generator = UINotificationFeedbackGenerator()
                generator.notificationOccurred(.success)
                withAnimation(.spring(response: 0.5, dampingFraction: 0.6)) {
                    successScale = 1.0
                    successOpacity = 1.0
                }
            }
        }
    }
    
    // MARK: - Header
    private var headerView: some View {
        HStack {
            Button(action: {
                viewModel.previousStep()
            }) {
                Image(systemName: "arrow.left")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(AppTheme.textPrimary)
                    .frame(width: 40, height: 40)
                    .background(Circle().fill(AppTheme.grayLight).opacity(0.5))
            }
            
            Spacer()
            
            Text(viewModel.currentStep == 0 ? "Melamar Pekerjaan" : "Lamar Pekerjaan (\(viewModel.currentStep + 1)/3)")
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(AppTheme.textPrimary)
            
            Spacer()
            
            Color.clear.frame(width: 40, height: 40) // Balance
        }
        .padding(.horizontal, 20)
        .padding(.top, 16)
        .padding(.bottom, 8)
    }
    
    private var stepIndicator: some View {
        HStack(spacing: 8) {
            ForEach(0..<viewModel.totalSteps, id: \.self) { index in
                Capsule()
                    .fill(index <= viewModel.currentStep ? AppTheme.accent : AppTheme.accent.opacity(0.2))
                    .frame(width: index == viewModel.currentStep ? 32 : 8, height: 8)
                    .animation(AppTheme.animationDefault, value: viewModel.currentStep)
            }
        }
        .padding(.vertical, 16)
    }
    
    // MARK: - Step 1: Review Profil & CV
    private var step1Review: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Compact Job Card
                HStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Lowongan Kerja".uppercased())
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(AppTheme.textSecondary)
                        Text(viewModel.job.title)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(AppTheme.textPrimary)
                        Text(viewModel.job.companyName)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(AppTheme.accent)
                    }
                    
                    Spacer()
                    
                    ZStack(alignment: .bottomTrailing) {
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(Color.white)
                            .frame(width: 56, height: 56)
                            .shadow(color: .black.opacity(0.06), radius: 8, x: 0, y: 2)
                            .overlay {
                                Text(viewModel.job.companyLogoInitial ?? String(viewModel.job.companyName.prefix(1)))
                                    .font(.title2.bold())
                                    .foregroundStyle(AppTheme.accent)
                            }
                        
                        if viewModel.job.isVerifiedEmployer {
                            Circle()
                                .fill(AppTheme.accent)
                                .frame(width: 16, height: 16)
                                .overlay {
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 8, weight: .bold))
                                        .foregroundStyle(.white)
                                }
                                .offset(x: 2, y: 2)
                        }
                    }
                }
                .padding(16)
                .background(AppTheme.grayLight)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(.systemGray5), lineWidth: 1))
                
                // Profile Section
                VStack(alignment: .leading, spacing: 16) {
                    Text("Data Profil Anda")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    HStack(spacing: 16) {
                        // Mock Avatar
                        Circle()
                            .fill(Color(.systemGray5))
                            .frame(width: 56, height: 56)
                            .overlay(Image(systemName: "person.fill").foregroundStyle(.gray))
                            .overlay(Circle().stroke(AppTheme.accent.opacity(0.2), lineWidth: 2))
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Budi Setiawan") // Mock user name
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(AppTheme.textPrimary)
                            Text("Jakarta, Indonesia")
                                .font(.system(size: 14))
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        
                        Spacer()
                        
                        Button { } label: {
                            Image(systemName: "square.and.pencil")
                                .font(.system(size: 20))
                                .foregroundStyle(AppTheme.accent)
                                .padding(8)
                        }
                    }
                    .padding(16)
                    .background(AppTheme.backgroundPrimary)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .shadow(color: AppTheme.textTertiary.opacity(0.05), radius: 8, y: 4)
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(.systemGray5), lineWidth: 1))
                }
                
                // CV Section
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Text("Dokumen CV")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(AppTheme.textPrimary)
                        Spacer()
                        Button("Ganti CV") { }
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(AppTheme.accent)
                    }
                    
                    HStack(spacing: 16) {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.red.opacity(0.1))
                            .frame(width: 48, height: 48)
                            .overlay(Image(systemName: "doc.text.fill").foregroundStyle(.red).font(.system(size: 24)))
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("CV_Budi_Setiawan_2024.pdf")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(AppTheme.textPrimary)
                                .lineLimit(1)
                            Text("2.4 MB • Terakhir diperbarui 2 hari yang lalu")
                                .font(.system(size: 12))
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        
                        Spacer()
                        
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(Color(.systemGray3))
                    }
                    .padding(16)
                    .background(AppTheme.backgroundPrimary)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(.systemGray4), style: StrokeStyle(lineWidth: 2, dash: [6])))
                }
            }
            .padding(24)
        }
    }
    
    // MARK: - Step 2: Pesan / Cover Letter
    private var step2Message: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Pesan untuk Perusahaan")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(AppTheme.textPrimary)
                
                Text("Beritahu perusahaan mengapa Anda adalah kandidat yang tepat untuk posisi ini.")
                    .font(.system(size: 14))
                    .foregroundStyle(AppTheme.textSecondary)
                
                ZStack(alignment: .bottomTrailing) {
                    TextEditor(text: $viewModel.coverLetterText)
                        .font(.system(size: 16))
                        .foregroundStyle(AppTheme.textPrimary)
                        .padding(12)
                        .frame(minHeight: 240)
                        .background(AppTheme.grayLight)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(.systemGray5), lineWidth: 1))
                        .onChange(of: viewModel.coverLetterText) { newValue, _ in
                            if newValue.count > 500 {
                                viewModel.coverLetterText = String(newValue.prefix(500))
                            }
                        }
                    
                    Text("(\(viewModel.coverLetterText.count)/500)")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(AppTheme.textSecondary)
                        .padding(8)
                        .background(AppTheme.backgroundPrimary.opacity(0.8))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .padding(12)
                }
                
                // Tips Box
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "lightbulb.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(AppTheme.accent)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Tips")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(AppTheme.textPrimary)
                        Text("Sebutkan pengalaman relevan atau sertifikasi bahasa Jepang yang Anda miliki untuk menarik perhatian perekrut.")
                            .font(.system(size: 12))
                            .foregroundStyle(AppTheme.textSecondary)
                            .lineSpacing(2)
                    }
                }
                .padding(16)
                .background(AppTheme.accent.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(AppTheme.accent.opacity(0.1), lineWidth: 1))
            }
            .padding(24)
        }
    }
    
    // MARK: - Step 3: Confirmation
    private var step3Confirm: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Konfirmasi Lamaran")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundStyle(AppTheme.textPrimary)
                    
                    Text("Silakan periksa kembali data Anda sebelum mengirim lamaran ini ke perusahaan.")
                        .font(.system(size: 14))
                        .foregroundStyle(AppTheme.textSecondary)
                        .lineSpacing(2)
                }
                
                VStack(spacing: 16) {
                    confirmRow(icon: "person.fill", title: "Profil Lengkap", subtitle: "Data diri & Pengalaman Kerja", color: AppTheme.accent)
                    confirmRow(icon: "doc.text.fill", title: "Curriculum Vitae (CV)", subtitle: "CV_Budi_Setiawan_2024.pdf", color: AppTheme.accent)
                    if !viewModel.coverLetterText.isEmpty {
                        confirmRow(icon: "text.bubble.fill", title: "Pesan Tambahan", subtitle: "\"\(viewModel.coverLetterText)\"", color: AppTheme.accent)
                    }
                }
            }
            .padding(24)
        }
    }
    
    private func confirmRow(icon: String, title: String, subtitle: String, color: Color) -> some View {
        HStack(spacing: 16) {
            RoundedRectangle(cornerRadius: 12)
                .fill(color.opacity(0.1))
                .frame(width: 48, height: 48)
                .overlay(Image(systemName: icon).foregroundStyle(color))
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(AppTheme.textPrimary)
                Text(subtitle)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(color)
                    .lineLimit(1)
            }
            
            Spacer()
            
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(color)
        }
        .padding(16)
        .background(AppTheme.grayLight.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(.systemGray5), lineWidth: 1))
    }
    
    // MARK: - Bottom Action Container
    private var bottomAction: some View {
        VStack(spacing: 16) {
            Button {
                if viewModel.currentStep == viewModel.totalSteps - 1 {
                    viewModel.submitApplication()
                } else {
                    viewModel.nextStep()
                }
            } label: {
                HStack {
                    if viewModel.isSubmitting {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text(viewModel.currentStep == viewModel.totalSteps - 1 ? "Kirim Lamaran Sekarang" : (viewModel.currentStep == 0 ? "Lanjutkan" : "Review Lamaran"))
                            .font(.system(size: 16, weight: .bold))
                        if viewModel.currentStep < viewModel.totalSteps - 1 {
                            Image(systemName: "arrow.right")
                                .font(.system(size: 16, weight: .bold))
                        }
                    }
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 56)
                .background(AppTheme.accent)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .shadow(color: AppTheme.accent.opacity(0.3), radius: 10, y: 5)
            }
            .buttonStyle(PressableButtonStyle())
            .disabled(viewModel.isSubmitting)
            
            if viewModel.currentStep == viewModel.totalSteps - 1 {
                Text("Dengan menekan tombol di atas, Anda menyetujui Syarat & Ketentuan dari Senpai Jepang.")
                    .font(.system(size: 11))
                    .foregroundStyle(AppTheme.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 16)
            } else if viewModel.currentStep == 0 {
                Text("Langkah 1 dari 3: Verifikasi Data")
                    .font(.system(size: 12))
                    .foregroundStyle(AppTheme.textSecondary)
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 16)
        .padding(.bottom, 32)
        .background(AppTheme.backgroundPrimary)
        .overlay(Divider(), alignment: .top)
    }
    
    // MARK: - Success View
    private var successView: some View {
        VStack(spacing: 24) {
            Spacer()
            
            ZStack {
                Circle()
                    .fill(AppTheme.accent.opacity(0.1))
                    .frame(width: 160, height: 160)
                    .scaleEffect(successScale)
                    .opacity(successOpacity)
                
                Circle()
                    .fill(AppTheme.accent)
                    .frame(width: 100, height: 100)
                    .shadow(color: AppTheme.accent.opacity(0.3), radius: 20, y: 10)
                    .overlay(
                        Image(systemName: "checkmark")
                            .font(.system(size: 40, weight: .bold))
                            .foregroundStyle(.white)
                    )
                    .scaleEffect(successScale)
            }
            .padding(.bottom, 16)
            
            Text("Lamaran Berhasil Terkirim!")
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(AppTheme.textPrimary)
                .opacity(successOpacity)
            
            Text("Terima kasih telah melamar. Perusahaan akan meninjau profil Anda dan menghubungi melalui email atau WhatsApp.")
                .font(.system(size: 14))
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
                .lineSpacing(4)
                .padding(.horizontal, 32)
                .opacity(successOpacity)
            
            Spacer()
            
            VStack(spacing: 16) {
                Button {
                    viewModel.finishFlow()
                } label: {
                    Text("Kembali ke Beranda")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background(AppTheme.accent)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                }
                .buttonStyle(PressableButtonStyle())
                
                Button {
                    viewModel.finishFlow()
                } label: {
                    Text("Lihat Status Lamaran")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 32)
            .opacity(successOpacity)
        }
    }
}
