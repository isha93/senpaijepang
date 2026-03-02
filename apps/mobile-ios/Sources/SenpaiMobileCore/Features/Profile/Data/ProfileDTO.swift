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
        let status = mapVerificationStatus(verificationStatus)
        return UserProfile(
            id: id,
            fullName: fullName,
            phoneNumber: "",
            email: email,
            nationality: nil,
            verificationStatus: status,
            completionPercentage: profileCompletionPercent,
            jobTitle: nil,
            userId: id,
            trustScore: trustScoreLabel.capitalized,
            documents: makeDocuments(sessionStatus: verification.sessionStatus, verificationStatus: status)
        )
    }

    private func makeDocuments(sessionStatus: String?, verificationStatus: VerificationStatus) -> [VerificationDocument] {
        let isVerified = verificationStatus == .verified
        let isPending = verificationStatus == .pending

        let passportStatus: DocumentStatus = isVerified ? .verified : (isPending ? .pendingReview : .upload)
        let selfieStatus: DocumentStatus = isVerified ? .verified : (isPending ? .pendingReview : .upload)

        var docs: [VerificationDocument] = [
            VerificationDocument(
                id: "doc-passport",
                name: "Passport",
                subtitle: isVerified ? nil : "Required for travel",
                status: passportStatus,
                iconName: "book.closed.fill"
            ),
            VerificationDocument(
                id: "doc-selfie",
                name: "Selfie Verification",
                subtitle: isVerified ? nil : "Required for identity",
                status: selfieStatus,
                iconName: "face.smiling.fill"
            )
        ]

        if verification.documentsUploaded > 2 || isVerified {
            docs.append(VerificationDocument(
                id: "doc-cv",
                name: "Curriculum Vitae (CV)",
                subtitle: isVerified ? nil : "Work experience",
                status: isVerified ? .verified : .pendingReview,
                iconName: "doc.text.fill"
            ))
        }

        return docs
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
    case "NOT_STARTED":  return .unverified
    case "IN_PROGRESS":  return .pending
    case "MANUAL_REVIEW": return .pending
    case "VERIFIED", "APPROVED": return .verified
    case "REJECTED":     return .rejected
    default:             return .unverified
    }
}
