package com.senpaij.jepang.features.auth.data

import com.senpaij.jepang.core.network.ApiClient
import com.senpaij.jepang.core.network.ApiErrorMapper
import com.senpaij.jepang.core.network.ApiResult
import com.senpaij.jepang.core.network.AppError
import com.senpaij.jepang.core.storage.SessionStore
import com.senpaij.jepang.core.storage.SessionTokens
import com.senpaij.jepang.features.auth.domain.AuthService
import com.senpaij.jepang.features.auth.domain.AuthSession
import com.senpaij.jepang.features.auth.domain.AuthUser
import com.senpaij.jepang.features.auth.domain.LoginInput
import com.senpaij.jepang.features.auth.domain.RegisterInput

class AuthServiceImpl(
    apiClient: ApiClient,
    private val sessionStore: SessionStore,
) : AuthService {
    private val authApi = apiClient.create(AuthApi::class.java)

    override suspend fun hasSession(): Boolean = sessionStore.hasSession()

    override suspend fun register(input: RegisterInput): ApiResult<AuthSession> {
        return safeCall {
            val response = authApi.register(
                request = RegisterRequestDto(
                    fullName = input.fullName,
                    email = input.email,
                    password = input.password,
                ),
            )
            persistSession(response)
            response.toDomain()
        }
    }

    override suspend fun login(input: LoginInput): ApiResult<AuthSession> {
        return safeCall {
            val response = authApi.login(
                request = LoginRequestDto(
                    identifier = input.identifier,
                    password = input.password,
                ),
            )
            persistSession(response)
            response.toDomain()
        }
    }

    override suspend fun refreshSession(): ApiResult<AuthSession> {
        val refreshToken = sessionStore.tokens()?.refreshToken
            ?: return ApiResult.Failure(AppError.Validation("Missing refresh token"))

        return safeCall {
            val response = authApi.refresh(RefreshRequestDto(refreshToken = refreshToken))
            persistSession(response)
            response.toDomain()
        }
    }

    override suspend fun logout(): ApiResult<Unit> {
        val refreshToken = sessionStore.tokens()?.refreshToken

        return try {
            authApi.logout(request = LogoutRequestDto(refreshToken = refreshToken))
            sessionStore.clear()
            ApiResult.Success(Unit)
        } catch (_: Throwable) {
            // Local logout must still succeed even if remote revoke fails.
            sessionStore.clear()
            ApiResult.Success(Unit)
        }
    }

    override suspend fun me(): ApiResult<AuthUser> {
        return safeCall {
            authApi.me().user.toDomain()
        }
    }

    private suspend fun persistSession(response: AuthResponseDto) {
        sessionStore.save(
            SessionTokens(
                accessToken = response.accessToken,
                refreshToken = response.refreshToken,
            ),
        )
    }

    private suspend fun <T> safeCall(block: suspend () -> T): ApiResult<T> {
        return try {
            ApiResult.Success(block())
        } catch (throwable: Throwable) {
            ApiResult.Failure(ApiErrorMapper.fromThrowable(throwable))
        }
    }
}
