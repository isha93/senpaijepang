import Foundation

public enum VerificationStatus: String, Sendable, Equatable {
    case unverified
    case pending
    case verified
    case rejected
}

public enum DocumentStatus: String, Sendable, Equatable {
    case verified
    case pendingReview = "pending_review"
    case upload
}

public struct VerificationDocument: Equatable, Sendable, Identifiable {
    public let id: String
    public let name: String
    public let subtitle: String?
    public let status: DocumentStatus
    public let iconName: String

    public init(
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

public struct UserProfile: Equatable, Sendable {
    public let id: String
    public let fullName: String
    public let phoneNumber: String
    public let email: String?
    public let nationality: String?
    public let verificationStatus: VerificationStatus
    public let completionPercentage: Int
    public let jobTitle: String?
    public let userId: String?
    public let trustScore: String?
    public let documents: [VerificationDocument]

    public init(
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
public protocol ProfileServiceProtocol {
    func fetchProfile() async throws -> UserProfile
    func updateProfile(_ profile: UserProfile) async throws -> UserProfile
}
