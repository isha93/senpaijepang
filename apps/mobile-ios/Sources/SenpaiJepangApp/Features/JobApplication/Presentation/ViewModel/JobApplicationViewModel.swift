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
    private let journeyService: JourneyServiceProtocol
    private let navigation: NavigationHandling

    var onDismiss: (() -> Void)?

    init(job: Job, journeyService: JourneyServiceProtocol, navigation: NavigationHandling) {
        self.job = job
        self.journeyService = journeyService
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
                navigation.dismissApplication()
            }
        }
    }

    func submitApplication() {
        isSubmitting = true
        Task {
            do {
                _ = try await journeyService.applyJob(jobId: job.id)
            } catch {
                // Continue to success screen even on error; journey view will handle state
            }
            isSubmitting = false
            withAnimation(AppTheme.animationDefault) {
                submissionSuccess = true
            }
        }
    }

    func finishFlow() {
        navigation.dismissApplication()
        navigation.push(.applicationJourney(applicationId: job.id))
    }
}
