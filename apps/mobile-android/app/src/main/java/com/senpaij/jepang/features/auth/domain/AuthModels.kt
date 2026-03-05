package com.senpaij.jepang.features.auth.domain

data class LoginInput(
    val identifier: String,
    val password: String,
)

data class RegisterInput(
    val fullName: String,
    val email: String,
    val password: String,
)

data class AuthUser(
    val id: String,
    val fullName: String,
    val email: String,
    val roles: List<String>,
)

data class AuthSession(
    val user: AuthUser,
    val accessToken: String,
    val refreshToken: String,
)
