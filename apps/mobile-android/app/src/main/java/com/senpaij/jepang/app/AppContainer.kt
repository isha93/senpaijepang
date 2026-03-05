package com.senpaij.jepang.app

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import com.senpaij.jepang.BuildConfig
import com.senpaij.jepang.core.network.ApiClient
import com.senpaij.jepang.core.storage.SessionStore
import com.senpaij.jepang.features.auth.data.AuthServiceImpl
import com.senpaij.jepang.features.auth.domain.AuthService
import com.senpaij.jepang.features.feed.data.FeedServiceImpl
import com.senpaij.jepang.features.feed.domain.FeedService
import com.senpaij.jepang.features.jobs.data.JobServiceImpl
import com.senpaij.jepang.features.jobs.domain.JobService
import com.senpaij.jepang.features.kyc.data.KycServiceImpl
import com.senpaij.jepang.features.kyc.domain.KycService
import com.senpaij.jepang.features.profile.data.ProfileServiceImpl
import com.senpaij.jepang.features.profile.domain.ProfileService

class AppContainer(context: Context) {
    private val appContext = context.applicationContext

    val sessionStore: SessionStore = SessionStore(appContext)
    val apiClient: ApiClient = ApiClient(
        baseUrl = BuildConfig.API_BASE_URL,
        sessionStore = sessionStore,
    )

    val authService: AuthService = AuthServiceImpl(
        apiClient = apiClient,
        sessionStore = sessionStore,
    )

    val jobService: JobService = JobServiceImpl(apiClient = apiClient)
    val feedService: FeedService = FeedServiceImpl(apiClient = apiClient)
    val profileService: ProfileService = ProfileServiceImpl(apiClient = apiClient)
    val kycService: KycService = KycServiceImpl(apiClient = apiClient)
}

@Composable
fun rememberAppContainer(): AppContainer {
    val context = LocalContext.current
    return remember(context) { AppContainer(context) }
}
