package com.senpaij.jepang.features.auth.data

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface AuthApi {
    @POST("v1/auth/register")
    suspend fun register(@Body request: RegisterRequestDto): AuthResponseDto

    @POST("v1/auth/login")
    suspend fun login(@Body request: LoginRequestDto): AuthResponseDto

    @POST("v1/auth/refresh")
    suspend fun refresh(@Body request: RefreshRequestDto): AuthResponseDto

    @POST("v1/auth/logout")
    suspend fun logout(@Body request: LogoutRequestDto?): Response<Unit>

    @GET("v1/auth/me")
    suspend fun me(): MeResponseDto
}
