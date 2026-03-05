package com.senpaij.jepang.features.jobs.presentation

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.senpaij.jepang.core.navigation.AppRoute
import com.senpaij.jepang.core.navigation.NavigationHandler
import com.senpaij.jepang.core.network.ApiResult
import com.senpaij.jepang.features.jobs.domain.JobDetailEnvelope
import com.senpaij.jepang.features.jobs.domain.JobService
import kotlinx.coroutines.launch

class JobDetailViewModel(
    private val jobId: String,
    private val jobService: JobService,
    private val navigationHandler: NavigationHandler,
) : ViewModel() {
    var uiState by mutableStateOf(JobDetailUiState())
        private set

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            uiState = uiState.copy(isLoading = true, errorMessage = null)

            when (val result = jobService.getJobDetail(jobId = jobId)) {
                is ApiResult.Success -> {
                    uiState = uiState.copy(
                        isLoading = false,
                        jobEnvelope = result.data,
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

    fun onToggleSaved() {
        val envelope = uiState.jobEnvelope ?: return
        if (uiState.isSaving) return

        viewModelScope.launch {
            uiState = uiState.copy(isSaving = true, errorMessage = null)

            val result = if (envelope.viewerState.saved) {
                jobService.unsaveJob(envelope.job.id)
            } else {
                jobService.saveJob(envelope.job.id)
            }

            when (result) {
                is ApiResult.Success -> {
                    uiState = uiState.copy(
                        isSaving = false,
                        jobEnvelope = envelope.copy(
                            viewerState = envelope.viewerState.copy(saved = result.data),
                        ),
                    )
                }

                is ApiResult.Failure -> {
                    uiState = uiState.copy(
                        isSaving = false,
                        errorMessage = result.error.message,
                    )
                }
            }
        }
    }

    fun onApplyClicked() {
        val envelope = uiState.jobEnvelope ?: return
        if (uiState.isApplying) return
        if (!envelope.viewerState.canApply) return

        viewModelScope.launch {
            uiState = uiState.copy(isApplying = true, errorMessage = null)

            when (val result = jobService.applyToJob(jobId = envelope.job.id)) {
                is ApiResult.Success -> {
                    uiState = uiState.copy(isApplying = false)
                    navigationHandler.navigate(AppRoute.ApplicationJourney(result.data.application.id))
                }

                is ApiResult.Failure -> {
                    uiState = uiState.copy(
                        isApplying = false,
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
            jobId: String,
            jobService: JobService,
            navigationHandler: NavigationHandler,
        ): ViewModelProvider.Factory {
            return viewModelFactory {
                initializer {
                    JobDetailViewModel(
                        jobId = jobId,
                        jobService = jobService,
                        navigationHandler = navigationHandler,
                    )
                }
            }
        }
    }
}

data class JobDetailUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val isApplying: Boolean = false,
    val jobEnvelope: JobDetailEnvelope? = null,
    val errorMessage: String? = null,
)
