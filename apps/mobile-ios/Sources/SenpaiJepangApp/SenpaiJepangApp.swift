import SwiftUI

private enum MockError: Error {
    case notImplemented
}

@main
struct SenpaiJepangApp: App {
    var body: some Scene {
        WindowGroup {
            AppRootView(
                authService: AuthService { _, _ in
                    AuthSession(accessToken: "demo", refreshToken: "demo")
                },
                jobService: JobService(
                    fetchJobsHandler: { throw MockError.notImplemented },
                    fetchJobDetailHandler: { _ in throw MockError.notImplemented },
                    toggleSaveHandler: { id in
                        // Toggle save: find the job and flip isSaved
                        if let job = JobsListViewModel.mockJobs.first(where: { $0.id == id }) {
                            return Job(
                                id: job.id,
                                title: job.title,
                                companyName: job.companyName,
                                location: job.location,
                                salaryRange: job.salaryRange,
                                isSaved: !job.isSaved,
                                sector: job.sector,
                                postedAt: job.postedAt,
                                companyLogoInitial: job.companyLogoInitial,
                                isVerifiedEmployer: job.isVerifiedEmployer
                            )
                        }
                        return Job(id: id, title: "", companyName: "", location: "", isSaved: true)
                    },
                    fetchSavedJobsHandler: {
                        JobsListViewModel.mockJobs.filter { $0.isSaved }
                    }
                ),
                journeyService: JourneyService(
                    applyHandler: { _ in throw MockError.notImplemented },
                    fetchHandler: { _ in throw MockError.notImplemented }
                ),
                profileService: ProfileService(
                    fetchHandler: { throw MockError.notImplemented },
                    updateHandler: { $0 }
                ),
                feedService: FeedService(
                    fetchHandler: { throw MockError.notImplemented },
                    toggleSaveHandler: { id in
                        if let post = FeedListViewModel.mockPosts.first(where: { $0.id == id }) {
                            return FeedPost(
                                id: post.id,
                                authorName: post.authorName,
                                content: post.content,
                                createdAt: post.createdAt,
                                isSaved: !post.isSaved,
                                title: post.title,
                                category: post.category,
                                source: post.source
                            )
                        }
                        return FeedPost(id: id, authorName: "", content: "", createdAt: .now, isSaved: true)
                    }
                )
            )
        }
    }
}
