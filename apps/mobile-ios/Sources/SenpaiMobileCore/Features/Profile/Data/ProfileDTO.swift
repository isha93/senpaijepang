import Foundation

// MARK: - Fetch / Update response

struct ProfileResponseDTO: Decodable {
    let profile: ProfileDataDTO
}

struct ProfileDataDTO: Decodable {
    let id: String
    let fullName: String
    let email: String
    let avatarUrl: String?
    let profileCompletionPercent: Int
    let trustScoreLabel: String
    let verificationStatus: String
    let verification: ProfileVerificationDTO

    func toUserProfile() -> UserProfile {
        UserProfile(
            id: id,
            fullName: fullName,
            phoneNumber: "",
            email: email,
            nationality: nil,
            verificationStatus: mapVerificationStatus(verificationStatus),
            completionPercentage: profileCompletionPercent,
            jobTitle: nil,
            userId: id,
            trustScore: trustScoreLabel.capitalized,
            documents: []
        )
    }
}

struct ProfileVerificationDTO: Decodable {
    let sessionId: String?
    let sessionStatus: String?
    let trustStatus: String
    let documentsUploaded: Int
    let requiredDocuments: Int
    let requiredDocumentsUploaded: Int
}

// MARK: - Helpers

private func mapVerificationStatus(_ raw: String) -> VerificationStatus {
    switch raw.uppercased() {
    case "NOT_STARTED": return .unverified
    case "IN_PROGRESS": return .pending
    case "APPROVED":    return .verified
    case "REJECTED":    return .rejected
    default:            return .unverified
    }
}
