import Foundation
import SwiftUI
import Combine

@MainActor
final class JobApplicationViewModel: ObservableObject {
    @Published var currentStep: Int = 0
    @Published var coverLetterText: String = ""
    @Published var isSubmitting: Bool = false
    @Published var submissionSuccess: Bool = false
    
    let totalSteps = 3
    let job: Job
    private let navigation: NavigationHandling
    
    var onDismiss: (() -> Void)?
    
    init(job: Job, navigation: NavigationHandling) {
        self.job = job
        self.navigation = navigation
    }
    
    func nextStep() {
        withAnimation(AppTheme.animationDefault) {
            if currentStep < totalSteps - 1 {
                currentStep += 1
            }
        }
    }
    
    func previousStep() {
        withAnimation(AppTheme.animationDefault) {
            if currentStep > 0 {
                currentStep -= 1
            } else {
                navigation.pop()
            }
        }
    }
    
    func submitApplication() {
        isSubmitting = true
        
        // Mock network delay
        Task {
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            
            await MainActor.run {
                self.isSubmitting = false
                withAnimation(AppTheme.animationDefault) {
                    self.submissionSuccess = true
                }
            }
        }
    }
    
    func finishFlow() {
        navigation.popToRoot()
        navigation.push(.applicationJourney(applicationId: job.id))
    }
}
