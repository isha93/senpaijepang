package com.senpaij.jepang.features.profile.data

import com.google.gson.annotations.SerializedName
import com.senpaij.jepang.features.profile.domain.FinalVerificationRequest
import com.senpaij.jepang.features.profile.domain.FinalVerificationRequestResult
import com.senpaij.jepang.features.profile.domain.KycRawStatus
import com.senpaij.jepang.features.profile.domain.ProfileTrustScoreLabel
import com.senpaij.jepang.features.profile.domain.ProfileVerificationStatus
import com.senpaij.jepang.features.profile.domain.UserProfile
import com.senpaij.jepang.features.profile.domain.UserVerificationOverview
import com.senpaij.jepang.features.profile.domain.VerificationDocumentItem
import com.senpaij.jepang.features.profile.domain.VerificationDocumentStatus
import com.senpaij.jepang.features.profile.domain.VerificationDocumentsBundle
import com.senpaij.jepang.features.profile.domain.VerificationDocumentsSummary
import com.senpaij.jepang.features.profile.domain.VerificationSessionSummary

data class UpdateProfileRequestDto(
    @SerializedName("fullName")
    val fullName: String?,
    @SerializedName("avatarUrl")
    val avatarUrl: String?,
)

data class FinalVerificationRequestBodyDto(
    @SerializedName("source")
    val source: String?,
    @SerializedName("note")
    val note: String?,
)

data class ProfileResponseDto(
    @SerializedName("profile")
    val profile: UserProfileDto,
)

data class UserProfileDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("fullName")
    val fullName: String,
    @SerializedName("email")
    val email: String,
    @SerializedName("avatarUrl")
    val avatarUrl: String?,
    @SerializedName("profileCompletionPercent")
    val profileCompletionPercent: Int,
    @SerializedName("trustScoreLabel")
    val trustScoreLabel: String,
    @SerializedName("verificationStatus")
    val verificationStatus: String,
    @SerializedName("verification")
    val verification: UserVerificationOverviewDto,
)

data class UserVerificationOverviewDto(
    @SerializedName("sessionId")
    val sessionId: String?,
    @SerializedName("sessionStatus")
    val sessionStatus: String?,
    @SerializedName("trustStatus")
    val trustStatus: String,
    @SerializedName("documentsUploaded")
    val documentsUploaded: Int,
    @SerializedName("requiredDocuments")
    val requiredDocuments: Int,
    @SerializedName("requiredDocumentsUploaded")
    val requiredDocumentsUploaded: Int,
    @SerializedName("finalRequest")
    val finalRequest: FinalVerificationRequestDto?,
)

data class FinalVerificationRequestDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("sessionId")
    val sessionId: String?,
    @SerializedName("status")
    val status: String,
    @SerializedName("source")
    val source: String,
    @SerializedName("note")
    val note: String?,
    @SerializedName("requestedAt")
    val requestedAt: String,
    @SerializedName("documentsCount")
    val documentsCount: Int?,
)

data class VerificationSessionSummaryDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("status")
    val status: String,
    @SerializedName("trustStatus")
    val trustStatus: String,
    @SerializedName("submittedAt")
    val submittedAt: String?,
    @SerializedName("reviewedAt")
    val reviewedAt: String?,
    @SerializedName("updatedAt")
    val updatedAt: String,
)

data class VerificationDocumentItemDto(
    @SerializedName("documentType")
    val documentType: String,
    @SerializedName("status")
    val status: String,
    @SerializedName("required")
    val required: Boolean,
    @SerializedName("documentId")
    val documentId: String?,
    @SerializedName("objectKey")
    val objectKey: String?,
    @SerializedName("uploadedAt")
    val uploadedAt: String?,
    @SerializedName("reviewedAt")
    val reviewedAt: String?,
)

data class VerificationDocumentsSummaryDto(
    @SerializedName("requiredTotal")
    val requiredTotal: Int,
    @SerializedName("uploadedRequired")
    val uploadedRequired: Int,
    @SerializedName("verifiedRequired")
    val verifiedRequired: Int,
    @SerializedName("missingRequired")
    val missingRequired: Int,
    @SerializedName("allRequiredUploaded")
    val allRequiredUploaded: Boolean,
)

data class VerificationDocumentsResponseDto(
    @SerializedName("session")
    val session: VerificationSessionSummaryDto?,
    @SerializedName("documents")
    val documents: List<VerificationDocumentItemDto>,
    @SerializedName("summary")
    val summary: VerificationDocumentsSummaryDto,
)

data class FinalVerificationRequestResponseDto(
    @SerializedName("created")
    val created: Boolean,
    @SerializedName("request")
    val request: FinalVerificationRequestDto,
    @SerializedName("session")
    val session: VerificationSessionSummaryDto,
)

