package com.senpaij.jepang.testutil

import com.senpaij.jepang.core.navigation.AppRoute
import com.senpaij.jepang.core.navigation.NavigationHandler
import com.senpaij.jepang.core.network.ApiResult
import com.senpaij.jepang.core.network.AppError
import com.senpaij.jepang.features.auth.domain.AuthService
import com.senpaij.jepang.features.auth.domain.AuthSession
import com.senpaij.jepang.features.auth.domain.AuthUser
import com.senpaij.jepang.features.auth.domain.LoginInput
import com.senpaij.jepang.features.auth.domain.RegisterInput
import com.senpaij.jepang.features.feed.domain.FeedPost
import com.senpaij.jepang.features.feed.domain.FeedService
import com.senpaij.jepang.features.feed.domain.FeedViewerState
import com.senpaij.jepang.features.jobs.domain.JobDetail
import com.senpaij.jepang.features.jobs.domain.JobDetailEnvelope
import com.senpaij.jepang.features.jobs.domain.JobEmployer
import com.senpaij.jepang.features.jobs.domain.JobEmploymentType
import com.senpaij.jepang.features.jobs.domain.JobLocationDetail
import com.senpaij.jepang.features.jobs.domain.JobLocationSummary
import com.senpaij.jepang.features.jobs.domain.JobService
import com.senpaij.jepang.features.jobs.domain.JobSummary
import com.senpaij.jepang.features.jobs.domain.JobViewerState
import com.senpaij.jepang.features.jobs.domain.ApplicationJourney
import com.senpaij.jepang.features.jobs.domain.ApplicationJourneyEvent
import com.senpaij.jepang.features.jobs.domain.ApplicationStatus
import com.senpaij.jepang.features.jobs.domain.JobApplicationSummary
import com.senpaij.jepang.features.jobs.domain.JobApplyResult
import com.senpaij.jepang.features.kyc.domain.KycDocument
import com.senpaij.jepang.features.kyc.domain.KycDocumentUploadResult
import com.senpaij.jepang.features.kyc.domain.KycHistoryResult
import com.senpaij.jepang.features.kyc.domain.KycService
import com.senpaij.jepang.features.kyc.domain.KycSession
import com.senpaij.jepang.features.kyc.domain.KycStatusEvent
import com.senpaij.jepang.features.kyc.domain.KycStatusSnapshot
import com.senpaij.jepang.features.kyc.domain.KycTrustStatus
import com.senpaij.jepang.features.kyc.domain.KycUploadUrlResult
import com.senpaij.jepang.features.kyc.domain.PresignedUpload
import com.senpaij.jepang.features.kyc.domain.KycRawStatus as KycFlowRawStatus
import com.senpaij.jepang.features.profile.domain.FinalVerificationRequest
import com.senpaij.jepang.features.profile.domain.FinalVerificationRequestResult
import com.senpaij.jepang.features.profile.domain.KycRawStatus
import com.senpaij.jepang.features.profile.domain.ProfileService
import com.senpaij.jepang.features.profile.domain.ProfileTrustScoreLabel
import com.senpaij.jepang.features.profile.domain.ProfileVerificationStatus
import com.senpaij.jepang.features.profile.domain.UserProfile
import com.senpaij.jepang.features.profile.domain.UserVerificationOverview
import com.senpaij.jepang.features.profile.domain.VerificationDocumentItem
import com.senpaij.jepang.features.profile.domain.VerificationDocumentStatus
import com.senpaij.jepang.features.profile.domain.VerificationDocumentsBundle
import com.senpaij.jepang.features.profile.domain.VerificationDocumentsSummary
import com.senpaij.jepang.features.profile.domain.VerificationSessionSummary

class FakeAuthService : AuthService {
    var hasSessionResult: Boolean = false
    var registerResult: ApiResult<AuthSession> = ApiResult.Failure(AppError.Validation("Not configured"))
    var loginResult: ApiResult<AuthSession> = ApiResult.Failure(AppError.Validation("Not configured"))
    var refreshResult: ApiResult<AuthSession> = ApiResult.Failure(AppError.Validation("Not configured"))
    var logoutResult: ApiResult<Unit> = ApiResult.Success(Unit)
    var meResult: ApiResult<AuthUser> = ApiResult.Failure(AppError.Validation("Not configured"))

