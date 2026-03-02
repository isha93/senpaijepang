import Foundation

enum ApplicationStatus: String, Sendable, Equatable, CaseIterable {
    case applied
    case screening
    case interview
    case visaProcessing = "visa_processing"
    case visaIssued = "visa_issued"
    case startWork = "start_work"
    case offered
    case accepted
    case rejected
}

struct ApplicationStep: Equatable, Sendable, Identifiable {
    let id: String
    let status: ApplicationStatus
    let title: String
    let completedAt: Date?
    let estimatedCompletion: String?
    let subtitle: String?
    let requiresUpload: Bool

    init(
        id: String,
        status: ApplicationStatus,
        title: String,
        completedAt: Date? = nil,
        estimatedCompletion: String? = nil,
        subtitle: String? = nil,
        requiresUpload: Bool = false
    ) {
        self.id = id
        self.status = status
        self.title = title
        self.completedAt = completedAt
        self.estimatedCompletion = estimatedCompletion
        self.subtitle = subtitle
        self.requiresUpload = requiresUpload
    }
}

struct RecentUpdate: Equatable, Sendable, Identifiable {
    let id: String
    let title: String
    let date: String
    let iconName: String

    init(id: String, title: String, date: String, iconName: String) {
        self.id = id
        self.title = title
        self.date = date
        self.iconName = iconName
    }
}

struct ApplicationJourney: Equatable, Sendable {
    let applicationId: String
    let jobTitle: String
    let companyName: String
    let currentStatus: ApplicationStatus
    let steps: [ApplicationStep]
    let jobLocation: String?
    let totalSteps: Int
    let recentUpdates: [RecentUpdate]

    init(
        applicationId: String,
        jobTitle: String,
        companyName: String,
        currentStatus: ApplicationStatus,
        steps: [ApplicationStep],
        jobLocation: String? = nil,
        totalSteps: Int = 0,
        recentUpdates: [RecentUpdate] = []
    ) {
        self.applicationId = applicationId
        self.jobTitle = jobTitle
        self.companyName = companyName
        self.currentStatus = currentStatus
        self.steps = steps
        self.jobLocation = jobLocation
        self.totalSteps = totalSteps
        self.recentUpdates = recentUpdates
    }
}

@MainActor
protocol JourneyServiceProtocol {
    func applyJob(jobId: String) async throws -> ApplicationJourney
    func fetchJourney(applicationId: String) async throws -> ApplicationJourney
}
