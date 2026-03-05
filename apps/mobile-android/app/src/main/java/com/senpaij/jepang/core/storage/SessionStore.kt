package com.senpaij.jepang.core.storage

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

private val Context.sessionDataStore by preferencesDataStore(name = "senpai_session")
private val AccessTokenKey: Preferences.Key<String> = stringPreferencesKey("access_token")
private val RefreshTokenKey: Preferences.Key<String> = stringPreferencesKey("refresh_token")

class SessionStore(context: Context) {
    private val appContext = context.applicationContext
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val accessTokenKey: Preferences.Key<String> = AccessTokenKey
    private val refreshTokenKey: Preferences.Key<String> = RefreshTokenKey

    val session: StateFlow<SessionTokens?> = appContext.sessionDataStore.data
        .map { prefs -> prefs.toSessionTokens() }
        .stateIn(
            scope = scope,
            started = SharingStarted.Eagerly,
            initialValue = null,
        )

    fun currentAccessToken(): String? = session.value?.accessToken

    fun currentRefreshToken(): String? = session.value?.refreshToken

    suspend fun tokens(): SessionTokens? = appContext.sessionDataStore.data.first().toSessionTokens()

    suspend fun hasSession(): Boolean = tokens() != null

    suspend fun save(tokens: SessionTokens) {
        appContext.sessionDataStore.edit { prefs ->
            prefs[accessTokenKey] = tokens.accessToken
            prefs[refreshTokenKey] = tokens.refreshToken
        }
    }

    suspend fun clear() {
        appContext.sessionDataStore.edit { prefs ->
            prefs.remove(accessTokenKey)
            prefs.remove(refreshTokenKey)
        }
    }
}

private fun Preferences.toSessionTokens(): SessionTokens? {
    val accessToken = this[AccessTokenKey]
    val refreshToken = this[RefreshTokenKey]
    return if (accessToken.isNullOrBlank() || refreshToken.isNullOrBlank()) {
        null
    } else {
        SessionTokens(
            accessToken = accessToken,
            refreshToken = refreshToken,
        )
    }
}

data class SessionTokens(
    val accessToken: String,
    val refreshToken: String,
)
