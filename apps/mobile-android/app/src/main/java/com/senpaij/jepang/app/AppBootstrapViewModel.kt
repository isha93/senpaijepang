package com.senpaij.jepang.app

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
import kotlinx.coroutines.launch

class AppBootstrapViewModel(
    private val authService: AuthService,
    private val navigationHandler: NavigationHandler,
) : ViewModel() {
    private var started = false

    var uiState by mutableStateOf(AppBootstrapUiState())
        private set

    fun bootstrapIfNeeded() {
        if (started) return
        started = true

        viewModelScope.launch {
            uiState = uiState.copy(isLoading = true)

            if (!authService.hasSession()) {
                uiState = uiState.copy(isLoading = false)
                navigationHandler.replace(AppRoute.Login)
                return@launch
            }

            when (authService.refreshSession()) {
                is ApiResult.Success -> {
                    when (authService.me()) {
                        is ApiResult.Success -> {
                            uiState = uiState.copy(isLoading = false)
                            navigationHandler.replace(AppRoute.JobsList)
                        }

                        is ApiResult.Failure -> {
                            authService.logout()
                            uiState = uiState.copy(isLoading = false)
                            navigationHandler.replace(AppRoute.Login)
                        }
                    }
                }

                is ApiResult.Failure -> {
                    authService.logout()
                    uiState = uiState.copy(isLoading = false)
                    navigationHandler.replace(AppRoute.Login)
                }
            }
        }
    }

    companion object {
        fun factory(
            authService: AuthService,
            navigationHandler: NavigationHandler,
        ): ViewModelProvider.Factory {
            return viewModelFactory {
                initializer {
                    AppBootstrapViewModel(
                        authService = authService,
                        navigationHandler = navigationHandler,
                    )
                }
            }
        }
    }
}

data class AppBootstrapUiState(
    val isLoading: Boolean = true,
)
