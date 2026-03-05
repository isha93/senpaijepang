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
