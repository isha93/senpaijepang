package com.senpaij.jepang.features.jobs.presentation

import com.senpaij.jepang.core.network.ApiResult
import com.senpaij.jepang.testutil.FakeJobService
import com.senpaij.jepang.testutil.MainDispatcherRule
import com.senpaij.jepang.testutil.RecordingNavigationHandler
import com.senpaij.jepang.testutil.sampleJobSummary
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SavedJobsViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `load saved jobs populates state`() = runTest {
        val jobService = FakeJobService().apply {
            savedJobsResult = ApiResult.Success(listOf(sampleJobSummary(saved = true)))
        }
        val viewModel = SavedJobsViewModel(jobService, RecordingNavigationHandler())

        viewModel.loadIfNeeded()
        advanceUntilIdle()

        assertEquals(1, viewModel.uiState.jobs.size)
    }

    @Test
    fun `remove saved job removes from list`() = runTest {
        val jobService = FakeJobService().apply {
            savedJobsResult = ApiResult.Success(listOf(sampleJobSummary(saved = true)))
            unsaveResult = ApiResult.Success(false)
        }
        val viewModel = SavedJobsViewModel(jobService, RecordingNavigationHandler())

        viewModel.loadIfNeeded()
        advanceUntilIdle()

        viewModel.onRemoveSaved(viewModel.uiState.jobs.first())
        advanceUntilIdle()

        assertEquals(0, viewModel.uiState.jobs.size)
    }
}
