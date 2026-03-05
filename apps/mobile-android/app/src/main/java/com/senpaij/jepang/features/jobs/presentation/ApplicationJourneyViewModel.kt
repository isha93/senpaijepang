package com.senpaij.jepang.features.jobs.presentation

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
import com.senpaij.jepang.features.jobs.domain.ApplicationJourney
import com.senpaij.jepang.features.jobs.domain.JobService
import kotlinx.coroutines.launch

class ApplicationJourneyViewModel(
    private val applicationId: String,
    private val jobService: JobService,
    private val navigationHandler: NavigationHandler,
) : ViewModel() {
    var uiState by mutableStateOf(ApplicationJourneyUiState())
        private set

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            uiState = uiState.copy(isLoading = true, errorMessage = null)

            when (val result = jobService.getApplicationJourney(applicationId = applicationId)) {
                is ApiResult.Success -> {
                    uiState = uiState.copy(
                        isLoading = false,
                        journey = result.data,
                    )
                }

                is ApiResult.Failure -> {
                    uiState = uiState.copy(
                        isLoading = false,
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
            applicationId: String,
            jobService: JobService,
            navigationHandler: NavigationHandler,
        ): ViewModelProvider.Factory {
            return viewModelFactory {
                initializer {
                    ApplicationJourneyViewModel(
                        applicationId = applicationId,
                        jobService = jobService,
                        navigationHandler = navigationHandler,
                    )
                }
            }
        }
    }
}

data class ApplicationJourneyUiState(
    val isLoading: Boolean = false,
    val journey: ApplicationJourney? = null,
    val errorMessage: String? = null,
)
