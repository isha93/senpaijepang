package com.senpaij.jepang.features.jobs.presentation

import com.senpaij.jepang.core.network.ApiResult
import com.senpaij.jepang.testutil.FakeJobService
import com.senpaij.jepang.testutil.MainDispatcherRule
import com.senpaij.jepang.testutil.RecordingNavigationHandler
import com.senpaij.jepang.testutil.sampleApplicationJourney
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertNotNull
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ApplicationJourneyViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `load journey populates state`() = runTest {
        val jobService = FakeJobService().apply {
            journeyResult = ApiResult.Success(sampleApplicationJourney())
        }

        val viewModel = ApplicationJourneyViewModel(
            applicationId = "app-1",
            jobService = jobService,
            navigationHandler = RecordingNavigationHandler(),
        )

        advanceUntilIdle()

        assertNotNull(viewModel.uiState.journey)
    }
}
