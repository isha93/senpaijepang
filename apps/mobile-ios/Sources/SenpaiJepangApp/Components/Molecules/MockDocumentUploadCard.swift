import SwiftUI

public enum MockUploadState: Equatable {
    case empty
    case uploading(progress: Double)
    case success(fileName: String)
    case error(message: String)
}

public struct MockDocumentUploadCard: View {
    let title: String
    let description: String
    let isMandatory: Bool
    let onUploadSuccess: ((String) -> Void)?
    
    @State private var state: MockUploadState = .empty
    @State private var showActionSheet = false
    @State private var uploadTask: Task<Void, Never>? = nil

    public init(
        title: String,
        description: String,
        isMandatory: Bool = false,
        onUploadSuccess: ((String) -> Void)? = nil
    ) {
        self.title = title
        self.description = description
        self.isMandatory = isMandatory
        self.onUploadSuccess = onUploadSuccess
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 4) {
                Text(title)
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.textPrimary)
                
                if isMandatory {
                    Text("*")
                        .font(.subheadline.bold())
                        .foregroundStyle(.red)
                }
                
                Spacer()
                
                if case .success = state {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(AppTheme.accent)
                }
            }
            
            Button {
                if case .uploading = state { return }
                
                if case .success = state {
                    // Give option to replace or delete
                    showActionSheet = true
                } else {
                    // Start flow
                    showActionSheet = true
                }
            } label: {
                contentView
            }
            .buttonStyle(.plain)
            .confirmationDialog("Upload Document", isPresented: $showActionSheet, titleVisibility: .visible) {
                Button("Take Photo") { simulateUpload(file: "Photo_\(Int.random(in: 1000...9999)).jpg") }
                Button("Photo Library") { simulateUpload(file: "Image_\(Int.random(in: 1000...9999)).jpg") }
                Button("Choose File") { simulateUpload(file: "\(title.replacingOccurrences(of: " ", with: "_"))_2026.pdf") }
                if case .success = state {
                    Button("Remove File", role: .destructive) {
                        state = .empty
                    }
                }
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("Select a source to upload your \(title.lowercased())")
            }
        }
    }
    
    @ViewBuilder
    private var contentView: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(
                    style: StrokeStyle(
                        lineWidth: 1.5,
                        dash: state == .empty ? [6] : []
                    )
                )
                .foregroundStyle(borderColor)
                .background(backgroundColor.clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous)))
            
            switch state {
            case .empty:
                VStack(spacing: 8) {
                    Image(systemName: "icloud.and.arrow.up")
                        .font(.title2)
                        .foregroundStyle(AppTheme.accent)
                    
                    Text("Tap to upload")
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.accent)
                    
                    Text(description)
                        .font(.caption)
                        .foregroundStyle(AppTheme.textTertiary)
                        .multilineTextAlignment(.center)
                }
                .padding(.vertical, 24)
                .padding(.horizontal, 16)
                
            case .uploading(let progress):
                VStack(spacing: 12) {
                    ProgressView()
                        .tint(AppTheme.accent)
                    
                    Text("Uploading... \(Int(progress * 100))%")
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.accent)
                }
                .padding(.vertical, 24)
                
            case .success(let fileName):
                HStack(spacing: 16) {
                    Image(systemName: "doc.text.fill")
                        .font(.title2)
                        .foregroundStyle(AppTheme.accent)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text(fileName)
                            .font(.subheadline.bold())
                            .foregroundStyle(AppTheme.textPrimary)
                            .lineLimit(1)
                            .truncationMode(.middle)
                        
                        Text("Successfully uploaded")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textTertiary)
                    }
                    
                    Spacer()
                    
                    Image(systemName: "ellipsis")
                        .foregroundStyle(AppTheme.textTertiary)
                }
                .padding(.vertical, 16)
                .padding(.horizontal, 16)
                
            case .error(let message):
                VStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.title2)
                        .foregroundStyle(.red)
                    
                    Text("Upload Failed")
                        .font(.subheadline.bold())
                        .foregroundStyle(.red)
                    
                    Text(message)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }
                .padding(.vertical, 24)
                .padding(.horizontal, 16)
            }
        }
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: state)
    }
    
    private var borderColor: Color {
        switch state {
        case .empty: return AppTheme.grayMedium
        case .uploading, .success: return AppTheme.accent.opacity(0.5)
        case .error: return .red.opacity(0.5)
        }
    }
    
    private var backgroundColor: Color {
        switch state {
        case .empty: return .clear
        case .uploading: return AppTheme.accentLight.opacity(0.3)
        case .success: return AppTheme.accentLight.opacity(0.5)
        case .error: return .red.opacity(0.05)
        }
    }
    
    private func simulateUpload(file: String) {
        uploadTask?.cancel()
        
        uploadTask = Task { @MainActor in
            state = .uploading(progress: 0.0)
            
            // Simulate realistic progress
            let totalSteps = 20
            for i in 1...totalSteps {
                try? await Task.sleep(nanoseconds: 100_000_000) // 100ms per step
                if Task.isCancelled { return }
                
                // Add some artificial jitter
                let jitter = Double.random(in: 0...0.05)
                let progress = min(1.0, (Double(i) / Double(totalSteps)) + jitter)
                
                withAnimation {
                    state = .uploading(progress: progress)
                }
            }
            
            // Finish
            try? await Task.sleep(nanoseconds: 200_000_000)
            if Task.isCancelled { return }
            
            withAnimation {
                state = .success(fileName: file)
            }
            
            onUploadSuccess?(file)
        }
    }
}

#Preview {
    VStack(spacing: 24) {
        MockDocumentUploadCard(
            title: "Passport",
            description: "PDF, JPG, PNG up to 5MB",
            isMandatory: true
        )
        
        MockDocumentUploadCard(
            title: "JLPT Certificate",
            description: "Optional certificate if you have one",
            isMandatory: false
        )
    }
    .padding()
}
