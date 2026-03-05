package com.senpaij.jepang.features.profile.data

import com.senpaij.jepang.core.network.ApiClient
import com.senpaij.jepang.core.network.ApiErrorMapper
import com.senpaij.jepang.core.network.ApiResult
import com.senpaij.jepang.features.profile.domain.FinalVerificationRequestResult
import com.senpaij.jepang.features.profile.domain.ProfileService
import com.senpaij.jepang.features.profile.domain.UserProfile
import com.senpaij.jepang.features.profile.domain.VerificationDocumentsBundle

class ProfileServiceImpl(apiClient: ApiClient) : ProfileService {
    private val profileApi = apiClient.create(ProfileApi::class.java)

    override suspend fun getProfile(): ApiResult<UserProfile> {
        return safeCall {
            profileApi.getProfile().profile.toDomain()
        }
    }

    override suspend fun updateProfile(fullName: String?, avatarUrl: String?): ApiResult<UserProfile> {
        return safeCall {
            profileApi.updateProfile(
                request = UpdateProfileRequestDto(
                    fullName = fullName,
                    avatarUrl = avatarUrl,
                ),
            ).profile.toDomain()
        }
    }

    override suspend fun getVerificationDocuments(): ApiResult<VerificationDocumentsBundle> {
        return safeCall {
            profileApi.getVerificationDocuments().toDomain()
        }
    }

    override suspend fun submitFinalVerificationRequest(
        source: String?,
        note: String?,
    ): ApiResult<FinalVerificationRequestResult> {
        return safeCall {
            val requestBody = FinalVerificationRequestBodyDto(
                source = source,
                note = note,
            )
            profileApi.submitFinalVerificationRequest(request = requestBody).toDomain()
        }
    }

    private suspend fun <T> safeCall(block: suspend () -> T): ApiResult<T> {
        return try {
            ApiResult.Success(block())
        } catch (throwable: Throwable) {
            ApiResult.Failure(ApiErrorMapper.fromThrowable(throwable))
        }
    }
}
