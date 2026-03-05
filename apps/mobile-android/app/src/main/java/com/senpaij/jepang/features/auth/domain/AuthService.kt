package com.senpaij.jepang.features.auth.domain

import com.senpaij.jepang.core.network.ApiResult

interface AuthService {
    suspend fun hasSession(): Boolean
    suspend fun register(input: RegisterInput): ApiResult<AuthSession>
    suspend fun login(input: LoginInput): ApiResult<AuthSession>
    suspend fun refreshSession(): ApiResult<AuthSession>
    suspend fun logout(): ApiResult<Unit>
    suspend fun me(): ApiResult<AuthUser>
}