    override suspend fun hasSession(): Boolean = hasSessionResult

    override suspend fun register(input: RegisterInput): ApiResult<AuthSession> = registerResult

    override suspend fun login(input: LoginInput): ApiResult<AuthSession> = loginResult

    override suspend fun refreshSession(): ApiResult<AuthSession> = refreshResult

    override suspend fun logout(): ApiResult<Unit> = logoutResult

    override suspend fun me(): ApiResult<AuthUser> = meResult
}

class RecordingNavigationHandler : NavigationHandler {
    val events: MutableList<String> = mutableListOf()

    override fun navigate(route: AppRoute) {
        events.add("navigate:${route.route}")
    }

    override fun replace(route: AppRoute) {
        events.add("replace:${route.route}")
    }

    override fun back() {
        events.add("back")
    }

    override fun popToRoot() {
        events.add("popToRoot")
    }
}

class FakeJobService : JobService {
    var listJobsResult: ApiResult<List<JobSummary>> = ApiResult.Success(emptyList())
    var detailResult: ApiResult<JobDetailEnvelope> = ApiResult.Failure(AppError.Validation("Not configured"))
    var savedJobsResult: ApiResult<List<JobSummary>> = ApiResult.Success(emptyList())
    var saveResult: ApiResult<Boolean> = ApiResult.Success(true)
    var unsaveResult: ApiResult<Boolean> = ApiResult.Success(false)
    var applyResult: ApiResult<JobApplyResult> = ApiResult.Success(
        JobApplyResult(
            created = true,
            application = sampleApplicationSummary(),
        ),
    )
    var listApplicationsResult: ApiResult<List<JobApplicationSummary>> = ApiResult.Success(emptyList())
    var journeyResult: ApiResult<ApplicationJourney> = ApiResult.Success(sampleApplicationJourney())

    override suspend fun listJobs(query: String?): ApiResult<List<JobSummary>> = listJobsResult

    override suspend fun getJobDetail(jobId: String): ApiResult<JobDetailEnvelope> = detailResult

    override suspend fun listSavedJobs(): ApiResult<List<JobSummary>> = savedJobsResult

    override suspend fun saveJob(jobId: String): ApiResult<Boolean> = saveResult

    override suspend fun unsaveJob(jobId: String): ApiResult<Boolean> = unsaveResult

    override suspend fun applyToJob(jobId: String, note: String?): ApiResult<JobApplyResult> = applyResult

    override suspend fun listApplications(): ApiResult<List<JobApplicationSummary>> = listApplicationsResult

    override suspend fun getApplicationJourney(applicationId: String): ApiResult<ApplicationJourney> = journeyResult
}

class FakeFeedService : FeedService {
    var feedPostsResult: ApiResult<List<FeedPost>> = ApiResult.Success(emptyList())
    var savedPostsResult: ApiResult<List<FeedPost>> = ApiResult.Success(emptyList())
    var savePostResult: ApiResult<Boolean> = ApiResult.Success(true)
    var unsavePostResult: ApiResult<Boolean> = ApiResult.Success(false)

    override suspend fun listFeedPosts(query: String?, category: String?): ApiResult<List<FeedPost>> =
        feedPostsResult

    override suspend fun listSavedPosts(): ApiResult<List<FeedPost>> = savedPostsResult

    override suspend fun savePost(postId: String): ApiResult<Boolean> = savePostResult

    override suspend fun unsavePost(postId: String): ApiResult<Boolean> = unsavePostResult
}

