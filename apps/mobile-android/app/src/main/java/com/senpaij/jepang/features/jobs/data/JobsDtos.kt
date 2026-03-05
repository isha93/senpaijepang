package com.senpaij.jepang.features.jobs.data

import com.google.gson.annotations.SerializedName
import com.senpaij.jepang.features.jobs.domain.ApplicationJourney
import com.senpaij.jepang.features.jobs.domain.ApplicationJourneyEvent
import com.senpaij.jepang.features.jobs.domain.ApplicationStatus
import com.senpaij.jepang.features.jobs.domain.JobApplyResult
import com.senpaij.jepang.features.jobs.domain.JobApplicationSummary
import com.senpaij.jepang.features.jobs.domain.JobDetail
import com.senpaij.jepang.features.jobs.domain.JobDetailEnvelope
import com.senpaij.jepang.features.jobs.domain.JobEmployer
import com.senpaij.jepang.features.jobs.domain.JobEmploymentType
import com.senpaij.jepang.features.jobs.domain.JobLocationDetail
import com.senpaij.jepang.features.jobs.domain.JobLocationSummary
import com.senpaij.jepang.features.jobs.domain.JobSummary
import com.senpaij.jepang.features.jobs.domain.JobViewerState

data class JobViewerStateDto(
    @SerializedName("authenticated")
    val authenticated: Boolean,
    @SerializedName("saved")
    val saved: Boolean,
    @SerializedName("canApply")
    val canApply: Boolean,
    @SerializedName("applyCta")
    val applyCta: String,
)

data class JobEmployerDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("name")
    val name: String,
    @SerializedName("logoUrl")
    val logoUrl: String?,
    @SerializedName("isVerifiedEmployer")
    val isVerifiedEmployer: Boolean,
)

data class JobLocationSummaryDto(
    @SerializedName("countryCode")
    val countryCode: String,
    @SerializedName("city")
    val city: String,
    @SerializedName("displayLabel")
    val displayLabel: String,
)

data class JobLocationDetailDto(
    @SerializedName("countryCode")
    val countryCode: String,
    @SerializedName("city")
    val city: String,
    @SerializedName("displayLabel")
    val displayLabel: String,
    @SerializedName("latitude")
    val latitude: Double,
    @SerializedName("longitude")
    val longitude: Double,
)

data class JobSummaryDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("title")
    val title: String,
    @SerializedName("employmentType")
    val employmentType: String,
    @SerializedName("visaSponsorship")
    val visaSponsorship: Boolean,
    @SerializedName("location")
    val location: JobLocationSummaryDto,
    @SerializedName("employer")
    val employer: JobEmployerDto,
    @SerializedName("viewerState")
    val viewerState: JobViewerStateDto,
)

data class JobDetailDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("title")
    val title: String,
    @SerializedName("employmentType")
    val employmentType: String,
    @SerializedName("visaSponsorship")
    val visaSponsorship: Boolean,
    @SerializedName("description")
    val description: String,
    @SerializedName("requirements")
    val requirements: List<String>,
    @SerializedName("location")
    val location: JobLocationDetailDto,
    @SerializedName("employer")
    val employer: JobEmployerDto,
)

data class JobListResponseDto(
    @SerializedName("items")
    val items: List<JobSummaryDto>,
)

data class JobDetailResponseDto(
    @SerializedName("job")
    val job: JobDetailDto,
    @SerializedName("viewerState")
    val viewerState: JobViewerStateDto,
)

data class SaveJobRequestDto(
    @SerializedName("jobId")
    val jobId: String,
)

data class SaveJobResponseDto(
    @SerializedName("saved")
    val saved: Boolean,
)

data class JobApplyRequestDto(
    @SerializedName("note")
    val note: String?,
)

data class JobApplyResponseDto(
    @SerializedName("created")
    val created: Boolean,
    @SerializedName("application")
    val application: JobApplicationSummaryDto,
)

data class ApplicationListResponseDto(
    @SerializedName("items")
    val items: List<JobApplicationSummaryDto>,
)

data class ApplicationJourneyEventDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("status")
    val status: String,
    @SerializedName("title")
    val title: String,
    @SerializedName("description")
    val description: String,
    @SerializedName("createdAt")
    val createdAt: String,
)

data class ApplicationJourneyResponseDto(
    @SerializedName("application")
    val application: JobApplicationSummaryDto,
    @SerializedName("journey")
    val journey: List<ApplicationJourneyEventDto>,
)

