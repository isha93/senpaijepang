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
class RegisterViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `register success navigates to jobs`() = runTest {
        val authService = FakeAuthService().apply {
            registerResult = ApiResult.Success(sampleAuthSession())
        }
        val navigation = RecordingNavigationHandler()

        val viewModel = RegisterViewModel(authService, navigation)
        viewModel.onFullNameChanged("Test User")
        viewModel.onEmailChanged("test@example.com")
        viewModel.onPasswordChanged("password123")

        viewModel.onRegisterClicked()
        advanceUntilIdle()

        assertEquals(listOf("replace:${AppRoutePattern.JOBS_LIST}"), navigation.events)
        assertTrue(viewModel.uiState.errorMessage == null)
    }

    @Test
    fun `register validation catches invalid input`() = runTest {
        val viewModel = RegisterViewModel(FakeAuthService(), RecordingNavigationHandler())

        viewModel.onFullNameChanged("A")
        viewModel.onEmailChanged("invalid")
        viewModel.onPasswordChanged("123")
        viewModel.onRegisterClicked()

        assertEquals("Full name must be at least 2 characters", viewModel.uiState.errorMessage)
    }

    @Test
    fun `register API failure surfaces error`() = runTest {
        val authService = FakeAuthService().apply {
            registerResult = ApiResult.Failure(AppError.Validation("Email already used"))
        }
        val navigation = RecordingNavigationHandler()

        val viewModel = RegisterViewModel(authService, navigation)
        viewModel.onFullNameChanged("Test User")
        viewModel.onEmailChanged("test@example.com")
        viewModel.onPasswordChanged("password123")

        viewModel.onRegisterClicked()
        advanceUntilIdle()

        assertEquals("Email already used", viewModel.uiState.errorMessage)
        assertTrue(navigation.events.isEmpty())
    }

    @Test
    fun `back to login triggers back navigation`() = runTest {
        val navigation = RecordingNavigationHandler()
        val viewModel = RegisterViewModel(FakeAuthService(), navigation)

        viewModel.onBackToLoginClicked()

        assertEquals(listOf("back"), navigation.events)
    }
}
