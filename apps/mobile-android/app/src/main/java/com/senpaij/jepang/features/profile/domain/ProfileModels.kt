package com.senpaij.jepang.features.profile.domain

enum class ProfileVerificationStatus {
    NOT_STARTED,
    IN_PROGRESS,
    MANUAL_REVIEW,
    VERIFIED,
    REJECTED,
}

enum class ProfileTrustScoreLabel {
    UNVERIFIED,
    BUILDING_TRUST,
    UNDER_REVIEW,
    TRUSTED,
    ACTION_REQUIRED,
}

enum class VerificationDocumentStatus {
    MISSING,
    PENDING,
    VERIFIED,
    REJECTED,
}

enum class KycRawStatus {
    CREATED,
    SUBMITTED,
    MANUAL_REVIEW,
    VERIFIED,
    REJECTED,
}

data class FinalVerificationRequest(
    val id: String,
    val sessionId: String?,
    val status: String,
    val source: String,
    val note: String?,
    val requestedAt: String,
    val documentsCount: Int?,
)

data class VerificationSessionSummary(
    val id: String,
    val status: KycRawStatus,
    val trustStatus: ProfileVerificationStatus,
    val submittedAt: String?,
    val reviewedAt: String?,
    val updatedAt: String,
)

data class VerificationDocumentItem(
    val documentType: String,
    val status: VerificationDocumentStatus,
    val required: Boolean,
    val documentId: String?,
    val objectKey: String?,
    val uploadedAt: String?,
    val reviewedAt: String?,
)

data class VerificationDocumentsSummary(
    val requiredTotal: Int,
    val uploadedRequired: Int,
    val verifiedRequired: Int,
    val missingRequired: Int,
    val allRequiredUploaded: Boolean,
)

data class VerificationDocumentsBundle(
    val session: VerificationSessionSummary?,
    val documents: List<VerificationDocumentItem>,
    val summary: VerificationDocumentsSummary,
)

data class UserVerificationOverview(
    val sessionId: String?,
    val sessionStatus: KycRawStatus?,
    val trustStatus: ProfileVerificationStatus,
    val documentsUploaded: Int,
    val requiredDocuments: Int,
    val requiredDocumentsUploaded: Int,
    val finalRequest: FinalVerificationRequest?,
)

data class UserProfile(
    val id: String,
    val fullName: String,
    val email: String,
    val avatarUrl: String?,
    val profileCompletionPercent: Int,
    val trustScoreLabel: ProfileTrustScoreLabel,
    val verificationStatus: ProfileVerificationStatus,
    val verification: UserVerificationOverview,
)

data class FinalVerificationRequestResult(
    val created: Boolean,
    val request: FinalVerificationRequest,
    val session: VerificationSessionSummary,
)
