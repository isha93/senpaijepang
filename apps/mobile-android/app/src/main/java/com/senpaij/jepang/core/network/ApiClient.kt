package com.senpaij.jepang.core.network

import com.senpaij.jepang.BuildConfig
import com.senpaij.jepang.core.storage.SessionStore
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class ApiClient(
    baseUrl: String,
    sessionStore: SessionStore,
) {
    private val retrofit: Retrofit = Retrofit.Builder()
        .baseUrl(baseUrl.ensureTrailingSlash())
        .client(createHttpClient(sessionStore))
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    fun <T : Any> create(serviceClass: Class<T>): T = retrofit.create(serviceClass)

    private fun createHttpClient(sessionStore: SessionStore): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        return OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(tokenProvider = sessionStore::currentAccessToken))
            .addInterceptor(logging)
            .build()
    }
}

private fun String.ensureTrailingSlash(): String {
    return if (endsWith('/')) this else "$this/"
}