class FakeKycService : KycService {
    var statusResult: ApiResult<KycStatusSnapshot> = ApiResult.Success(sampleKycStatusSnapshot())
    var startSessionResult: ApiResult<KycStatusSnapshot> = ApiResult.Success(sampleKycStatusSnapshot())
    var uploadUrlResult: ApiResult<KycUploadUrlResult> = ApiResult.Success(sampleKycUploadUrlResult())
    var uploadDocumentResult: ApiResult<KycDocumentUploadResult> =
        ApiResult.Success(sampleKycDocumentUploadResult())
    var submitSessionResult: ApiResult<KycStatusSnapshot> = ApiResult.Success(
        sampleKycStatusSnapshot(
            trustStatus = KycTrustStatus.MANUAL_REVIEW,
            rawStatus = KycFlowRawStatus.SUBMITTED,
        ),
    )
    var historyResult: ApiResult<KycHistoryResult> = ApiResult.Success(sampleKycHistoryResult())

    override suspend fun getStatus(): ApiResult<KycStatusSnapshot> = statusResult

    override suspend fun startSession(provider: String?): ApiResult<KycStatusSnapshot> = startSessionResult

    override suspend fun requestUploadUrl(
        sessionId: String?,
        documentType: String,
        fileName: String,
        contentType: String,
        contentLength: Int,
        checksumSha256: String,
    ): ApiResult<KycUploadUrlResult> = uploadUrlResult

    override suspend fun uploadDocumentMetadata(
        sessionId: String?,
        documentType: String,
        objectKey: String,
        checksumSha256: String,
        metadata: Map<String, Any?>,
    ): ApiResult<KycDocumentUploadResult> = uploadDocumentResult

    override suspend fun submitSession(sessionId: String): ApiResult<KycStatusSnapshot> = submitSessionResult

    override suspend fun getHistory(sessionId: String?): ApiResult<KycHistoryResult> = historyResult
}

class FakeProfileService : ProfileService {
    var getProfileResult: ApiResult<UserProfile> = ApiResult.Success(sampleUserProfile())
    var updateProfileResult: ApiResult<UserProfile> = ApiResult.Success(sampleUserProfile())
    var verificationDocumentsResult: ApiResult<VerificationDocumentsBundle> =
        ApiResult.Success(sampleVerificationDocumentsBundle())
    var submitFinalRequestResult: ApiResult<FinalVerificationRequestResult> =
        ApiResult.Success(sampleFinalVerificationRequestResult(created = true))

    override suspend fun getProfile(): ApiResult<UserProfile> = getProfileResult

    override suspend fun updateProfile(fullName: String?, avatarUrl: String?): ApiResult<UserProfile> =
        updateProfileResult

    override suspend fun getVerificationDocuments(): ApiResult<VerificationDocumentsBundle> =
        verificationDocumentsResult

    override suspend fun submitFinalVerificationRequest(
        source: String?,
        note: String?,
    ): ApiResult<FinalVerificationRequestResult> = submitFinalRequestResult
}

fun sampleAuthSession(): AuthSession {
    return AuthSession(
        user = AuthUser(
            id = "user-1",
            fullName = "Test User",
            email = "test@example.com",
            roles = listOf("sdm"),
        ),
        accessToken = "access-token",
        refreshToken = "refresh-token",
    )
}

fun sampleAuthUser(): AuthUser {
    return AuthUser(
        id = "user-1",
        fullName = "Test User",
        email = "test@example.com",
        roles = listOf("sdm"),
    )
}

fun sampleJobSummary(saved: Boolean = false): JobSummary {
    return JobSummary(
        id = "job-1",
        title = "Senior Welder",
        employmentType = JobEmploymentType.FULL_TIME,
        visaSponsorship = true,
        location = JobLocationSummary(
            countryCode = "JP",
            city = "Tokyo",
            displayLabel = "Tokyo, JP",
        ),
        employer = JobEmployer(
            id = "emp-1",
            name = "Tokyo Construction Co.",
            logoUrl = null,
            isVerifiedEmployer = true,
        ),
        viewerState = JobViewerState(
            authenticated = true,
            saved = saved,
            canApply = true,
            applyCta = "APPLY",
        ),
    )
}

