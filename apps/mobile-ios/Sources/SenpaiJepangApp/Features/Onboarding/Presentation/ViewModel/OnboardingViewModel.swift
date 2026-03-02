import Foundation
import SwiftUI

@MainActor
final class OnboardingViewModel: ObservableObject {
    @Published var currentStep: Int = 0
    @Published var isAgreedToTerms: Bool = false
    
    let totalSteps = 4
    
    // Add completion handler so AppRootView knows when to dismiss
    var onComplete: (() -> Void)?
    
    func nextStep() {
        withAnimation(AppTheme.animationDefault) {
            if currentStep < totalSteps - 1 {
                currentStep += 1
            }
        }
    }
    
    func completeOnboarding() {
        // Only allow completion if terms are agreed (handled by UI validation too)
        guard isAgreedToTerms else { return }
        
        // Save state to UserDefaults
        UserDefaultsManager.shared.hasSeenOnboarding = true
        
        // Notify parent view
        onComplete?()
    }
}
