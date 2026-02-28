import SwiftUI

@main
struct SenpaiJepangApp: App {
    var body: some Scene {
        WindowGroup {
            AppRootView(
                authService: AuthService { _, _ in
                    AuthSession(accessToken: "demo", refreshToken: "demo")
                },
                jobService: JobService(
                    fetchJobsHandler: { [] },
                    fetchJobDetailHandler: { _ in
                        JobDetail(
                            job: Job(id: "0", title: "", companyName: "", location: ""),
                            description: ""
                        )
                    },
                    toggleSaveHandler: { id in
                        Job(id: id, title: "", companyName: "", location: "")
                    },
                    fetchSavedJobsHandler: { [] }
                ),
                journeyService: JourneyService(
                    applyHandler: { id in
                        ApplicationJourney(
                            applicationId: id,
                            jobTitle: "",
                            companyName: "",
                            currentStatus: .applied,
                            steps: []
                        )
                    },
                    fetchHandler: { id in
                        ApplicationJourney(
                            applicationId: id,
                            jobTitle: "",
                            companyName: "",
                            currentStatus: .applied,
                            steps: []
                        )
                    }
                ),
                profileService: ProfileService(
                    fetchHandler: {
                        UserProfile(id: "0", fullName: "Demo", phoneNumber: "0000")
                    },
                    updateHandler: { $0 }
                ),
                feedService: FeedService(
                    fetchHandler: { [] },
                    toggleSaveHandler: { id in
                        FeedPost(id: id, authorName: "", content: "", createdAt: .now)
                    }
                )
            )
        }
    }
}
