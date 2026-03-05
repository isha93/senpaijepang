package com.senpaij.jepang.features.kyc.domain

enum class KycTrustStatus {
    NOT_STARTED,
    IN_PROGRESS,
    MANUAL_REVIEW,
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

data class KycSession(
    val id: String,
    val status: KycRawStatus,
    val provider: String,
    val providerRef: String?,
    val providerMetadata: Map<String, Any?>,
    val submittedAt: String?,
    val reviewedBy: String?,
    val reviewedAt: String?,
    val createdAt: String,
    val updatedAt: String,
)

data class KycStatusSnapshot(
    val status: KycTrustStatus,
    val session: KycSession?,
)

data class PresignedUpload(
    val objectKey: String,
    val uploadUrl: String,
    val method: String,
    val headers: Map<String, String>,
    val expiresAt: String,
)

data class KycUploadUrlResult(
    val status: KycTrustStatus,
    val session: KycSession,
    val upload: PresignedUpload,
)

data class KycDocument(
    val id: String,
    val kycSessionId: String,
    val documentType: String,
    val objectKey: String?,
    val fileUrl: String,
    val checksumSha256: String,
    val metadata: Map<String, Any?>,
    val verifiedAt: String?,
    val createdAt: String,
)

data class KycDocumentUploadResult(
    val status: KycTrustStatus,
    val session: KycSession,
    val document: KycDocument,
)

data class KycStatusEvent(
    val id: String,
    val kycSessionId: String,
    val fromStatus: KycRawStatus?,
    val toStatus: KycRawStatus,
    val actorType: String,
    val actorId: String?,
    val reason: String?,
    val createdAt: String,
)

data class KycHistoryResult(
    val session: KycSession?,
    val events: List<KycStatusEvent>,
)