data class JobApplicationSummaryDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("jobId")
    val jobId: String,
    @SerializedName("status")
    val status: String,
    @SerializedName("note")
    val note: String?,
    @SerializedName("createdAt")
    val createdAt: String,
    @SerializedName("updatedAt")
    val updatedAt: String,
    @SerializedName("job")
    val job: JobApplicationJobDto,
)

data class JobApplicationJobDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("title")
    val title: String,
    @SerializedName("employmentType")
    val employmentType: String,
    @SerializedName("visaSponsorship")
    val visaSponsorship: Boolean,
    @SerializedName("location")
    val location: JobLocationSummaryDto,
    @SerializedName("employer")
    val employer: JobEmployerDto,
)

fun JobSummaryDto.toDomain(): JobSummary {
    return JobSummary(
        id = id,
        title = title,
        employmentType = employmentType.toEmploymentType(),
        visaSponsorship = visaSponsorship,
        location = location.toDomain(),
        employer = employer.toDomain(),
        viewerState = viewerState.toDomain(),
    )
}

fun JobDetailResponseDto.toDomain(): JobDetailEnvelope {
    return JobDetailEnvelope(
        job = job.toDomain(),
        viewerState = viewerState.toDomain(),
    )
}

fun JobApplyResponseDto.toDomain(): JobApplyResult {
    return JobApplyResult(
        created = created,
        application = application.toDomain(),
    )
}

fun ApplicationJourneyResponseDto.toDomain(): ApplicationJourney {
    return ApplicationJourney(
        application = application.toDomain(),
        journey = journey.map { it.toDomain() },
    )
}

fun JobApplicationSummaryDto.toDomain(): JobApplicationSummary {
    return JobApplicationSummary(
        id = id,
        jobId = jobId,
        status = status.toApplicationStatus(),
        note = note,
        createdAt = createdAt,
        updatedAt = updatedAt,
        job = job.toSummaryDomain(),
    )
}

private fun JobApplicationJobDto.toSummaryDomain(): JobSummary {
    return JobSummary(
        id = id,
        title = title,
        employmentType = employmentType.toEmploymentType(),
        visaSponsorship = visaSponsorship,
        location = location.toDomain(),
        employer = employer.toDomain(),
        viewerState = JobViewerState(
            authenticated = true,
            saved = false,
            canApply = false,
            applyCta = "APPLY",
        ),
    )
}

private fun ApplicationJourneyEventDto.toDomain(): ApplicationJourneyEvent {
    return ApplicationJourneyEvent(
        id = id,
        status = status.toApplicationStatus(),
        title = title,
        description = description,
        createdAt = createdAt,
    )
}

private fun JobDetailDto.toDomain(): JobDetail {
    return JobDetail(
        id = id,
        title = title,
        employmentType = employmentType.toEmploymentType(),
        visaSponsorship = visaSponsorship,
        description = description,
        requirements = requirements,
        location = location.toDomain(),
        employer = employer.toDomain(),
    )
}

private fun JobLocationSummaryDto.toDomain(): JobLocationSummary {
    return JobLocationSummary(
        countryCode = countryCode,
        city = city,
        displayLabel = displayLabel,
    )
}

private fun JobLocationDetailDto.toDomain(): JobLocationDetail {
    return JobLocationDetail(
        countryCode = countryCode,
        city = city,
        displayLabel = displayLabel,
        latitude = latitude,
        longitude = longitude,
    )
}

private fun JobEmployerDto.toDomain(): JobEmployer {
    return JobEmployer(
        id = id,
        name = name,
        logoUrl = logoUrl,
        isVerifiedEmployer = isVerifiedEmployer,
    )
}

private fun JobViewerStateDto.toDomain(): JobViewerState {
    return JobViewerState(
        authenticated = authenticated,
        saved = saved,
        canApply = canApply,
        applyCta = applyCta,
    )
}

private fun String.toEmploymentType(): JobEmploymentType {
    return when (this) {
        "FULL_TIME" -> JobEmploymentType.FULL_TIME
        "PART_TIME" -> JobEmploymentType.PART_TIME
        "CONTRACT" -> JobEmploymentType.CONTRACT
        else -> JobEmploymentType.FULL_TIME
    }
}

private fun String.toApplicationStatus(): ApplicationStatus {
    return when (this) {
        "SUBMITTED" -> ApplicationStatus.SUBMITTED
        "IN_REVIEW" -> ApplicationStatus.IN_REVIEW
        "INTERVIEW" -> ApplicationStatus.INTERVIEW
        "OFFERED" -> ApplicationStatus.OFFERED
        "HIRED" -> ApplicationStatus.HIRED
        "REJECTED" -> ApplicationStatus.REJECTED
        else -> ApplicationStatus.SUBMITTED
    }
}
