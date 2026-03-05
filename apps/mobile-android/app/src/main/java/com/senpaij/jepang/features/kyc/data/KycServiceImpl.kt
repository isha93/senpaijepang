package com.senpaij.jepang.features.kyc.data

import com.senpaij.jepang.core.network.ApiClient
import com.senpaij.jepang.core.network.ApiErrorMapper
import com.senpaij.jepang.core.network.ApiResult
import com.senpaij.jepang.features.kyc.domain.KycDocumentUploadResult
import com.senpaij.jepang.features.kyc.domain.KycHistoryResult
import com.senpaij.jepang.features.kyc.domain.KycService
import com.senpaij.jepang.features.kyc.domain.KycStatusSnapshot
import com.senpaij.jepang.features.kyc.domain.KycUploadUrlResult

class KycServiceImpl(apiClient: ApiClient) : KycService {
    private val kycApi = apiClient.create(KycApi::class.java)

    override suspend fun getStatus(): ApiResult<KycStatusSnapshot> {
        return safeCall { kycApi.getStatus().toDomain() }
    }

    override suspend fun startSession(provider: String?): ApiResult<KycStatusSnapshot> {
        return safeCall {
            kycApi.startSession(
                request = KycCreateSessionRequestDto(provider = provider),
            ).toStatusSnapshotDomain()
        }
    }

    override suspend fun requestUploadUrl(
        sessionId: String?,
        documentType: String,
        fileName: String,
        contentType: String,
        contentLength: Int,
        checksumSha256: String,
    ): ApiResult<KycUploadUrlResult> {
        return safeCall {
            kycApi.requestUploadUrl(
                request = KycUploadUrlRequestDto(
                    sessionId = sessionId,
                    documentType = documentType,
                    fileName = fileName,
                    contentType = contentType,
                    contentLength = contentLength,
                    checksumSha256 = checksumSha256,
                ),
            ).toDomain()
        }
    }

    override suspend fun uploadDocumentMetadata(
        sessionId: String?,
        documentType: String,
        objectKey: String,
        checksumSha256: String,
        metadata: Map<String, Any?>,
    ): ApiResult<KycDocumentUploadResult> {
        return safeCall {
            kycApi.uploadDocumentMetadata(
                request = KycDocumentUploadRequestDto(
                    sessionId = sessionId,
                    documentType = documentType,
                    objectKey = objectKey,
                    checksumSha256 = checksumSha256,
                    metadata = metadata,
                ),
            ).toDomain()
        }
    }

    override suspend fun submitSession(sessionId: String): ApiResult<KycStatusSnapshot> {
        return safeCall { kycApi.submitSession(sessionId = sessionId).toStatusSnapshotDomain() }
    }

    override suspend fun getHistory(sessionId: String?): ApiResult<KycHistoryResult> {
        return safeCall { kycApi.getHistory(sessionId = sessionId).toDomain() }
    }

    private suspend fun <T> safeCall(block: suspend () -> T): ApiResult<T> {
        return try {
            ApiResult.Success(block())
        } catch (throwable: Throwable) {
            ApiResult.Failure(ApiErrorMapper.fromThrowable(throwable))
        }
    }
}
