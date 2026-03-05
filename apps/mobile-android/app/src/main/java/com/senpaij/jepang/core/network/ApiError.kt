package com.senpaij.jepang.core.network

sealed interface AppError {
    val message: String

    data class Http(
        val statusCode: Int,
        val code: String?,
        override val message: String,
    ) : AppError

    data class Network(override val message: String) : AppError
    data class Validation(override val message: String) : AppError
    data class Unknown(override val message: String) : AppError
}
