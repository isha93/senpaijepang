package com.senpaij.jepang.features.kyc.domain

import com.senpaij.jepang.core.network.ApiResult

interface KycService {
    suspend fun getStatus(): ApiResult<KycStatusSnapshot>
    suspend fun startSession(provider: String? = null): ApiResult<KycStatusSnapshot>
    suspend fun requestUploadUrl(
        sessionId: String?,
        documentType: String,
        fileName: String,
        contentType: String,
        contentLength: Int,
        checksumSha256: String,
    ): ApiResult<KycUploadUrlResult>

    suspend fun uploadDocumentMetadata(
        sessionId: String?,
        documentType: String,
        objectKey: String,
        checksumSha256: String,
        metadata: Map<String, Any?> = emptyMap(),
    ): ApiResult<KycDocumentUploadResult>

    suspend fun submitSession(sessionId: String): ApiResult<KycStatusSnapshot>
    suspend fun getHistory(sessionId: String? = null): ApiResult<KycHistoryResult>
}