fun sampleJobDetailEnvelope(saved: Boolean = false): JobDetailEnvelope {
    return JobDetailEnvelope(
        job = JobDetail(
            id = "job-1",
            title = "Senior Welder",
            employmentType = JobEmploymentType.FULL_TIME,
            visaSponsorship = true,
            description = "Detail description",
            requirements = listOf("Requirement 1", "Requirement 2"),
            location = JobLocationDetail(
                countryCode = "JP",
                city = "Tokyo",
                displayLabel = "Tokyo, JP",
                latitude = 35.6762,
                longitude = 139.6503,
            ),
            employer = JobEmployer(
                id = "emp-1",
                name = "Tokyo Construction Co.",
                logoUrl = null,
                isVerifiedEmployer = true,
            ),
        ),
        viewerState = JobViewerState(
            authenticated = true,
            saved = saved,
            canApply = true,
            applyCta = "APPLY",
        ),
    )
}

fun sampleApplicationSummary(): JobApplicationSummary {
    return JobApplicationSummary(
        id = "app-1",
        jobId = "job-1",
        status = ApplicationStatus.SUBMITTED,
        note = null,
        createdAt = "2026-03-05T10:00:00Z",
        updatedAt = "2026-03-05T10:00:00Z",
        job = sampleJobSummary(saved = true),
    )
}

fun sampleApplicationJourney(): ApplicationJourney {
    return ApplicationJourney(
        application = sampleApplicationSummary(),
        journey = listOf(
            ApplicationJourneyEvent(
                id = "event-1",
                status = ApplicationStatus.SUBMITTED,
                title = "Application Submitted",
                description = "Your application has been submitted.",
                createdAt = "2026-03-05T10:00:00Z",
            ),
        ),
    )
}

fun sampleFeedPost(saved: Boolean = false): FeedPost {
    return FeedPost(
        id = "post-1",
        title = "Cara Adaptasi Kerja di Jepang",
        excerpt = "Panduan singkat untuk pekerja migran baru di Jepang.",
        category = "Tips Kerja",
        author = "Senpai Editorial",
        imageUrl = null,
        publishedAt = "2026-03-05T10:00:00Z",
        viewerState = FeedViewerState(
            authenticated = true,
            saved = saved,
        ),
    )
}

fun sampleKycSession(rawStatus: KycFlowRawStatus = KycFlowRawStatus.CREATED): KycSession {
    return KycSession(
        id = "kyc-session-1",
        status = rawStatus,
        provider = "manual",
        providerRef = null,
        providerMetadata = emptyMap(),
        submittedAt = null,
        reviewedBy = null,
        reviewedAt = null,
        createdAt = "2026-03-05T11:00:00Z",
        updatedAt = "2026-03-05T11:00:00Z",
    )
}

fun sampleKycStatusSnapshot(
    trustStatus: KycTrustStatus = KycTrustStatus.IN_PROGRESS,
    rawStatus: KycFlowRawStatus = KycFlowRawStatus.CREATED,
): KycStatusSnapshot {
    return KycStatusSnapshot(
        status = trustStatus,
        session = sampleKycSession(rawStatus = rawStatus),
    )
}

fun sampleKycUploadUrlResult(): KycUploadUrlResult {
    return KycUploadUrlResult(
        status = KycTrustStatus.IN_PROGRESS,
        session = sampleKycSession(),
        upload = PresignedUpload(
            objectKey = "kyc/user-1/kyc-session-1/passport-front.jpg",
            uploadUrl = "https://upload.example.test/kyc-session-1",
            method = "PUT",
            headers = mapOf("Content-Type" to "image/jpeg"),
            expiresAt = "2026-03-05T11:10:00Z",
        ),
    )
}

