import Foundation

public enum AppRoute: Hashable, Sendable {
    case login
    case jobsList
    case jobDetail(jobId: String)
    case savedJobs
    case profile
    case applicationJourney(applicationId: String)
}
