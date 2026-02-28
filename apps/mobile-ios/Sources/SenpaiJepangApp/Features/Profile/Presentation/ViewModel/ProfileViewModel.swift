import Combine
import Foundation

@MainActor
final class ProfileViewModel: ObservableObject, ManagedTask {
    @Published var profile: UserProfile?
    @Published var isLoading: Bool
    @Published var errorMessage: String?

    private let profileService: ProfileServiceProtocol
    private let navigation: NavigationHandling

    init(
        profileService: ProfileServiceProtocol,
        navigation: NavigationHandling
    ) {
        self.profileService = profileService
        self.navigation = navigation
        self.profile = nil
        self.isLoading = false
        self.errorMessage = nil
    }

    func loadProfile() async {
        if let result = await executeTask({
            try await self.profileService.fetchProfile()
        }) {
            profile = result
        } else {
            profile = Self.mockProfile
        }
    }

    func requestVerification() {
        // Will integrate with API later
    }

    // MARK: - Mock Data
    static let mockProfile = UserProfile(
        id: "user-001",
        fullName: "Budi Santoso",
        phoneNumber: "+62 812-3456-7890",
        email: "budi.s@email.com",
        nationality: "Indonesia",
        verificationStatus: .verified,
        completionPercentage: 70,
        jobTitle: "Construction Worker",
        userId: "#839210",
        trustScore: "High",
        documents: [
            VerificationDocument(
                id: "doc-1",
                name: "National ID (KTP)",
                subtitle: "Verified",
                status: .verified,
                iconName: "person.text.rectangle.fill"
            ),
            VerificationDocument(
                id: "doc-2",
                name: "Selfie Verification",
                subtitle: "Pending Review",
                status: .pendingReview,
                iconName: "face.smiling.fill"
            ),
            VerificationDocument(
                id: "doc-3",
                name: "Passport",
                subtitle: "Required for travel",
                status: .upload,
                iconName: "book.closed.fill"
            ),
            VerificationDocument(
                id: "doc-4",
                name: "Skill Certificate",
                subtitle: "Tokutei Ginou / SSW",
                status: .upload,
                iconName: "gearshape.2.fill"
            ),
        ]
    )
}
