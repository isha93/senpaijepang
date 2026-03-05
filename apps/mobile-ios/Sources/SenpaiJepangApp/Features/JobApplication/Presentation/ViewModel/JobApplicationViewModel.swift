import Foundation
import SwiftUI
import Combine

@MainActor
final class JobApplicationViewModel: ObservableObject {
    @Published var currentStep: Int = 0
    @Published var coverLetterText: String = ""
    @Published var isSubmitting: Bool = false
    @Published var submissionSuccess: Bool = false
    @Published var errorMessage: String? = nil

    let totalSteps = 3
    let job: Job
    private let journeyService: JourneyServiceProtocol
    private let navigation: NavigationHandling
    private var submittedApplicationId: String?

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
        errorMessage = nil
        Task {
            do {
                let journey = try await journeyService.applyJob(jobId: job.id)
                submittedApplicationId = journey.applicationId
            } catch {
                submittedApplicationId = nil
                errorMessage = error.localizedDescription
            }
            isSubmitting = false
            withAnimation(AppTheme.animationDefault) {
                submissionSuccess = true
            }
        }
    }

    func finishFlow() {
        navigation.dismissApplication()
        navigation.push(
            .applicationJourney(applicationId: submittedApplicationId ?? job.id)
        )
    }
}
