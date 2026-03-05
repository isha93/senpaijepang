package com.senpaij.jepang.features.profile.presentation

import com.senpaij.jepang.core.network.ApiResult
import com.senpaij.jepang.testutil.FakeProfileService
import com.senpaij.jepang.testutil.MainDispatcherRule
import com.senpaij.jepang.testutil.RecordingNavigationHandler
import com.senpaij.jepang.testutil.sampleFinalVerificationRequestResult
import com.senpaij.jepang.testutil.sampleUserProfile
import com.senpaij.jepang.testutil.sampleVerificationDocumentsBundle
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ProfileViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `load profile and verification documents populates state`() = runTest {
        val service = FakeProfileService().apply {
            getProfileResult = ApiResult.Success(sampleUserProfile())
            verificationDocumentsResult = ApiResult.Success(sampleVerificationDocumentsBundle())
        }

        val viewModel = ProfileViewModel(
            profileService = service,
            navigationHandler = RecordingNavigationHandler(),
        )

        viewModel.loadIfNeeded()
        advanceUntilIdle()

        assertEquals("Test User", viewModel.uiState.profile?.fullName)
        assertEquals(2, viewModel.uiState.documentsState?.documents?.size)
    }

    @Test
    fun `save profile updates profile data`() = runTest {
        val service = FakeProfileService().apply {
            getProfileResult = ApiResult.Success(sampleUserProfile(fullName = "Old Name"))
            verificationDocumentsResult = ApiResult.Success(sampleVerificationDocumentsBundle())
            updateProfileResult = ApiResult.Success(sampleUserProfile(fullName = "New Name"))
        }

        val viewModel = ProfileViewModel(
            profileService = service,
            navigationHandler = RecordingNavigationHandler(),
        )

        viewModel.loadIfNeeded()
        advanceUntilIdle()
        viewModel.onFullNameChanged("New Name")
        viewModel.onSaveProfileClicked()
        advanceUntilIdle()

        assertEquals("New Name", viewModel.uiState.profile?.fullName)
        assertEquals("Profile updated.", viewModel.uiState.successMessage)
    }

    @Test
    fun `submit final verification request updates profile overview`() = runTest {
        val service = FakeProfileService().apply {
            getProfileResult = ApiResult.Success(sampleUserProfile())
            verificationDocumentsResult = ApiResult.Success(sampleVerificationDocumentsBundle())
            submitFinalRequestResult = ApiResult.Success(sampleFinalVerificationRequestResult(created = true))
        }

        val viewModel = ProfileViewModel(
            profileService = service,
            navigationHandler = RecordingNavigationHandler(),
        )

        viewModel.loadIfNeeded()
        advanceUntilIdle()
        viewModel.onFinalRequestNoteChanged("Please review quickly")
        viewModel.onSubmitFinalRequestClicked()
        advanceUntilIdle()

        assertNotNull(viewModel.uiState.profile?.verification?.finalRequest)
        assertEquals("Final verification request submitted.", viewModel.uiState.successMessage)
    }

    @Test
    fun `back click triggers navigation back`() = runTest {
        val navigation = RecordingNavigationHandler()
        val viewModel = ProfileViewModel(
            profileService = FakeProfileService(),
            navigationHandler = navigation,
        )

        viewModel.onBackClicked()

        assertEquals(listOf("back"), navigation.events)
    }
}
