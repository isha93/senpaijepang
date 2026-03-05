package com.senpaij.jepang.features.kyc.data

import com.google.gson.annotations.SerializedName
import com.senpaij.jepang.features.kyc.domain.KycDocument
import com.senpaij.jepang.features.kyc.domain.KycDocumentUploadResult
import com.senpaij.jepang.features.kyc.domain.KycHistoryResult
import com.senpaij.jepang.features.kyc.domain.KycRawStatus
import com.senpaij.jepang.features.kyc.domain.KycSession
import com.senpaij.jepang.features.kyc.domain.KycStatusEvent
import com.senpaij.jepang.features.kyc.domain.KycStatusSnapshot
import com.senpaij.jepang.features.kyc.domain.KycTrustStatus
import com.senpaij.jepang.features.kyc.domain.KycUploadUrlResult
import com.senpaij.jepang.features.kyc.domain.PresignedUpload

data class KycCreateSessionRequestDto(
    @SerializedName("provider")
    val provider: String?,
)

data class KycUploadUrlRequestDto(
    @SerializedName("sessionId")
    val sessionId: String?,
    @SerializedName("documentType")
    val documentType: String,
    @SerializedName("fileName")
    val fileName: String,
    @SerializedName("contentType")
    val contentType: String,
    @SerializedName("contentLength")
    val contentLength: Int,
    @SerializedName("checksumSha256")
    val checksumSha256: String,
)

data class KycDocumentUploadRequestDto(
    @SerializedName("sessionId")
    val sessionId: String?,
    @SerializedName("documentType")
    val documentType: String,
    @SerializedName("objectKey")
    val objectKey: String,
    @SerializedName("checksumSha256")
    val checksumSha256: String,
    @SerializedName("metadata")
    val metadata: Map<String, Any?>,
)

data class KycSessionEnvelopeDto(
    @SerializedName("status")
    val status: String,
    @SerializedName("session")
    val session: KycSessionDto,
)

data class KycStatusEnvelopeDto(
    @SerializedName("status")
    val status: String,
    @SerializedName("session")
    val session: KycSessionDto?,
)

data class KycSessionDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("status")
    val status: String,
    @SerializedName("provider")
    val provider: String,
    @SerializedName("providerRef")
    val providerRef: String?,
    @SerializedName("providerMetadata")
    val providerMetadata: Map<String, Any?>?,
    @SerializedName("submittedAt")
    val submittedAt: String?,
    @SerializedName("reviewedBy")
    val reviewedBy: String?,
    @SerializedName("reviewedAt")
    val reviewedAt: String?,
    @SerializedName("createdAt")
    val createdAt: String,
    @SerializedName("updatedAt")
    val updatedAt: String,
)

data class PresignedUploadDto(
    @SerializedName("objectKey")
    val objectKey: String,
    @SerializedName("uploadUrl")
    val uploadUrl: String,
    @SerializedName("method")
    val method: String,
    @SerializedName("headers")
    val headers: Map<String, String>,
    @SerializedName("expiresAt")
    val expiresAt: String,
)

data class KycUploadUrlResponseDto(
    @SerializedName("status")
    val status: String,
    @SerializedName("session")
    val session: KycSessionDto,
    @SerializedName("upload")
    val upload: PresignedUploadDto,
)

data class KycDocumentDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("kycSessionId")
    val kycSessionId: String,
    @SerializedName("documentType")
    val documentType: String,
    @SerializedName("objectKey")
    val objectKey: String?,
    @SerializedName("fileUrl")
    val fileUrl: String,
    @SerializedName("checksumSha256")
    val checksumSha256: String,
    @SerializedName("metadata")
    val metadata: Map<String, Any?>?,
    @SerializedName("verifiedAt")
    val verifiedAt: String?,
    @SerializedName("createdAt")
    val createdAt: String,
)

data class KycDocumentUploadResponseDto(
    @SerializedName("status")
    val status: String,
    @SerializedName("session")
    val session: KycSessionDto,
    @SerializedName("document")
    val document: KycDocumentDto,
)

data class KycStatusEventDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("kycSessionId")
    val kycSessionId: String,
    @SerializedName("fromStatus")
    val fromStatus: String?,
    @SerializedName("toStatus")
    val toStatus: String,
    @SerializedName("actorType")
    val actorType: String,
    @SerializedName("actorId")
    val actorId: String?,
    @SerializedName("reason")
    val reason: String?,
    @SerializedName("createdAt")
    val createdAt: String,
)

data class KycHistoryResponseDto(
    @SerializedName("session")
    val session: KycSessionDto?,
    @SerializedName("events")
    val events: List<KycStatusEventDto>,
)

fun KycSessionEnvelopeDto.toStatusSnapshotDomain(): KycStatusSnapshot {
    return KycStatusSnapshot(
        status = status.toKycTrustStatus(),
        session = session.toDomain(),
    )
}

fun KycStatusEnvelopeDto.toDomain(): KycStatusSnapshot {
    return KycStatusSnapshot(
        status = status.toKycTrustStatus(),
        session = session?.toDomain(),
    )
}

fun KycUploadUrlResponseDto.toDomain(): KycUploadUrlResult {
    return KycUploadUrlResult(
        status = status.toKycTrustStatus(),
        session = session.toDomain(),
        upload = upload.toDomain(),
    )
}

fun KycDocumentUploadResponseDto.toDomain(): KycDocumentUploadResult {
    return KycDocumentUploadResult(
        status = status.toKycTrustStatus(),
        session = session.toDomain(),
        document = document.toDomain(),
    )
}

fun KycHistoryResponseDto.toDomain(): KycHistoryResult {
    return KycHistoryResult(
        session = session?.toDomain(),
        events = events.map { it.toDomain() },
    )
}

private fun KycSessionDto.toDomain(): KycSession {
    return KycSession(
        id = id,
        status = status.toKycRawStatus(),
        provider = provider,
        providerRef = providerRef,
        providerMetadata = providerMetadata.orEmpty(),
        submittedAt = submittedAt,
        reviewedBy = reviewedBy,
        reviewedAt = reviewedAt,
        createdAt = createdAt,
        updatedAt = updatedAt,
    )
}

private fun PresignedUploadDto.toDomain(): PresignedUpload {
    return PresignedUpload(
        objectKey = objectKey,
        uploadUrl = uploadUrl,
        method = method,
        headers = headers,
        expiresAt = expiresAt,
    )
}

private fun KycDocumentDto.toDomain(): KycDocument {
    return KycDocument(
        id = id,
        kycSessionId = kycSessionId,
        documentType = documentType,
        objectKey = objectKey,
        fileUrl = fileUrl,
        checksumSha256 = checksumSha256,
        metadata = metadata.orEmpty(),
        verifiedAt = verifiedAt,
        createdAt = createdAt,
    )
}

private fun KycStatusEventDto.toDomain(): KycStatusEvent {
    return KycStatusEvent(
        id = id,
        kycSessionId = kycSessionId,
        fromStatus = fromStatus?.toKycRawStatus(),
        toStatus = toStatus.toKycRawStatus(),
        actorType = actorType,
        actorId = actorId,
        reason = reason,
        createdAt = createdAt,
    )
}

private fun String.toKycTrustStatus(): KycTrustStatus {
    return when (this) {
        "IN_PROGRESS" -> KycTrustStatus.IN_PROGRESS
        "MANUAL_REVIEW" -> KycTrustStatus.MANUAL_REVIEW
        "VERIFIED" -> KycTrustStatus.VERIFIED
        "REJECTED" -> KycTrustStatus.REJECTED
        else -> KycTrustStatus.NOT_STARTED
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
