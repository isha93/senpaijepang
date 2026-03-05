package com.senpaij.jepang.features.profile.presentation

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.senpaij.jepang.core.navigation.NavigationHandler
import com.senpaij.jepang.core.network.ApiResult
import com.senpaij.jepang.features.profile.domain.ProfileService
import com.senpaij.jepang.features.profile.domain.UserProfile
import com.senpaij.jepang.features.profile.domain.VerificationDocumentsBundle
import kotlinx.coroutines.launch

class ProfileViewModel(
    private val profileService: ProfileService,
    private val navigationHandler: NavigationHandler,
) : ViewModel() {
    private var initialized = false

    var uiState by mutableStateOf(ProfileUiState())
        private set

    fun loadIfNeeded() {
        if (initialized) return
        initialized = true
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            uiState = uiState.copy(
                isLoading = true,
                errorMessage = null,
                successMessage = null,
            )

            var nextProfile: UserProfile? = uiState.profile
            var nextDocuments: VerificationDocumentsBundle? = uiState.documentsState
            var nextError: String? = null

            when (val profileResult = profileService.getProfile()) {
                is ApiResult.Success -> {
                    nextProfile = profileResult.data
                }

                is ApiResult.Failure -> {
                    nextError = profileResult.error.message
                }
            }

            when (val documentsResult = profileService.getVerificationDocuments()) {
                is ApiResult.Success -> {
                    nextDocuments = documentsResult.data
                }

                is ApiResult.Failure -> {
                    if (nextError == null) {
                        nextError = documentsResult.error.message
                    }
                }
            }

            uiState = uiState.copy(
                isLoading = false,
                profile = nextProfile,
                documentsState = nextDocuments,
                editFullName = nextProfile?.fullName.orEmpty(),
                editAvatarUrl = nextProfile?.avatarUrl.orEmpty(),
                errorMessage = nextError,
            )
        }
    }

    fun onFullNameChanged(value: String) {
        uiState = uiState.copy(
            editFullName = value,
            successMessage = null,
            errorMessage = null,
        )
    }

    fun onAvatarUrlChanged(value: String) {
        uiState = uiState.copy(
            editAvatarUrl = value,
            successMessage = null,
            errorMessage = null,
        )
    }

    fun onFinalRequestNoteChanged(value: String) {
        uiState = uiState.copy(
            finalRequestNote = value,
            successMessage = null,
            errorMessage = null,
        )
    }

    fun onSaveProfileClicked() {
        if (uiState.isSavingProfile) return

        val fullName = uiState.editFullName.trim()
        if (fullName.isBlank()) {
            uiState = uiState.copy(errorMessage = "Full name is required.")
            return
        }

        viewModelScope.launch {
            uiState = uiState.copy(
                isSavingProfile = true,
                errorMessage = null,
                successMessage = null,
            )

            when (
                val result = profileService.updateProfile(
                    fullName = fullName,
                    avatarUrl = uiState.editAvatarUrl.trim().ifBlank { null },
                )
            ) {
                is ApiResult.Success -> {
                    uiState = uiState.copy(
                        isSavingProfile = false,
                        profile = result.data,
                        editFullName = result.data.fullName,
                        editAvatarUrl = result.data.avatarUrl.orEmpty(),
                        successMessage = "Profile updated.",
                    )
                }

                is ApiResult.Failure -> {
                    uiState = uiState.copy(
                        isSavingProfile = false,
                        errorMessage = result.error.message,
                    )
                }
            }
        }
    }

    fun onSubmitFinalRequestClicked() {
        if (uiState.isSubmittingFinalRequest) return

        viewModelScope.launch {
            uiState = uiState.copy(
                isSubmittingFinalRequest = true,
                errorMessage = null,
                successMessage = null,
            )

            when (
                val result = profileService.submitFinalVerificationRequest(
                    source = "android-app",
                    note = uiState.finalRequestNote.trim().ifBlank { null },
                )
            ) {
                is ApiResult.Success -> {
                    val currentProfile = uiState.profile
                    val updatedProfile = currentProfile?.copy(
                        verification = currentProfile.verification.copy(
                            sessionId = result.data.session.id,
                            sessionStatus = result.data.session.status,
                            trustStatus = result.data.session.trustStatus,
                            finalRequest = result.data.request,
                        ),
                    )

                    uiState = uiState.copy(
                        isSubmittingFinalRequest = false,
                        profile = updatedProfile,
                        documentsState = uiState.documentsState?.copy(session = result.data.session),
                        finalRequestNote = "",
                        successMessage = if (result.data.created) {
                            "Final verification request submitted."
                        } else {
                            "Final verification request already exists."
                        },
                    )
                }

                is ApiResult.Failure -> {
                    uiState = uiState.copy(
                        isSubmittingFinalRequest = false,
                        errorMessage = result.error.message,
                    )
                }
            }
        }
    }

    fun onBackClicked() {
        navigationHandler.back()
    }

    companion object {
        fun factory(
            profileService: ProfileService,
            navigationHandler: NavigationHandler,
        ): ViewModelProvider.Factory {
            return viewModelFactory {
                initializer {
                    ProfileViewModel(
                        profileService = profileService,
                        navigationHandler = navigationHandler,
                    )
                }
            }
        }
    }
}

data class ProfileUiState(
    val isLoading: Boolean = false,
    val isSavingProfile: Boolean = false,
    val isSubmittingFinalRequest: Boolean = false,
    val profile: UserProfile? = null,
    val documentsState: VerificationDocumentsBundle? = null,
    val editFullName: String = "",
    val editAvatarUrl: String = "",
    val finalRequestNote: String = "",
    val errorMessage: String? = null,
    val successMessage: String? = null,
)
