import Foundation

enum VerificationStatus: String, Sendable, Equatable {
    case unverified
    case pending
    case verified
    case rejected
}

enum DocumentStatus: String, Sendable, Equatable {
    case verified
    case pendingReview = "pending_review"
    case upload
}

struct VerificationDocument: Equatable, Sendable, Identifiable {
    let id: String
    let name: String
    let subtitle: String?
    let status: DocumentStatus
    let iconName: String

    init(
        id: String,
        name: String,
        subtitle: String? = nil,
        status: DocumentStatus,
        iconName: String = "doc.fill"
    ) {
        self.id = id
        self.name = name
        self.subtitle = subtitle
        self.status = status
        self.iconName = iconName
    }
}

struct UserProfile: Equatable, Sendable {
    let id: String
    let fullName: String
    let phoneNumber: String
    let email: String?
    let nationality: String?
    let verificationStatus: VerificationStatus
    let completionPercentage: Int
    let jobTitle: String?
    let userId: String?
    let trustScore: String?
    let documents: [VerificationDocument]

    init(
        id: String,
        fullName: String,
        phoneNumber: String,
        email: String? = nil,
        nationality: String? = nil,
        verificationStatus: VerificationStatus = .unverified,
        completionPercentage: Int = 0,
        jobTitle: String? = nil,
        userId: String? = nil,
        trustScore: String? = nil,
        documents: [VerificationDocument] = []
    ) {
        self.id = id
        self.fullName = fullName
        self.phoneNumber = phoneNumber
        self.email = email
        self.nationality = nationality
        self.verificationStatus = verificationStatus
        self.completionPercentage = completionPercentage
        self.jobTitle = jobTitle
        self.userId = userId
        self.trustScore = trustScore
        self.documents = documents
    }
}

@MainActor
protocol ProfileServiceProtocol {
    func fetchProfile() async throws -> UserProfile
    func updateProfile(_ profile: UserProfile) async throws -> UserProfile
}
