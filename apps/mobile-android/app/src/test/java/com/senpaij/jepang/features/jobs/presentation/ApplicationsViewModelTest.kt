package com.senpaij.jepang.features.jobs.presentation

import com.senpaij.jepang.testutil.FakeJobService
import com.senpaij.jepang.testutil.MainDispatcherRule
import com.senpaij.jepang.testutil.RecordingNavigationHandler
import com.senpaij.jepang.testutil.sampleApplicationSummary
import com.senpaij.jepang.core.network.ApiResult
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ApplicationsViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `load applications populates state`() = runTest {
        val jobService = FakeJobService().apply {
            listApplicationsResult = ApiResult.Success(listOf(sampleApplicationSummary()))
        }

        val viewModel = ApplicationsViewModel(jobService, RecordingNavigationHandler())
        viewModel.loadIfNeeded()
        advanceUntilIdle()

        assertEquals(1, viewModel.uiState.applications.size)
    }
}
