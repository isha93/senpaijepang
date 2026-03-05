package com.senpaij.jepang.features.auth.presentation

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.lifecycle.viewModelScope
import com.senpaij.jepang.core.navigation.AppRoute
import com.senpaij.jepang.core.navigation.NavigationHandler
import com.senpaij.jepang.core.network.ApiResult
import com.senpaij.jepang.features.auth.domain.AuthService
import com.senpaij.jepang.features.auth.domain.LoginInput
import kotlinx.coroutines.launch

class LoginViewModel(
    private val authService: AuthService,
    private val navigationHandler: NavigationHandler,
) : ViewModel() {
    var uiState by mutableStateOf(LoginUiState())
        private set

    fun onIdentifierChanged(value: String) {
        uiState = uiState.copy(identifier = value, errorMessage = null)
    }

    fun onPasswordChanged(value: String) {
        uiState = uiState.copy(password = value, errorMessage = null)
    }

    fun onLoginClicked() {
        if (uiState.isLoading) return

        val identifier = uiState.identifier.trim()
        val password = uiState.password

        if (identifier.isBlank() || password.isBlank()) {
            uiState = uiState.copy(errorMessage = "Email and password are required")
            return
        }

        viewModelScope.launch {
            uiState = uiState.copy(isLoading = true, errorMessage = null)

            when (
                val result = authService.login(
                    input = LoginInput(
                        identifier = identifier,
                        password = password,
                    ),
                )
            ) {
                is ApiResult.Success -> {
                    uiState = uiState.copy(isLoading = false)
                    navigationHandler.replace(AppRoute.JobsList)
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

    fun onRegisterClicked() {
        navigationHandler.navigate(AppRoute.Register)
    }

    companion object {
        fun factory(
            authService: AuthService,
            navigationHandler: NavigationHandler,
        ): ViewModelProvider.Factory {
            return viewModelFactory {
                initializer {
                    LoginViewModel(
                        authService = authService,
                        navigationHandler = navigationHandler,
                    )
                }
            }
        }
    }
}

data class LoginUiState(
    val identifier: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
)
