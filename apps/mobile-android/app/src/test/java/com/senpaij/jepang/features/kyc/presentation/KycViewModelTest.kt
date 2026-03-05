package com.senpaij.jepang.features.kyc.presentation

import com.senpaij.jepang.features.kyc.domain.KycRawStatus
import com.senpaij.jepang.features.kyc.domain.KycTrustStatus
import com.senpaij.jepang.testutil.FakeKycService
import com.senpaij.jepang.testutil.MainDispatcherRule
import com.senpaij.jepang.testutil.RecordingNavigationHandler
import com.senpaij.jepang.testutil.sampleKycHistoryResult
import com.senpaij.jepang.testutil.sampleKycStatusSnapshot
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class KycViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `load status and history populates state`() = runTest {
        val service = FakeKycService().apply {
            statusResult = com.senpaij.jepang.core.network.ApiResult.Success(
                sampleKycStatusSnapshot(
                    trustStatus = KycTrustStatus.IN_PROGRESS,
                    rawStatus = KycRawStatus.CREATED,
                ),
            )
            historyResult = com.senpaij.jepang.core.network.ApiResult.Success(sampleKycHistoryResult())
        }

        val viewModel = KycViewModel(
            kycService = service,
            navigationHandler = RecordingNavigationHandler(),
        )

        viewModel.loadIfNeeded()
        advanceUntilIdle()

        assertEquals(KycTrustStatus.IN_PROGRESS, viewModel.uiState.status)
        assertEquals(1, viewModel.uiState.historyEvents.size)
    }

    @Test
    fun `journey actions update upload document and submit state`() = runTest {
        val service = FakeKycService()
        val viewModel = KycViewModel(
            kycService = service,
            navigationHandler = RecordingNavigationHandler(),
        )

        viewModel.onStartSessionClicked()
        advanceUntilIdle()
        assertNotNull(viewModel.uiState.session)

        viewModel.onRequestUploadUrlClicked()
        advanceUntilIdle()
        assertNotNull(viewModel.uiState.lastUpload)

        viewModel.onRegisterDocumentClicked()
        advanceUntilIdle()
        assertNotNull(viewModel.uiState.lastDocument)

        viewModel.onSubmitSessionClicked()
        advanceUntilIdle()
        assertEquals(KycRawStatus.SUBMITTED, viewModel.uiState.session?.status)
        assertEquals("KYC session submitted.", viewModel.uiState.successMessage)
    }

    @Test
    fun `back click triggers navigation back`() = runTest {
        val navigation = RecordingNavigationHandler()
        val viewModel = KycViewModel(
            kycService = FakeKycService(),
            navigationHandler = navigation,
        )

        viewModel.onBackClicked()

        assertEquals(listOf("back"), navigation.events)
    }
}
