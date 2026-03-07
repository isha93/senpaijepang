import Foundation

// MARK: - Application list

struct ApplicationListResponseDTO: Decodable {
    let items: [ApplicationItemDTO]
    let pageInfo: PageInfoDTO
}

struct ApplicationItemDTO: Decodable {
    let id: String
    let jobId: String
    let status: String
    let note: String?
    let createdAt: String
    let updatedAt: String
    let job: JobListItemDTO?

    func toApplicationJourney() -> ApplicationJourney {
        let currentStatus = applicationStatus(from: status)
        let steps = buildSteps(applicationId: id, current: currentStatus)
        return ApplicationJourney(
            applicationId: id,
            jobTitle: job?.title ?? "Unknown Position",
            companyName: job?.employer.name ?? "Unknown Company",
            currentStatus: currentStatus,
            steps: steps,
            jobLocation: job?.location.displayLabel,
            totalSteps: JourneyStepConfig.orderedStatuses.count,
            recentUpdates: []
        )
    }
}

// MARK: - Apply response → ApplicationJourney

extension ApplyJobResponseDTO {
    func toApplicationJourney(jobTitle: String, companyName: String, jobLocation: String?) -> ApplicationJourney {
        let currentStatus = ApplicationStatus.applied
        let steps = buildSteps(applicationId: application.id, current: currentStatus)
        return ApplicationJourney(
            applicationId: application.id,
            jobTitle: jobTitle,
            companyName: companyName,
            currentStatus: currentStatus,
            steps: steps,
            jobLocation: jobLocation,
            totalSteps: JourneyStepConfig.orderedStatuses.count,
            recentUpdates: []
        )
    }
}

// MARK: - Helpers (file-private)

private enum JourneyStepConfig {
    static let orderedStatuses: [ApplicationStatus] = [
        .applied, .screening, .interview, .visaProcessing, .visaIssued, .startWork
    ]
}

private func applicationStatus(from raw: String) -> ApplicationStatus {
    switch raw.uppercased() {
    case "SUBMITTED":       return .applied
    case "SCREENING":       return .screening
    case "INTERVIEW":       return .interview
    case "VISA_PROCESSING": return .visaProcessing
    case "VISA_ISSUED":     return .visaIssued
    case "START_WORK":      return .startWork
    case "OFFERED":         return .offered
    case "ACCEPTED":        return .accepted
    case "REJECTED":        return .rejected
    default:                return .applied
    }
}

private func statusTitle(_ status: ApplicationStatus) -> String {
    switch status {
    case .applied:          return "Application Submitted"
    case .screening:        return "Screening"
    case .interview:        return "Interview"
    case .visaProcessing:   return "Visa Processing"
    case .visaIssued:       return "Visa Issued"
    case .startWork:        return "Start Work"
    case .offered:          return "Offer Received"
    case .accepted:         return "Accepted"
    case .rejected:         return "Rejected"
    }
}

private func buildSteps(applicationId: String, current: ApplicationStatus) -> [ApplicationStep] {
    let ordered = JourneyStepConfig.orderedStatuses
    let currentIndex = ordered.firstIndex(of: current) ?? 0
    return ordered.enumerated().map { index, s in
        ApplicationStep(
            id: "\(applicationId)-step-\(index)",
            status: s,
            title: statusTitle(s),
            completedAt: index <= currentIndex ? Date() : nil
        )
    }
}
