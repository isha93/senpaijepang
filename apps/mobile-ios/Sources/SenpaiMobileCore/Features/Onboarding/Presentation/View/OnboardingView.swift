import SwiftUI

struct OnboardingView: View {
    @StateObject private var viewModel = OnboardingViewModel()
    
    // For bouncing animation in Step 2
    @State private var isBouncing = false

    var body: some View {
        VStack(spacing: 0) {
            // Top Progress Bar
            progressHeader
            
            // TabView for Steps
            TabView(selection: $viewModel.currentStep) {
                step1Peringatan.tag(0)
                step2Waspada.tag(1)
                step3Identitas.tag(2)
                step4Privasi.tag(3)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            #if os(iOS)
            .animation(.easeInOut(duration: 0.3), value: viewModel.currentStep)
            #endif
            
            // Bottom Action
            bottomAction
        }
        .background(AppTheme.backgroundPrimary)
        .onAppear {
            withAnimation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true)) {
                isBouncing = true
            }
        }
        .onChange(of: viewModel.currentStep) { _, _ in
            // Trigger haptic feedback on step change
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
        }
    }
    
    // MARK: - Progress Header
    @ViewBuilder
    private var progressHeader: some View {
        HStack(spacing: 8) {
            ForEach(0..<viewModel.totalSteps, id: \.self) { index in
                Capsule()
                    .fill(index <= viewModel.currentStep ? AppTheme.accent : Color(.systemGray5))
                    .frame(height: 6)
                    .frame(maxWidth: .infinity)
                    .animation(AppTheme.animationDefault, value: viewModel.currentStep)
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 24)
        .padding(.bottom, 8)
    }
    
    // MARK: - Step 1: Peringatan
    @ViewBuilder
    private var step1Peringatan: some View {
        VStack(spacing: 0) {
            Spacer()
            
            // Graphic
            ZStack {
                Circle()
                    .stroke(AppTheme.accent.opacity(0.1), lineWidth: 1)
                    .frame(width: 280, height: 280)
                Circle()
                    .stroke(AppTheme.accent.opacity(0.2), lineWidth: 1)
                    .frame(width: 220, height: 220)
                
                ZStack {
                    Circle()
                        .fill(AppTheme.backgroundPrimary)
                        .frame(width: 128, height: 128)
                        .shadow(color: AppTheme.accent.opacity(0.05), radius: 10, y: 5)
                        .overlay(
                            Circle().stroke(AppTheme.accent.opacity(0.1), lineWidth: 1)
                        )
                    Image(systemName: "shield")
                        .font(.system(size: 64, weight: .light))
                        .foregroundStyle(AppTheme.accent)
                }
                
                // Exclamation Badge
                ZStack {
                    Circle()
                        .fill(AppTheme.accent)
                        .frame(width: 32, height: 32)
                        .overlay(
                            Circle().stroke(AppTheme.backgroundPrimary, lineWidth: 2)
                        )
                        .shadow(radius: 4)
                    Image(systemName: "exclamationmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.white)
                }
                .offset(x: 40, y: -40)
            }
            .padding(.bottom, 48)
            
            // Text
            Text("Peringatan Penting")
                .font(.system(size: 30, weight: .bold))
                .foregroundStyle(AppTheme.textPrimary)
                .padding(.bottom, 16)
            
            Text("Senpaijepang tidak pernah meminta\ntransfer bank pribadi.")
                .font(.system(size: 18))
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
                .lineSpacing(4)
                .padding(.bottom, 32)
            
            // Warning Box
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 16))
                    .foregroundStyle(Color.red)
                    .padding(.top, 2)
                
                Text("Hati-hati terhadap penipuan yang mengatasnamakan kami.")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.red.opacity(0.8))
            }
            .padding(16)
            .background(Color.red.opacity(0.08))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.red.opacity(0.15), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .padding(.horizontal, 32)
            
            Spacer()
        }
    }
    
    // MARK: - Step 2: Waspada
    @ViewBuilder
    private var step2Waspada: some View {
        VStack(spacing: 0) {
            Spacer()
            
            // Graphic
            ZStack {
                Circle()
                    .fill(AppTheme.accent.opacity(0.05))
                    .frame(width: 260, height: 260)
                    .blur(radius: 20)
                
                Circle()
                    .fill(AppTheme.accent.opacity(0.1))
                    .frame(width: 160, height: 160)
                    .overlay(
                        Circle().stroke(AppTheme.accent.opacity(0.2), lineWidth: 1)
                    )
                
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: 64, weight: .light))
                    .foregroundStyle(AppTheme.accent)
                
                // Floating badges
                badgeItem(icon: "exclamationmark", x: 70, y: -60, bounceScale: 1.1)
                badgeItem(icon: "lock", x: -60, y: 70, bounceScale: 0.9)
            }
            .padding(.bottom, 64)
            
            // Text
            Text("Harap Waspada")
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(AppTheme.textPrimary)
                .padding(.bottom, 16)
            
            Text("Jika ada yang meminta uang di luar sistem resmi, itu bisa jadi penipuan.")
                .font(.system(size: 16))
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
                .lineSpacing(4)
                .padding(.horizontal, 48)
            
            Spacer()
        }
    }
    
    @ViewBuilder
    private func badgeItem(icon: String, x: CGFloat, y: CGFloat, bounceScale: CGFloat) -> some View {
        ZStack {
            Circle()
                .fill(AppTheme.backgroundPrimary)
                .frame(width: 40, height: 40)
                .shadow(color: AppTheme.textTertiary.opacity(0.1), radius: 5, y: 2)
                .overlay(
                    Circle().stroke(AppTheme.accent.opacity(0.1), lineWidth: 1)
                )
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundStyle(AppTheme.accent)
        }
        .offset(x: x, y: isBouncing ? y - 10 : y)
        .scaleEffect(isBouncing ? bounceScale : 1.0)
    }
    
    // MARK: - Step 3: Identitas
    @ViewBuilder
    private var step3Identitas: some View {
        VStack(spacing: 0) {
            Spacer()
            
            // Graphic
            ZStack {
                Circle()
                    .stroke(AppTheme.accent.opacity(0.1), lineWidth: 1)
                    .frame(width: 240, height: 240)
                Circle()
                    .stroke(AppTheme.accent.opacity(0.1), lineWidth: 1)
                    .frame(width: 200, height: 200)
                
                Circle()
                    .fill(AppTheme.accent.opacity(0.05))
                    .frame(width: 240, height: 240)
                
                Image(systemName: "touchid")
                    .font(.system(size: 80, weight: .light))
                    .foregroundStyle(AppTheme.accent)
                
                // ID Badge
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(AppTheme.backgroundPrimary)
                        .frame(width: 40, height: 32)
                        .shadow(color: AppTheme.textTertiary.opacity(0.1), radius: 4, y: 2)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8).stroke(AppTheme.accent.opacity(0.1), lineWidth: 1)
                        )
                    Image(systemName: "person.text.rectangle.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(AppTheme.accent)
                }
                .offset(x: 35, y: 35)
            }
            .padding(.bottom, 64)
            
            // Text
            Text("Identitas Anda")
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(AppTheme.textPrimary)
                .padding(.bottom, 16)
            
            Text("Saya akan menggunakan identitas asli dan tidak membuat akun ganda.")
                .font(.system(size: 15))
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
                .lineSpacing(4)
                .padding(.horizontal, 48)
            
            Spacer()
        }
    }
    
    // MARK: - Step 4: Privasi
    @ViewBuilder
    private var step4Privasi: some View {
        VStack(spacing: 0) {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    // Graphic
                    ZStack {
                        Circle()
                            .fill(AppTheme.accent.opacity(0.1))
                            .frame(width: 160, height: 160)
                        
                        Image(systemName: "lock.fill")
                            .font(.system(size: 72))
                            .foregroundStyle(AppTheme.accent)
                        
                        // Check Badge
                        ZStack {
                            Circle()
                                .fill(AppTheme.accent)
                                .frame(width: 32, height: 32)
                                .overlay(
                                    Circle().stroke(AppTheme.backgroundPrimary, lineWidth: 4)
                                )
                                .shadow(radius: 4)
                            Image(systemName: "checkmark")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(.white)
                        }
                        .offset(x: 50, y: 50)
                    }
                    .padding(.top, 40)
                    .padding(.bottom, 32)
                    
                    Text("Privasi & Keamanan")
                        .font(.system(size: 30, weight: .bold))
                        .foregroundStyle(AppTheme.textPrimary)
                        .padding(.bottom, 24)
                    
                    // Feature List
                    VStack(spacing: 16) {
                        featureRow(icon: "lock.rectangle.fill", title: "Enkripsi End-to-End", desc: "Data Anda dienkripsi sepenuhnya, hanya Anda yang dapat mengaksesnya.")
                        featureRow(icon: "eye.slash.fill", title: "Privasi Terjamin", desc: "Kami menghargai privasi dan tidak menjual data Anda ke pihak ketiga.")
                        featureRow(icon: "checkmark.shield.fill", title: "Verifikasi Keamanan", desc: "Verifikasi identitas hanya dilakukan untuk tujuan keamanan akun.")
                        featureRow(icon: "trash.fill", title: "Hak Hapus Data", desc: "Anda memiliki kendali penuh untuk menghapus data kapan saja.")
                    }
                    .padding(20)
                    .background(Color(.systemGray6).opacity(0.5))
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                    .overlay(
                        RoundedRectangle(cornerRadius: 20).stroke(Color(.systemGray5), lineWidth: 1)
                    )
                    .padding(.horizontal, 24)
                }
                .padding(.bottom, 120) // Spacing for sticky bottom
            }
        }
    }
    
    @ViewBuilder
    private func featureRow(icon: String, title: String, desc: String) -> some View {
        HStack(alignment: .top, spacing: 16) {
            ZStack {
                Circle()
                    .fill(AppTheme.accent.opacity(0.1))
                    .frame(width: 24, height: 24)
                Image(systemName: icon)
                    .font(.system(size: 12))
                    .foregroundStyle(AppTheme.accent)
            }
            .padding(.top, 2)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(AppTheme.textPrimary)
                Text(desc)
                    .font(.system(size: 14))
                    .foregroundStyle(AppTheme.textSecondary)
                    .lineSpacing(2)
            }
            Spacer()
        }
    }
    
    // MARK: - Bottom Action
    @ViewBuilder
    private var bottomAction: some View {
        VStack(spacing: 20) {
            // Checkbox for final step
            if viewModel.currentStep == viewModel.totalSteps - 1 {
                Button {
                    withAnimation {
                        viewModel.isAgreedToTerms.toggle()
                    }
                } label: {
                    HStack(spacing: 12) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(viewModel.isAgreedToTerms ? AppTheme.accent : Color(.systemGray3), lineWidth: 2)
                                .frame(width: 20, height: 20)
                                .background(viewModel.isAgreedToTerms ? AppTheme.accent : .clear)
                                .clipShape(RoundedRectangle(cornerRadius: 4))
                            
                            if viewModel.isAgreedToTerms {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundStyle(.white)
                            }
                        }
                        
                        Text("Saya mengerti dan menyetujui ")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(AppTheme.textSecondary)
                        + Text("S&K")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(AppTheme.accent)
                        
                        Spacer()
                    }
                }
                .buttonStyle(.plain)
                .padding(.bottom, 8)
            }
            
            // Main Button
            Button {
                if viewModel.currentStep == viewModel.totalSteps - 1 {
                    viewModel.completeOnboarding()
                } else {
                    viewModel.nextStep()
                }
            } label: {
                HStack {
                    Text(viewModel.currentStep == viewModel.totalSteps - 1 ? "Mulai Gunakan Aplikasi" : "Selanjutnya")
                        .font(.system(size: 16, weight: .bold))
                    Image(systemName: "arrow.right")
                        .font(.system(size: 18, weight: .bold))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 56)
                .background(
                    (viewModel.currentStep == viewModel.totalSteps - 1 && !viewModel.isAgreedToTerms)
                    ? AppTheme.accent.opacity(0.5)
                    : AppTheme.accent
                )
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .shadow(
                    color: AppTheme.accent.opacity(
                        (viewModel.currentStep == viewModel.totalSteps - 1 && !viewModel.isAgreedToTerms) ? 0 : 0.2
                    ),
                    radius: 12, y: 6
                )
            }
            .buttonStyle(PressableButtonStyle())
            .disabled(viewModel.currentStep == viewModel.totalSteps - 1 && !viewModel.isAgreedToTerms)
        }
        .padding(.horizontal, 24)
        .padding(.top, 16)
        .padding(.bottom, 32)
        .background(AppTheme.backgroundPrimary)
        .overlay(
            Rectangle()
                .fill(Color(.separator).opacity(0.3))
                .frame(height: 1),
            alignment: .top
        )
    }
}
