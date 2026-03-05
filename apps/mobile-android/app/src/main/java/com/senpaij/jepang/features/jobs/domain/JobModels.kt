package com.senpaij.jepang.features.jobs.domain

enum class JobEmploymentType {
    FULL_TIME,
    PART_TIME,
    CONTRACT,
}

data class JobViewerState(
    val authenticated: Boolean,
    val saved: Boolean,
    val canApply: Boolean,
    val applyCta: String,
)

data class JobEmployer(
    val id: String,
    val name: String,
    val logoUrl: String?,
    val isVerifiedEmployer: Boolean,
)

data class JobLocationSummary(
    val countryCode: String,
    val city: String,
    val displayLabel: String,
)

data class JobLocationDetail(
    val countryCode: String,
    val city: String,
    val displayLabel: String,
    val latitude: Double,
    val longitude: Double,
)

data class JobSummary(
    val id: String,
    val title: String,
    val employmentType: JobEmploymentType,
    val visaSponsorship: Boolean,
    val location: JobLocationSummary,
    val employer: JobEmployer,
    val viewerState: JobViewerState,
)

data class JobDetail(
    val id: String,
    val title: String,
    val employmentType: JobEmploymentType,
    val visaSponsorship: Boolean,
    val description: String,
    val requirements: List<String>,
    val location: JobLocationDetail,
    val employer: JobEmployer,
)

data class JobDetailEnvelope(
    val job: JobDetail,
    val viewerState: JobViewerState,
)

enum class ApplicationStatus {
    SUBMITTED,
    IN_REVIEW,
    INTERVIEW,
    OFFERED,
    HIRED,
    REJECTED,
}

data class JobApplicationSummary(
    val id: String,
    val jobId: String,
    val status: ApplicationStatus,
    val note: String?,
    val createdAt: String,
    val updatedAt: String,
    val job: JobSummary,
)

data class ApplicationJourneyEvent(
    val id: String,
    val status: ApplicationStatus,
    val title: String,
    val description: String,
    val createdAt: String,
)

data class ApplicationJourney(
    val application: JobApplicationSummary,
    val journey: List<ApplicationJourneyEvent>,
)

data class JobApplyResult(
    val created: Boolean,
    val application: JobApplicationSummary,
)
