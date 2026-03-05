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
import com.senpaij.jepang.features.auth.domain.AuthService
import com.senpaij.jepang.features.jobs.domain.JobService
import com.senpaij.jepang.features.jobs.domain.JobSummary
import kotlinx.coroutines.launch

class JobsListViewModel(
    private val authService: AuthService,
    private val jobService: JobService,
    private val navigationHandler: NavigationHandler,
) : ViewModel() {
    private var initialized = false

    var uiState by mutableStateOf(JobsListUiState())
        private set

    fun loadIfNeeded() {
        if (initialized) return
        initialized = true
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            uiState = uiState.copy(isLoading = true, errorMessage = null)
            when (val result = jobService.listJobs()) {
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

    fun onToggleSaved(job: JobSummary) {
        viewModelScope.launch {
            val updating = uiState.updatingJobIds + job.id
            uiState = uiState.copy(updatingJobIds = updating, errorMessage = null)

            val result = if (job.viewerState.saved) {
                jobService.unsaveJob(job.id)
            } else {
                jobService.saveJob(job.id)
            }

            when (result) {
                is ApiResult.Success -> {
                    val updatedJobs = uiState.jobs.map { item ->
                        if (item.id != job.id) {
                            item
                        } else {
                            item.copy(
                                viewerState = item.viewerState.copy(saved = result.data),
                            )
                        }
                    }
                    uiState = uiState.copy(jobs = updatedJobs)
                }

                is ApiResult.Failure -> {
                    uiState = uiState.copy(errorMessage = result.error.message)
                }
            }

            uiState = uiState.copy(updatingJobIds = uiState.updatingJobIds - job.id)
        }
    }

    fun onLogoutClicked() {
        if (uiState.isLoggingOut) return

        viewModelScope.launch {
            uiState = uiState.copy(isLoggingOut = true, errorMessage = null)

            when (val result = authService.logout()) {
                is ApiResult.Success -> {
                    uiState = uiState.copy(isLoggingOut = false)
                    navigationHandler.replace(AppRoute.Login)
                }

                is ApiResult.Failure -> {
                    uiState = uiState.copy(
                        isLoggingOut = false,
                        errorMessage = result.error.message,
                    )
                }
            }
        }
    }

    companion object {
        fun factory(
            authService: AuthService,
            jobService: JobService,
            navigationHandler: NavigationHandler,
        ): ViewModelProvider.Factory {
            return viewModelFactory {
                initializer {
                    JobsListViewModel(
                        authService = authService,
                        jobService = jobService,
                        navigationHandler = navigationHandler,
                    )
                }
            }
        }
    }
}

data class JobsListUiState(
    val isLoading: Boolean = false,
    val isLoggingOut: Boolean = false,
    val jobs: List<JobSummary> = emptyList(),
    val updatingJobIds: Set<String> = emptySet(),
    val errorMessage: String? = null,
)
