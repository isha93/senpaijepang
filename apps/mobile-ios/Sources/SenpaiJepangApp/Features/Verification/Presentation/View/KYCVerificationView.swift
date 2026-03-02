import SwiftUI

struct KYCVerificationView: View {
    @ObservedObject private var viewModel: KYCViewModel
    @ObservedObject private var langManager = LanguageManager.shared

    // Animation states
    @State private var scanLineOffset: CGFloat = -100
    @State private var pulseScale: CGFloat = 1.0
    @State private var spinnerRotation: Double = -90

    init(viewModel: KYCViewModel) {
        self.viewModel = viewModel
    }

    var body: some View {
        ZStack {
            switch viewModel.currentStep {
            case .welcome:
                welcomeStep
                    .transition(.asymmetric(
                        insertion: .opacity.combined(with: .scale(scale: 0.95)),
                        removal: .opacity.combined(with: .scale(scale: 1.05))
                    ))
            case .scanningFront:
                scanningStep
                    .transition(.asymmetric(
                        insertion: .opacity.combined(with: .scale(scale: 1.05)),
                        removal: .opacity.combined(with: .scale(scale: 0.95))
                    ))
            case .uploading:
                uploadingStep
                    .transition(.asymmetric(
                        insertion: .opacity.combined(with: .move(edge: .bottom)),
                        removal: .opacity.combined(with: .move(edge: .top))
                    ))
            }
        }
        .background(viewModel.currentStep == .scanningFront ? Color.black : AppTheme.backgroundPrimary)
        .navigationBarBackButtonHidden(true)
        #if os(iOS)
        .toolbar(.hidden, for: .tabBar)
        #endif
        .animation(.spring(response: 0.5, dampingFraction: 0.8), value: viewModel.currentStep)
    }

    // MARK: - Welcome Step

    @ViewBuilder
    private var welcomeStep: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Button { viewModel.close() } label: {
                    Image(systemName: "arrow.left")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundStyle(AppTheme.textSecondary)
                        .frame(width: 40, height: 40)
                        .background(Color(.systemGray6))
                        .clipShape(Circle())
                }
                
                Spacer()
                
