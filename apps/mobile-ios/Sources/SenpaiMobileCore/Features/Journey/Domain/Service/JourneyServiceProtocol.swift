import Foundation

public enum ApplicationStatus: String, Sendable, Equatable, CaseIterable {
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

public struct ApplicationStep: Equatable, Sendable, Identifiable {
    public let id: String
    public let status: ApplicationStatus
    public let title: String
    public let completedAt: Date?
    public let estimatedCompletion: String?
    public let subtitle: String?
    public let requiresUpload: Bool

    public init(
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

public struct RecentUpdate: Equatable, Sendable, Identifiable {
    public let id: String
    public let title: String
    public let date: String
    public let iconName: String

    public init(id: String, title: String, date: String, iconName: String) {
        self.id = id
        self.title = title
        self.date = date
        self.iconName = iconName
    }
}

public struct ApplicationJourney: Equatable, Sendable {
    public let applicationId: String
    public let jobTitle: String
    public let companyName: String
    public let currentStatus: ApplicationStatus
    public let steps: [ApplicationStep]
    public let jobLocation: String?
    public let totalSteps: Int
    public let recentUpdates: [RecentUpdate]

    public init(
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
public protocol JourneyServiceProtocol {
    func applyJob(jobId: String) async throws -> ApplicationJourney
    func fetchJourney(applicationId: String) async throws -> ApplicationJourney
}
