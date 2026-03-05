package com.senpaij.jepang.features.auth.presentation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.senpaij.jepang.components.atoms.AppTextField
import com.senpaij.jepang.components.atoms.PrimaryButton

@Composable
fun RegisterScreen(
    state: RegisterUiState,
    onFullNameChanged: (String) -> Unit,
    onEmailChanged: (String) -> Unit,
    onPasswordChanged: (String) -> Unit,
    onRegisterClicked: () -> Unit,
    onBackToLoginClicked: () -> Unit,
) {
    Scaffold { innerPadding: PaddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 20.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "Create Account",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = "Register to start your Japan job journey",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            AppTextField(
                value = state.fullName,
                onValueChange = onFullNameChanged,
                label = "Full Name",
            )
            AppTextField(
                value = state.email,
                onValueChange = onEmailChanged,
                label = "Email",
            )
            AppTextField(
                value = state.password,
                onValueChange = onPasswordChanged,
                label = "Password",
                visualTransformation = PasswordVisualTransformation(),
            )

            if (!state.errorMessage.isNullOrBlank()) {
                Text(
                    text = state.errorMessage,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.error,
                )
            }

            PrimaryButton(
                text = "Register",
                loading = state.isLoading,
                onClick = onRegisterClicked,
            )
            PrimaryButton(
                text = "Back to Login",
                enabled = !state.isLoading,
                onClick = onBackToLoginClicked,
            )
        }
    }
}