                HStack(spacing: 6) {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 14))
                    Text("ENCRYPTED")
                        .font(.system(size: 11, weight: .bold))
                }
                .foregroundStyle(AppTheme.accent)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(AppTheme.accent.opacity(0.1))
                .clipShape(Capsule())
                
                Spacer()
                
                // Balance header layout
                Color.clear.frame(width: 40, height: 40)
            }
            .padding(.horizontal, 24)
            .padding(.top, 16)
            .padding(.bottom, 24)

            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    // Illustration
                    ZStack {
                        Circle()
                            .fill(AppTheme.accent.opacity(0.05))
                            .frame(width: 160, height: 160)
                        
                        // Fake image for illustration
                        Circle()
                            .fill(Color(.systemGray6))
                            .frame(width: 140, height: 140)
                            .overlay(
                                Image(systemName: "person.crop.circle.badge.checkmark")
                                    .font(.system(size: 60))
                                    .foregroundStyle(AppTheme.accent)
                            )
                            .overlay(
                                Circle()
                                    .stroke(Color.white, lineWidth: 4)
                            )
                            .shadow(color: Color.black.opacity(0.05), radius: 10, y: 5)
                            
                        // Badge
                        Image(systemName: "checkmark.shield.fill")
                            .font(.system(size: 24))
                            .foregroundStyle(.white)
                            .frame(width: 44, height: 44)
                            .background(AppTheme.accent)
                            .clipShape(Circle())
                            .overlay(Circle().stroke(Color.white, lineWidth: 3))
                            .shadow(color: AppTheme.accent.opacity(0.3), radius: 8, y: 4)
                            .offset(x: 50, y: 50)
                    }
                    .padding(.bottom, 32)
                    
                    // Titles
                    Text("Verify your identity")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundStyle(AppTheme.textPrimary)
                        .padding(.bottom, 12)
                        
                    Text("To keep the Senpai Jepang community safe, we need to verify your Resident Card (Zairyu Kado). It only takes 2 minutes.")
                        .font(.system(size: 15))
                        .foregroundStyle(AppTheme.textSecondary)
                        .multilineTextAlignment(.center)
                        .lineSpacing(4)
                        .padding(.horizontal, 32)
                        .padding(.bottom, 40)
                        
                    // Steps
                    VStack(spacing: 0) {
                        stepRow(icon: "person.text.rectangle", title: "Scan ID Document", description: "Front and back of your Residence Card")
                        Divider().padding(.leading, 68)
                        stepRow(icon: "faceid", title: "Take a Selfie", description: "Quick face scan to match your ID")
                    }
                    .padding(.horizontal, 24)
                }
            }
            
            // Bottom Action
            VStack(spacing: 16) {
                Button { viewModel.startVerification() } label: {
                    HStack {
                        Text("Start Verification")
                            .font(.system(size: 18, weight: .bold))
                        Image(systemName: "chevron.right")
                            .font(.system(size: 18, weight: .bold))
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 60)
                    .background(AppTheme.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .shadow(color: AppTheme.accent.opacity(0.2), radius: 12, y: 6)
                }
                .buttonStyle(PressableButtonStyle())
                
                HStack(spacing: 4) {
                    Text("By continuing, you agree to our")
                        .foregroundStyle(AppTheme.textTertiary)
                    Button("Privacy Policy") {}
                        .foregroundStyle(AppTheme.accent)
                        .fontWeight(.medium)
                }
                .font(.system(size: 13))
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 40)
        }
    }
    
    @ViewBuilder
    private func stepRow(icon: String, title: String, description: String) -> some View {
        HStack(spacing: 20) {
            ZStack {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Color(.systemGray6))
                    .frame(width: 48, height: 48)
                Image(systemName: icon)
                    .font(.system(size: 22))
                    .foregroundStyle(AppTheme.accent)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(AppTheme.textPrimary)
                Text(description)
                    .font(.system(size: 14))
                    .foregroundStyle(AppTheme.textSecondary)
            }
            Spacer()
        }
        .padding(.vertical, 20)
    }

    // MARK: - Scanning Step

    @ViewBuilder
    private var scanningStep: some View {
        ZStack {
            // Fake Camera Background
            Color(.systemGray5)
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header
                HStack {
                    Button { viewModel.cancelUpload() } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundStyle(.white)
                            .frame(width: 40, height: 40)
                            .background(Color.black.opacity(0.3))
                            .clipShape(Circle())
                    }
                    
                    Spacer()
                    
                    Text("Front Side")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.black.opacity(0.3))
                        .clipShape(Capsule())
                    
                    Spacer()
                    
                    Button { viewModel.toggleFlash() } label: {
                        Image(systemName: viewModel.isFlashOn ? "bolt.fill" : "bolt.slash.fill")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundStyle(viewModel.isFlashOn ? AppTheme.accent : .white)
                            .frame(width: 40, height: 40)
                            .background(Color.black.opacity(0.3))
                            .clipShape(Circle())
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 40)
                
                // Instructions
                VStack(spacing: 8) {
                    Text("Scan Front of Card")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(.white)
                    Text("Position your Residence Card within the frame")
                        .font(.system(size: 14))
                        .foregroundStyle(.white.opacity(0.7))
                }
                .padding(.top, 24)
                
                Spacer()
                
                // Camera Frame
                GeometryReader { proxy in
                    let frameWidth = proxy.size.width - 48
                    let frameHeight = frameWidth / 1.58
                    
                    ZStack {
                        // Frame border
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(AppTheme.accent.opacity(0.5), lineWidth: 2)
                            .frame(width: frameWidth, height: frameHeight)
                        
                        // Corner markers
                        let cornerLength: CGFloat = 30
                        let cornerThickness: CGFloat = 5
                        
                        // Top Left
                        Path { path in
                            path.move(to: CGPoint(x: 0, y: cornerLength))
                            path.addLine(to: CGPoint(x: 0, y: 0))
                            path.addLine(to: CGPoint(x: cornerLength, y: 0))
                        }
                        .stroke(AppTheme.accent, lineWidth: cornerThickness)
                        .frame(width: cornerLength, height: cornerLength)
                        .position(x: 24 + cornerThickness/2, y: proxy.size.height/2 - frameHeight/2 + cornerThickness/2)
                        
                        // Top Right
                        Path { path in
                            path.move(to: CGPoint(x: 0, y: 0))
                            path.addLine(to: CGPoint(x: cornerLength, y: 0))
                            path.addLine(to: CGPoint(x: cornerLength, y: cornerLength))
                        }
                        .stroke(AppTheme.accent, lineWidth: cornerThickness)
                        .frame(width: cornerLength, height: cornerLength)
                        .position(x: proxy.size.width - 24 - cornerLength + cornerThickness/2, y: proxy.size.height/2 - frameHeight/2 + cornerThickness/2)
                        
                        // Bottom Left
                        Path { path in
                            path.move(to: CGPoint(x: 0, y: 0))
                            path.addLine(to: CGPoint(x: 0, y: cornerLength))
                            path.addLine(to: CGPoint(x: cornerLength, y: cornerLength))
                        }
                        .stroke(AppTheme.accent, lineWidth: cornerThickness)
                        .frame(width: cornerLength, height: cornerLength)
                        .position(x: 24 + cornerThickness/2, y: proxy.size.height/2 + frameHeight/2 - cornerLength + cornerThickness/2)
                        
                        // Bottom Right
                        Path { path in
                            path.move(to: CGPoint(x: cornerLength, y: 0))
                            path.addLine(to: CGPoint(x: cornerLength, y: cornerLength))
                            path.addLine(to: CGPoint(x: 0, y: cornerLength))
                        }
                        .stroke(AppTheme.accent, lineWidth: cornerThickness)
                        .frame(width: cornerLength, height: cornerLength)
                        .position(x: proxy.size.width - 24 - cornerLength + cornerThickness/2, y: proxy.size.height/2 + frameHeight/2 - cornerLength + cornerThickness/2)
                        
                        // Scanning line
                        Rectangle()
                            .fill(LinearGradient(colors: [.clear, AppTheme.accent, .clear], startPoint: .leading, endPoint: .trailing))
                            .frame(width: frameWidth, height: 2)
                            .shadow(color: AppTheme.accent, radius: 10, y: 0)
                            .offset(y: scanLineOffset)
                            .onAppear {
                                withAnimation(.linear(duration: 2.5).repeatForever(autoreverses: false)) {
                                    scanLineOffset = frameHeight
                                }
                            }
                            
                        // Badge
                        Text("ALIGN EDGES")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 6)
                            .background(AppTheme.accent.opacity(0.3))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.accent.opacity(0.5), lineWidth: 1))
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                
                Spacer()
                
                // Bottom Toolbar
                VStack(spacing: 32) {
                    HStack(spacing: 60) {
                        Button { } label: {
                            VStack(spacing: 6) {
                                Image(systemName: "photo")
                                    .font(.system(size: 24))
                                Text("UPLOAD")
                                    .font(.system(size: 11, weight: .bold))
                            }
                            .foregroundStyle(.white.opacity(0.7))
                        }
                        
                        Button { viewModel.captureImage() } label: {
                            ZStack {
                                Circle()
                                    .stroke(Color.white.opacity(0.4), lineWidth: 3)
                                    .frame(width: 80, height: 80)
                                Circle()
                                    .fill(Color.white)
                                    .frame(width: 68, height: 68)
                            }
                        }
                        .buttonStyle(PressableButtonStyle())
                        
                        Button { } label: {
                            VStack(spacing: 6) {
                                Image(systemName: "questionmark.circle")
                                    .font(.system(size: 24))
                                Text("HELP")
                                    .font(.system(size: 11, weight: .bold))
                            }
                            .foregroundStyle(.white.opacity(0.7))
                        }
                    }
                    
                    Text("MAKE SURE THE TEXT IS CLEAR AND READABLE")
                        .font(.system(size: 11, weight: .medium))
                        .tracking(1)
                        .foregroundStyle(.white.opacity(0.4))
                }
                .padding(.bottom, 48)
            }
        }
        .onAppear {
            scanLineOffset = -150 // Start above frame
        }
    }

    // MARK: - Uploading Step

    @ViewBuilder
    private var uploadingStep: some View {
        VStack(spacing: 0) {
            Spacer()
            
            // Animation Circle
            ZStack {
                // Background track
                Circle()
                    .stroke(Color(.systemGray6), lineWidth: 6)
                    .frame(width: 160, height: 160)
                
                // Animated progress rim
                if !viewModel.isConnectingFinished {
                    Circle()
                        .trim(from: 0, to: 0.7)
                        .stroke(AppTheme.accent, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                        .frame(width: 160, height: 160)
                        .rotationEffect(.degrees(spinnerRotation))
                        .onAppear {
                            withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                                spinnerRotation = 270
                            }
                        }
                } else {
                    Circle()
                        .stroke(AppTheme.accent, lineWidth: 6)
                        .frame(width: 160, height: 160)
                }
                
                // Inner icon
                ZStack {
                    Circle()
                        .fill(AppTheme.accent.opacity(0.05))
                        .frame(width: 80, height: 80)
                        .scaleEffect(pulseScale)
                        .onAppear {
                            withAnimation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true)) {
                                pulseScale = 1.15
                            }
                        }
                    
                    Image(systemName: viewModel.isConnectingFinished ? "checkmark.seal.fill" : "cloud.fill")
                        .font(.system(size: 32))
                        .foregroundStyle(AppTheme.accent)
                        .contentTransition(.symbolEffect(.replace))
                }
            }
            .padding(.bottom, 40)
            
            Text(viewModel.isConnectingFinished ? "Upload Complete!" : "Securely Uploading")
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(AppTheme.textPrimary)
                .padding(.bottom, 12)
                .contentTransition(.numericText())
                
            Text("Please wait while we encrypt and securely transmit your documents to our verification server.")
                .font(.system(size: 15))
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
                .lineSpacing(4)
                .padding(.horizontal, 32)
                .padding(.bottom, 40)
            
            // Checklist
            VStack(alignment: .leading, spacing: 20) {
                checklistItem(title: "Image quality check", isDone: viewModel.isImageQualityChecked)
                checklistItem(title: "Encryption process", isDone: viewModel.isEncryptionDone)
                checklistItem(title: "Connecting to server...", isDone: viewModel.isConnectingFinished, inProgress: viewModel.isEncryptionDone && !viewModel.isConnectingFinished)
            }
            .padding(.horizontal, 48)
            
            Spacer()
            
            Button { viewModel.cancelUpload() } label: {
                Text("CANCEL UPLOAD")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(AppTheme.textTertiary)
                    .tracking(1)
                    .padding(.bottom, 48)
            }
        }
    }
    
    @ViewBuilder
    private func checklistItem(title: String, isDone: Bool, inProgress: Bool = false) -> some View {
        HStack(spacing: 16) {
            ZStack {
                if isDone {
                    Circle()
                        .fill(AppTheme.accent)
                        .frame(width: 24, height: 24)
                    Image(systemName: "checkmark")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(.white)
                        .transition(.scale)
                } else if inProgress {
                    Circle()
                        .trim(from: 0, to: 0.7)
                        .stroke(AppTheme.accent, style: StrokeStyle(lineWidth: 2, lineCap: .round))
                        .frame(width: 24, height: 24)
                        .rotationEffect(.degrees(spinnerRotation))
                } else {
                    Circle()
                        .stroke(Color(.systemGray4), lineWidth: 2)
                        .frame(width: 24, height: 24)
                }
            }
            
            Text(title)
                .font(.system(size: 15, weight: isDone ? .medium : .regular))
                .foregroundStyle(isDone ? AppTheme.textPrimary : (inProgress ? AppTheme.accent : AppTheme.textSecondary))
            
            Spacer()
        }
        .animation(.spring(), value: isDone)
    }
}