fun UserProfileDto.toDomain(): UserProfile {
    return UserProfile(
        id = id,
        fullName = fullName,
        email = email,
        avatarUrl = avatarUrl,
        profileCompletionPercent = profileCompletionPercent,
        trustScoreLabel = trustScoreLabel.toProfileTrustScoreLabel(),
        verificationStatus = verificationStatus.toProfileVerificationStatus(),
        verification = verification.toDomain(),
    )
}

fun VerificationDocumentsResponseDto.toDomain(): VerificationDocumentsBundle {
    return VerificationDocumentsBundle(
        session = session?.toDomain(),
        documents = documents.map { it.toDomain() },
        summary = summary.toDomain(),
    )
}

fun FinalVerificationRequestResponseDto.toDomain(): FinalVerificationRequestResult {
    return FinalVerificationRequestResult(
        created = created,
        request = request.toDomain(),
        session = session.toDomain(),
    )
}

private fun UserVerificationOverviewDto.toDomain(): UserVerificationOverview {
    return UserVerificationOverview(
        sessionId = sessionId,
        sessionStatus = sessionStatus?.toKycRawStatus(),
        trustStatus = trustStatus.toProfileVerificationStatus(),
        documentsUploaded = documentsUploaded,
        requiredDocuments = requiredDocuments,
        requiredDocumentsUploaded = requiredDocumentsUploaded,
        finalRequest = finalRequest?.toDomain(),
    )
}

private fun FinalVerificationRequestDto.toDomain(): FinalVerificationRequest {
    return FinalVerificationRequest(
        id = id,
        sessionId = sessionId,
        status = status,
        source = source,
        note = note,
        requestedAt = requestedAt,
        documentsCount = documentsCount,
    )
}

private fun VerificationSessionSummaryDto.toDomain(): VerificationSessionSummary {
    return VerificationSessionSummary(
        id = id,
        status = status.toKycRawStatus(),
        trustStatus = trustStatus.toProfileVerificationStatus(),
        submittedAt = submittedAt,
        reviewedAt = reviewedAt,
        updatedAt = updatedAt,
    )
}

private fun VerificationDocumentItemDto.toDomain(): VerificationDocumentItem {
    return VerificationDocumentItem(
        documentType = documentType,
        status = status.toVerificationDocumentStatus(),
        required = required,
        documentId = documentId,
        objectKey = objectKey,
        uploadedAt = uploadedAt,
        reviewedAt = reviewedAt,
    )
}

private fun VerificationDocumentsSummaryDto.toDomain(): VerificationDocumentsSummary {
    return VerificationDocumentsSummary(
        requiredTotal = requiredTotal,
        uploadedRequired = uploadedRequired,
        verifiedRequired = verifiedRequired,
        missingRequired = missingRequired,
        allRequiredUploaded = allRequiredUploaded,
    )
}

private fun String.toProfileVerificationStatus(): ProfileVerificationStatus {
    return when (this) {
        "IN_PROGRESS" -> ProfileVerificationStatus.IN_PROGRESS
        "MANUAL_REVIEW" -> ProfileVerificationStatus.MANUAL_REVIEW
        "VERIFIED" -> ProfileVerificationStatus.VERIFIED
        "REJECTED" -> ProfileVerificationStatus.REJECTED
        else -> ProfileVerificationStatus.NOT_STARTED
    }
}

private fun String.toProfileTrustScoreLabel(): ProfileTrustScoreLabel {
    return when (this) {
        "BUILDING_TRUST" -> ProfileTrustScoreLabel.BUILDING_TRUST
        "UNDER_REVIEW" -> ProfileTrustScoreLabel.UNDER_REVIEW
        "TRUSTED" -> ProfileTrustScoreLabel.TRUSTED
        "ACTION_REQUIRED" -> ProfileTrustScoreLabel.ACTION_REQUIRED
        else -> ProfileTrustScoreLabel.UNVERIFIED
    }
}

private fun String.toVerificationDocumentStatus(): VerificationDocumentStatus {
    return when (this) {
        "PENDING" -> VerificationDocumentStatus.PENDING
        "VERIFIED" -> VerificationDocumentStatus.VERIFIED
        "REJECTED" -> VerificationDocumentStatus.REJECTED
        else -> VerificationDocumentStatus.MISSING
    }
}

private fun String.toKycRawStatus(): KycRawStatus {
    return when (this) {
        "SUBMITTED" -> KycRawStatus.SUBMITTED
        "MANUAL_REVIEW" -> KycRawStatus.MANUAL_REVIEW
        "VERIFIED" -> KycRawStatus.VERIFIED
        "REJECTED" -> KycRawStatus.REJECTED
        else -> KycRawStatus.CREATED
    }
}
