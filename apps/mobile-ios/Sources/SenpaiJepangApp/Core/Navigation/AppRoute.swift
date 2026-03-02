import Foundation

enum AppRoute: Hashable, Sendable {
    case login
    case registration
    case notifications
    case mainTabs
    case jobsList
    case jobDetail(jobId: String)
    case savedJobs
    case profile
    case applicationJourney(applicationId: String)
    case feed
    case settings
}

