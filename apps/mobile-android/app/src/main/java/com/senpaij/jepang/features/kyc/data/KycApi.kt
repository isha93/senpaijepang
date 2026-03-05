package com.senpaij.jepang.features.kyc.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface KycApi {
    @GET("identity/kyc/status")
    suspend fun getStatus(): KycStatusEnvelopeDto

    @POST("identity/kyc/sessions")
    suspend fun startSession(@Body request: KycCreateSessionRequestDto): KycSessionEnvelopeDto

    @POST("identity/kyc/upload-url")
    suspend fun requestUploadUrl(@Body request: KycUploadUrlRequestDto): KycUploadUrlResponseDto

    @POST("identity/kyc/documents")
    suspend fun uploadDocumentMetadata(@Body request: KycDocumentUploadRequestDto): KycDocumentUploadResponseDto

    @POST("identity/kyc/sessions/{sessionId}/submit")
    suspend fun submitSession(@Path("sessionId") sessionId: String): KycSessionEnvelopeDto

    @GET("identity/kyc/history")
    suspend fun getHistory(@Query("sessionId") sessionId: String?): KycHistoryResponseDto
}
