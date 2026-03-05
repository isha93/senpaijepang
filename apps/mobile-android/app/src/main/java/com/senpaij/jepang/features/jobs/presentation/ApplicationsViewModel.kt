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
import com.senpaij.jepang.features.jobs.domain.JobApplicationSummary
import com.senpaij.jepang.features.jobs.domain.JobService
import kotlinx.coroutines.launch

class ApplicationsViewModel(
    private val jobService: JobService,
    private val navigationHandler: NavigationHandler,
) : ViewModel() {
    private var initialized = false

    var uiState by mutableStateOf(ApplicationsUiState())
        private set

    fun loadIfNeeded() {
        if (initialized) return
        initialized = true
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            uiState = uiState.copy(isLoading = true, errorMessage = null)

            when (val result = jobService.listApplications()) {
                is ApiResult.Success -> {
                    uiState = uiState.copy(
                        isLoading = false,
                        applications = result.data,
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
            jobService: JobService,
            navigationHandler: NavigationHandler,
        ): ViewModelProvider.Factory {
            return viewModelFactory {
                initializer {
                    ApplicationsViewModel(
                        jobService = jobService,
                        navigationHandler = navigationHandler,
                    )
                }
            }
        }
    }
}

data class ApplicationsUiState(
    val isLoading: Boolean = false,
    val applications: List<JobApplicationSummary> = emptyList(),
    val errorMessage: String? = null,
)
