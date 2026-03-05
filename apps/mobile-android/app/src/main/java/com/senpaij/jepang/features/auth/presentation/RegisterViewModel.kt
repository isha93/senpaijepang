package com.senpaij.jepang.features.auth.presentation

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
import com.senpaij.jepang.features.auth.domain.RegisterInput
import kotlinx.coroutines.launch

class RegisterViewModel(
    private val authService: AuthService,
    private val navigationHandler: NavigationHandler,
) : ViewModel() {
    var uiState by mutableStateOf(RegisterUiState())
        private set

    fun onFullNameChanged(value: String) {
        uiState = uiState.copy(fullName = value, errorMessage = null)
    }

    fun onEmailChanged(value: String) {
        uiState = uiState.copy(email = value, errorMessage = null)
    }

    fun onPasswordChanged(value: String) {
        uiState = uiState.copy(password = value, errorMessage = null)
    }

    fun onRegisterClicked() {
        if (uiState.isLoading) return

        val fullName = uiState.fullName.trim()
        val email = uiState.email.trim()
        val password = uiState.password

        if (fullName.length < 2) {
            uiState = uiState.copy(errorMessage = "Full name must be at least 2 characters")
            return
        }
        if (email.isBlank() || !email.contains('@')) {
            uiState = uiState.copy(errorMessage = "Valid email is required")
            return
        }
        if (password.length < 8) {
            uiState = uiState.copy(errorMessage = "Password must be at least 8 characters")
            return
        }

        viewModelScope.launch {
            uiState = uiState.copy(isLoading = true, errorMessage = null)

            when (
                val result = authService.register(
                    input = RegisterInput(
                        fullName = fullName,
                        email = email,
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

    fun onBackToLoginClicked() {
        navigationHandler.back()
    }

    companion object {
        fun factory(
            authService: AuthService,
            navigationHandler: NavigationHandler,
        ): ViewModelProvider.Factory {
            return viewModelFactory {
                initializer {
                    RegisterViewModel(
                        authService = authService,
                        navigationHandler = navigationHandler,
                    )
                }
            }
        }
    }
}

data class RegisterUiState(
    val fullName: String = "",
    val email: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
)
