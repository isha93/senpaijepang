package com.senpaij.jepang.features.auth.presentation

import com.senpaij.jepang.core.navigation.AppRoutePattern
import com.senpaij.jepang.core.network.ApiResult
import com.senpaij.jepang.core.network.AppError
import com.senpaij.jepang.testutil.FakeAuthService
import com.senpaij.jepang.testutil.MainDispatcherRule
import com.senpaij.jepang.testutil.RecordingNavigationHandler
import com.senpaij.jepang.testutil.sampleAuthSession
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class LoginViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `login success navigates to jobs`() = runTest {
        val authService = FakeAuthService().apply {
            loginResult = ApiResult.Success(sampleAuthSession())
        }
        val navigation = RecordingNavigationHandler()

        val viewModel = LoginViewModel(authService, navigation)
        viewModel.onIdentifierChanged("user@example.com")
        viewModel.onPasswordChanged("password123")

        viewModel.onLoginClicked()
        advanceUntilIdle()

        assertEquals(listOf("replace:${AppRoutePattern.JOBS_LIST}"), navigation.events)
        assertTrue(viewModel.uiState.errorMessage == null)
        assertTrue(!viewModel.uiState.isLoading)
    }

    @Test
    fun `login failure surfaces error`() = runTest {
        val authService = FakeAuthService().apply {
            loginResult = ApiResult.Failure(AppError.Validation("Invalid credentials"))
        }
        val navigation = RecordingNavigationHandler()

        val viewModel = LoginViewModel(authService, navigation)
        viewModel.onIdentifierChanged("user@example.com")
        viewModel.onPasswordChanged("wrong")

        viewModel.onLoginClicked()
        advanceUntilIdle()

        assertEquals("Invalid credentials", viewModel.uiState.errorMessage)
        assertTrue(navigation.events.isEmpty())
    }

    @Test
    fun `empty credentials block login`() = runTest {
        val authService = FakeAuthService()
        val navigation = RecordingNavigationHandler()

        val viewModel = LoginViewModel(authService, navigation)

        viewModel.onLoginClicked()

        assertEquals("Email and password are required", viewModel.uiState.errorMessage)
        assertTrue(navigation.events.isEmpty())
    }

    @Test
    fun `register click navigates to register route`() = runTest {
        val authService = FakeAuthService()
        val navigation = RecordingNavigationHandler()

        val viewModel = LoginViewModel(authService, navigation)
        viewModel.onRegisterClicked()

        assertEquals(listOf("navigate:${AppRoutePattern.REGISTER}"), navigation.events)
    }
}
