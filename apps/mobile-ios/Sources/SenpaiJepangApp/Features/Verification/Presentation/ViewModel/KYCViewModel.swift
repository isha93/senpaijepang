import Foundation
import SwiftUI

enum KYCStep: Int, CaseIterable {
    case welcome
    case scanningFront
    case uploading
}

@MainActor
final class KYCViewModel: ObservableObject, ManagedTask {
    @Published var currentStep: KYCStep = .welcome
    @Published var isFlashOn: Bool = false
    
    // ManagedTask requirements
    @Published var isLoading: Bool = false
    @Published var errorMessage: String? = nil
    
    // Uploading animation states
    @Published var isImageQualityChecked: Bool = false
    @Published var isEncryptionDone: Bool = false
    @Published var isConnectingFinished: Bool = false

    private let navigation: NavigationHandling

    init(navigation: NavigationHandling) {
        self.navigation = navigation
    }

    func startVerification() {
        withAnimation(AppTheme.animationDefault) {
            currentStep = .scanningFront
        }
    }

    func toggleFlash() {
        isFlashOn.toggle()
    }

    func captureImage() {
        withAnimation(AppTheme.animationDefault) {
            currentStep = .uploading
        }
        startUploadProcess()
    }

    func cancelUpload() {
        // Reset states
        isImageQualityChecked = false
        isEncryptionDone = false
        isConnectingFinished = false
        
        withAnimation(AppTheme.animationDefault) {
            currentStep = .welcome
        }
    }

    func close() {
        navigation.pop()
    }

    private func startUploadProcess() {
        // Simulate uploading steps
        Task {
            // Reset
            isImageQualityChecked = false
            isEncryptionDone = false
            isConnectingFinished = false
            
            // Step 1: Image Quality
            try? await Task.sleep(nanoseconds: 1_000_000_000)
            guard currentStep == .uploading else { return } // check if cancelled
            await MainActor.run { withAnimation { isImageQualityChecked = true } }
            
            // Step 2: Encryption
            try? await Task.sleep(nanoseconds: 1_200_000_000)
            guard currentStep == .uploading else { return }
            await MainActor.run { withAnimation { isEncryptionDone = true } }
            
            // Step 3: Connecting
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            guard currentStep == .uploading else { return }
            await MainActor.run { withAnimation { isConnectingFinished = true } }
            
            // Success -> return to profile or show success modal
            try? await Task.sleep(nanoseconds: 800_000_000)
            guard currentStep == .uploading else { return }
            navigation.pop() // Simple dismiss for now
        }
    }
}
