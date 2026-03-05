package com.senpaij.jepang.app

import com.senpaij.jepang.core.navigation.AppRoutePattern
import com.senpaij.jepang.core.network.ApiResult
import com.senpaij.jepang.core.network.AppError
import com.senpaij.jepang.testutil.FakeAuthService
import com.senpaij.jepang.testutil.MainDispatcherRule
import com.senpaij.jepang.testutil.RecordingNavigationHandler
import com.senpaij.jepang.testutil.sampleAuthSession
import com.senpaij.jepang.testutil.sampleAuthUser
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class AppBootstrapViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `no session routes to login`() = runTest {
        val authService = FakeAuthService().apply {
            hasSessionResult = false
        }
        val navigation = RecordingNavigationHandler()
        val viewModel = AppBootstrapViewModel(authService, navigation)

        viewModel.bootstrapIfNeeded()
        advanceUntilIdle()

        assertEquals(listOf("replace:${AppRoutePattern.LOGIN}"), navigation.events)
    }

    @Test
    fun `valid session routes to jobs`() = runTest {
        val authService = FakeAuthService().apply {
            hasSessionResult = true
            refreshResult = ApiResult.Success(sampleAuthSession())
            meResult = ApiResult.Success(sampleAuthUser())
        }
        val navigation = RecordingNavigationHandler()
        val viewModel = AppBootstrapViewModel(authService, navigation)

        viewModel.bootstrapIfNeeded()
        advanceUntilIdle()

        assertEquals(listOf("replace:${AppRoutePattern.JOBS_LIST}"), navigation.events)
    }

    @Test
    fun `refresh failure routes to login`() = runTest {
        val authService = FakeAuthService().apply {
            hasSessionResult = true
            refreshResult = ApiResult.Failure(AppError.Validation("Expired"))
        }
        val navigation = RecordingNavigationHandler()
        val viewModel = AppBootstrapViewModel(authService, navigation)

        viewModel.bootstrapIfNeeded()
        advanceUntilIdle()

        assertEquals(listOf("replace:${AppRoutePattern.LOGIN}"), navigation.events)
    }
}