fun sampleKycDocumentUploadResult(): KycDocumentUploadResult {
    return KycDocumentUploadResult(
        status = KycTrustStatus.IN_PROGRESS,
        session = sampleKycSession(),
        document = KycDocument(
            id = "kyc-doc-1",
            kycSessionId = "kyc-session-1",
            documentType = "PASSPORT",
            objectKey = "kyc/user-1/kyc-session-1/passport-front.jpg",
            fileUrl = "https://storage.example.test/kyc-doc-1",
            checksumSha256 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            metadata = mapOf("source" to "android-app"),
            verifiedAt = null,
            createdAt = "2026-03-05T11:02:00Z",
        ),
    )
}

fun sampleKycHistoryResult(): KycHistoryResult {
    return KycHistoryResult(
        session = sampleKycSession(),
        events = listOf(
            KycStatusEvent(
                id = "kyc-event-1",
                kycSessionId = "kyc-session-1",
                fromStatus = null,
                toStatus = KycFlowRawStatus.CREATED,
                actorType = "USER",
                actorId = "user-1",
                reason = null,
                createdAt = "2026-03-05T11:00:00Z",
            ),
        ),
    )
}

fun sampleFinalVerificationRequest(): FinalVerificationRequest {
    return FinalVerificationRequest(
        id = "final-req-1",
        sessionId = "session-1",
        status = "REQUESTED",
        source = "android-app",
        note = "Please review",
        requestedAt = "2026-03-05T10:20:00Z",
        documentsCount = 2,
    )
}

fun sampleVerificationSessionSummary(
    status: KycRawStatus = KycRawStatus.CREATED,
    trustStatus: ProfileVerificationStatus = ProfileVerificationStatus.IN_PROGRESS,
): VerificationSessionSummary {
    return VerificationSessionSummary(
        id = "session-1",
        status = status,
        trustStatus = trustStatus,
        submittedAt = "2026-03-05T10:10:00Z",
        reviewedAt = null,
        updatedAt = "2026-03-05T10:10:00Z",
    )
}

fun sampleVerificationDocumentsBundle(): VerificationDocumentsBundle {
    return VerificationDocumentsBundle(
        session = sampleVerificationSessionSummary(),
        documents = listOf(
            VerificationDocumentItem(
                documentType = "PASSPORT",
                status = VerificationDocumentStatus.PENDING,
                required = true,
                documentId = "doc-1",
                objectKey = "kyc/user-1/session-1/passport.jpg",
                uploadedAt = "2026-03-05T10:05:00Z",
                reviewedAt = null,
            ),
            VerificationDocumentItem(
                documentType = "SELFIE",
                status = VerificationDocumentStatus.MISSING,
                required = true,
                documentId = null,
                objectKey = null,
                uploadedAt = null,
                reviewedAt = null,
            ),
        ),
        summary = VerificationDocumentsSummary(
            requiredTotal = 2,
            uploadedRequired = 1,
            verifiedRequired = 0,
            missingRequired = 1,
            allRequiredUploaded = false,
        ),
    )
}

fun sampleUserProfile(
    fullName: String = "Test User",
    finalRequest: FinalVerificationRequest? = null,
): UserProfile {
    return UserProfile(
        id = "user-1",
        fullName = fullName,
        email = "test@example.com",
        avatarUrl = null,
        profileCompletionPercent = 80,
        trustScoreLabel = ProfileTrustScoreLabel.BUILDING_TRUST,
        verificationStatus = ProfileVerificationStatus.IN_PROGRESS,
        verification = UserVerificationOverview(
            sessionId = "session-1",
            sessionStatus = KycRawStatus.CREATED,
            trustStatus = ProfileVerificationStatus.IN_PROGRESS,
            documentsUploaded = 1,
            requiredDocuments = 2,
            requiredDocumentsUploaded = 1,
            finalRequest = finalRequest,
        ),
    )
}

fun sampleFinalVerificationRequestResult(created: Boolean): FinalVerificationRequestResult {
    return FinalVerificationRequestResult(
        created = created,
        request = sampleFinalVerificationRequest(),
        session = sampleVerificationSessionSummary(
            status = KycRawStatus.SUBMITTED,
            trustStatus = ProfileVerificationStatus.MANUAL_REVIEW,
        ),
    )
}
