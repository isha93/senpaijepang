package com.senpaij.jepang.core.network

import java.io.IOException
import org.json.JSONObject
import retrofit2.HttpException

object ApiErrorMapper {
    fun fromThrowable(throwable: Throwable): AppError {
        return when (throwable) {
            is HttpException -> mapHttpException(throwable)
            is IOException -> AppError.Network("Network unavailable. Please check your internet connection.")
            else -> AppError.Unknown(throwable.message ?: "Unexpected error")
        }
    }

    private fun mapHttpException(exception: HttpException): AppError {
        val statusCode = exception.code()
        val fallbackMessage = exception.message() ?: "Request failed"
        val errorBodyString = exception.response()?.errorBody()?.string()
        val parsed = parseApiError(errorBodyString)

        return AppError.Http(
            statusCode = statusCode,
            code = parsed?.first,
            message = parsed?.second ?: fallbackMessage,
        )
    }

    private fun parseApiError(body: String?): Pair<String?, String>? {
        if (body.isNullOrBlank()) return null
        return try {
            val root = JSONObject(body)
            val errorObject = root.optJSONObject("error") ?: return null
            val code = if (errorObject.has("code") && !errorObject.isNull("code")) {
                errorObject.optString("code")
            } else {
                null
            }
            val message = errorObject.optString("message", "Request failed")
            code to message
        } catch (_: Exception) {
            null
        }
    }
}
