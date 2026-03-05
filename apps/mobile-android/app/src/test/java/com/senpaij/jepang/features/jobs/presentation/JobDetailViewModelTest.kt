package com.senpaij.jepang.features.jobs.presentation

import com.senpaij.jepang.core.network.ApiResult
import com.senpaij.jepang.testutil.FakeJobService
import com.senpaij.jepang.testutil.MainDispatcherRule
import com.senpaij.jepang.testutil.RecordingNavigationHandler
import com.senpaij.jepang.testutil.sampleApplicationSummary
import com.senpaij.jepang.testutil.sampleJobDetailEnvelope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class JobDetailViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `initial load fetches detail`() = runTest {
        val jobService = FakeJobService().apply {
            detailResult = ApiResult.Success(sampleJobDetailEnvelope(saved = false))
        }

        val viewModel = JobDetailViewModel(
            jobId = "job-1",
            jobService = jobService,
            navigationHandler = RecordingNavigationHandler(),
        )

        advanceUntilIdle()

        assertNotNull(viewModel.uiState.jobEnvelope)
    }

    @Test
    fun `toggle save updates viewer state`() = runTest {
        val jobService = FakeJobService().apply {
            detailResult = ApiResult.Success(sampleJobDetailEnvelope(saved = false))
            saveResult = ApiResult.Success(true)
        }

        val viewModel = JobDetailViewModel(
            jobId = "job-1",
            jobService = jobService,
            navigationHandler = RecordingNavigationHandler(),
        )

        advanceUntilIdle()
        viewModel.onToggleSaved()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.jobEnvelope?.viewerState?.saved == true)
    }

    @Test
    fun `apply navigates to journey route`() = runTest {
        val jobService = FakeJobService().apply {
            detailResult = ApiResult.Success(sampleJobDetailEnvelope(saved = false))
            applyResult = ApiResult.Success(
                com.senpaij.jepang.features.jobs.domain.JobApplyResult(
                    created = true,
                    application = sampleApplicationSummary(),
                ),
            )
        }
        val navigation = RecordingNavigationHandler()

        val viewModel = JobDetailViewModel(
            jobId = "job-1",
            jobService = jobService,
            navigationHandler = navigation,
        )

        advanceUntilIdle()
        viewModel.onApplyClicked()
        advanceUntilIdle()

        assertEquals(listOf("navigate:journey/app-1"), navigation.events)
    }
}
