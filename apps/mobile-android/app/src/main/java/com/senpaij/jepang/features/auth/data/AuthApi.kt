package com.senpaij.jepang.features.auth.data

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface AuthApi {
    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequestDto): AuthResponseDto

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequestDto): AuthResponseDto

    @POST("auth/refresh")
    suspend fun refresh(@Body request: RefreshRequestDto): AuthResponseDto

    @POST("auth/logout")
    suspend fun logout(@Body request: LogoutRequestDto?): Response<Unit>

    @GET("auth/me")
    suspend fun me(): MeResponseDto
}
