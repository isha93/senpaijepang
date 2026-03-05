package com.senpaij.jepang.features.jobs.presentation

import com.senpaij.jepang.core.navigation.AppRoutePattern
import com.senpaij.jepang.core.network.ApiResult
import com.senpaij.jepang.testutil.FakeAuthService
import com.senpaij.jepang.testutil.FakeJobService
import com.senpaij.jepang.testutil.MainDispatcherRule
import com.senpaij.jepang.testutil.RecordingNavigationHandler
import com.senpaij.jepang.testutil.sampleJobSummary
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class JobsListViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `load jobs populates list`() = runTest {
        val authService = FakeAuthService()
        val jobService = FakeJobService().apply {
            listJobsResult = ApiResult.Success(listOf(sampleJobSummary(saved = false)))
        }
        val navigation = RecordingNavigationHandler()

        val viewModel = JobsListViewModel(authService, jobService, navigation)
        viewModel.loadIfNeeded()
        advanceUntilIdle()

        assertEquals(1, viewModel.uiState.jobs.size)
        assertEquals("Senior Welder", viewModel.uiState.jobs.first().title)
    }

    @Test
    fun `toggle save updates item state`() = runTest {
        val authService = FakeAuthService()
        val jobService = FakeJobService().apply {
            listJobsResult = ApiResult.Success(listOf(sampleJobSummary(saved = false)))
            saveResult = ApiResult.Success(true)
        }
        val navigation = RecordingNavigationHandler()

        val viewModel = JobsListViewModel(authService, jobService, navigation)
        viewModel.loadIfNeeded()
        advanceUntilIdle()

        viewModel.onToggleSaved(viewModel.uiState.jobs.first())
        advanceUntilIdle()

        assertTrue(viewModel.uiState.jobs.first().viewerState.saved)
    }

    @Test
    fun `logout routes to login`() = runTest {
        val authService = FakeAuthService()
        val jobService = FakeJobService()
        val navigation = RecordingNavigationHandler()

        val viewModel = JobsListViewModel(authService, jobService, navigation)
        viewModel.onLogoutClicked()
        advanceUntilIdle()

        assertEquals(listOf("replace:${AppRoutePattern.LOGIN}"), navigation.events)
    }
}
