package com.senpaij.jepang.features.auth.data

import com.google.gson.annotations.SerializedName
import com.senpaij.jepang.features.auth.domain.AuthSession
import com.senpaij.jepang.features.auth.domain.AuthUser

data class RegisterRequestDto(
    @SerializedName("fullName")
    val fullName: String,
    @SerializedName("email")
    val email: String,
    @SerializedName("password")
    val password: String,
)

data class LoginRequestDto(
    @SerializedName("identifier")
    val identifier: String,
    @SerializedName("password")
    val password: String,
)

data class RefreshRequestDto(
    @SerializedName("refreshToken")
    val refreshToken: String,
)

data class LogoutRequestDto(
    @SerializedName("refreshToken")
    val refreshToken: String?,
)

data class UserDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("fullName")
    val fullName: String,
    @SerializedName("email")
    val email: String,
    @SerializedName("roles")
    val roles: List<String>,
)

data class AuthResponseDto(
    @SerializedName("user")
    val user: UserDto,
    @SerializedName("accessToken")
    val accessToken: String,
    @SerializedName("refreshToken")
    val refreshToken: String,
)

data class MeResponseDto(
    @SerializedName("user")
    val user: UserDto,
)

fun UserDto.toDomain(): AuthUser {
    return AuthUser(
        id = id,
        fullName = fullName,
        email = email,
        roles = roles,
    )
}

fun AuthResponseDto.toDomain(): AuthSession {
    return AuthSession(
        user = user.toDomain(),
        accessToken = accessToken,
        refreshToken = refreshToken,
    )
}
