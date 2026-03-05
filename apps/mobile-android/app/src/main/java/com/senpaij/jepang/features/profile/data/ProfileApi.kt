package com.senpaij.jepang.features.profile.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST

interface ProfileApi {
    @GET("users/me/profile")
    suspend fun getProfile(): ProfileResponseDto

    @PATCH("users/me/profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequestDto): ProfileResponseDto

    @GET("users/me/verification-documents")
    suspend fun getVerificationDocuments(): VerificationDocumentsResponseDto

    @POST("users/me/verification/final-request")
    suspend fun submitFinalVerificationRequest(
        @Body request: FinalVerificationRequestBodyDto,
    ): FinalVerificationRequestResponseDto
}
