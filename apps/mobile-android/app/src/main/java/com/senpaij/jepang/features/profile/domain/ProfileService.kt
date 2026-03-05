package com.senpaij.jepang.features.profile.domain

import com.senpaij.jepang.core.network.ApiResult

interface ProfileService {
    suspend fun getProfile(): ApiResult<UserProfile>
    suspend fun updateProfile(fullName: String?, avatarUrl: String?): ApiResult<UserProfile>
    suspend fun getVerificationDocuments(): ApiResult<VerificationDocumentsBundle>
    suspend fun submitFinalVerificationRequest(
        source: String? = null,
        note: String? = null,
    ): ApiResult<FinalVerificationRequestResult>
}
