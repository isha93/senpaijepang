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
import com.senpaij.jepang.features.jobs.domain.JobService
import com.senpaij.jepang.features.jobs.domain.JobSummary
import kotlinx.coroutines.launch

class SavedJobsViewModel(
    private val jobService: JobService,
    private val navigationHandler: NavigationHandler,
) : ViewModel() {
    private var initialized = false

    var uiState by mutableStateOf(SavedJobsUiState())
        private set

    fun loadIfNeeded() {
        if (initialized) return
        initialized = true
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            uiState = uiState.copy(isLoading = true, errorMessage = null)
            when (val result = jobService.listSavedJobs()) {
                is ApiResult.Success -> {
                    uiState = uiState.copy(
                        isLoading = false,
                        jobs = result.data,
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

    fun onRemoveSaved(job: JobSummary) {
        viewModelScope.launch {
            val updating = uiState.updatingJobIds + job.id
            uiState = uiState.copy(updatingJobIds = updating, errorMessage = null)

            when (val result = jobService.unsaveJob(job.id)) {
                is ApiResult.Success -> {
                    uiState = uiState.copy(
                        jobs = uiState.jobs.filterNot { it.id == job.id },
                    )
                }

                is ApiResult.Failure -> {
                    uiState = uiState.copy(errorMessage = result.error.message)
                }
            }

            uiState = uiState.copy(updatingJobIds = uiState.updatingJobIds - job.id)
        }
    }

    fun onBackClicked() {
        navigationHandler.back()
    }

    companion object {
        fun factory(
            jobService: JobService,
            navigationHandler: NavigationHandler,
        ): ViewModelProvider.Factory {
            return viewModelFactory {
                initializer {
                    SavedJobsViewModel(
                        jobService = jobService,
                        navigationHandler = navigationHandler,
                    )
                }
            }
        }
    }
}

data class SavedJobsUiState(
    val isLoading: Boolean = false,
    val jobs: List<JobSummary> = emptyList(),
    val updatingJobIds: Set<String> = emptySet(),
    val errorMessage: String? = null,
)
