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
            profile = nil
        }
    }

    func requestVerification() {
        navigation.push(.kycVerification)
    }

    func navigateToSettings() {
        navigation.push(.settings)
    }

    // MARK: - Offline fallback (mirrors real Budi Santoso demo account)
    static let mockProfile = UserProfile(
        id: "15d9b1d1-46b7-44cc-9f01-537a4a4c41e9",
        fullName: "Budi Santoso",
        phoneNumber: "",
        email: "demo@senpaijepang.com",
        nationality: nil,
        verificationStatus: .verified,
        completionPercentage: 100,
        jobTitle: nil,
        userId: "15d9b1d1-46b7-44cc-9f01-537a4a4c41e9",
        trustScore: "Trusted",
        documents: [
            VerificationDocument(
                id: "doc-passport",
                name: "Passport",
                status: .verified,
                iconName: "book.closed.fill"
            ),
            VerificationDocument(
                id: "doc-selfie",
                name: "Selfie Verification",
                status: .verified,
                iconName: "face.smiling.fill"
            ),
            VerificationDocument(
                id: "doc-cv",
                name: "Curriculum Vitae (CV)",
                status: .verified,
                iconName: "doc.text.fill"
            ),
        ]
    )
}
