package com.senpaij.jepang.features.kyc.presentation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.senpaij.jepang.components.atoms.AppTextField
import com.senpaij.jepang.components.atoms.PrimaryButton
import com.senpaij.jepang.features.kyc.domain.KycStatusEvent

@Composable
fun KycScreen(
    state: KycUiState,
    onRefresh: () -> Unit,
    onStartSession: () -> Unit,
    onDocumentTypeChanged: (String) -> Unit,
    onFileNameChanged: (String) -> Unit,
    onContentTypeChanged: (String) -> Unit,
    onContentLengthChanged: (String) -> Unit,
    onChecksumChanged: (String) -> Unit,
    onRequestUploadUrl: () -> Unit,
    onRegisterDocument: () -> Unit,
    onSubmitSession: () -> Unit,
    onRefreshHistory: () -> Unit,
    onBack: () -> Unit,
) {
    Scaffold { innerPadding: PaddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Text(
                    text = "KYC Flow",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                )
            }

            item {
                Text(
                    text = "Status: ${state.status}",
                    style = MaterialTheme.typography.bodyMedium,
                )
            }

            item {
                if (!state.errorMessage.isNullOrBlank()) {
                    Text(
                        text = state.errorMessage,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }

            item {
                if (!state.successMessage.isNullOrBlank()) {
                    Text(
                        text = state.successMessage,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }

            item {
                PrimaryButton(
                    text = if (state.isLoading) "Loading KYC..." else "Refresh KYC",
                    enabled = !state.isLoading,
                    onClick = onRefresh,
                )
            }

            item {
                PrimaryButton(
                    text = "Start KYC Session",
                    loading = state.isStartingSession,
                    onClick = onStartSession,
                )
            }

            item {
                val session = state.session
                if (session == null) {
                    Text(
                        text = "Session: not started",
                        style = MaterialTheme.typography.bodySmall,
                    )
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            text = "Session ID: ${session.id}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Text(
                            text = "Raw Status: ${session.status}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Text(
                            text = "Provider: ${session.provider}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }

            item {
                Text(
                    text = "Upload Intent",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
            }

            item {
                AppTextField(
                    value = state.documentType,
                    onValueChange = onDocumentTypeChanged,
                    label = "Document Type",
                )
            }

            item {
                AppTextField(
                    value = state.fileName,
                    onValueChange = onFileNameChanged,
                    label = "File Name",
                )
            }

            item {
                AppTextField(
                    value = state.contentType,
                    onValueChange = onContentTypeChanged,
                    label = "Content Type",
                )
            }

            item {
                AppTextField(
                    value = state.contentLength,
                    onValueChange = onContentLengthChanged,
                    label = "Content Length",
                )
            }

            item {
                AppTextField(
                    value = state.checksumSha256,
                    onValueChange = onChecksumChanged,
                    label = "Checksum SHA256 (64 hex)",
                )
            }

            item {
                PrimaryButton(
                    text = "Request Upload URL",
                    loading = state.isRequestingUploadUrl,
                    onClick = onRequestUploadUrl,
                )
            }

            item {
                val upload = state.lastUpload
                if (upload != null) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            text = "Upload objectKey: ${upload.upload.objectKey}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Text(
                            text = "Method: ${upload.upload.method}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Text(
                            text = "Expires: ${upload.upload.expiresAt}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }

            item {
                PrimaryButton(
                    text = "Register Document Metadata",
                    loading = state.isRegisteringDocument,
                    onClick = onRegisterDocument,
                )
            }

            item {
                val document = state.lastDocument
                if (document != null) {
                    Text(
                        text = "Last Document: ${document.documentType} (${document.id})",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }

            item {
                PrimaryButton(
                    text = "Submit KYC Session",
                    loading = state.isSubmittingSession,
                    onClick = onSubmitSession,
                )
            }

            item {
                Text(
                    text = "KYC History",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
            }

            item {
                PrimaryButton(
                    text = if (state.isLoadingHistory) "Loading History..." else "Refresh History",
                    enabled = !state.isLoadingHistory,
                    onClick = onRefreshHistory,
                )
            }

            items(state.historyEvents, key = { it.id }) { event ->
                KycHistoryCard(event = event)
            }

            item {
                PrimaryButton(
                    text = "Back",
                    onClick = onBack,
                )
            }
        }
    }
}

@Composable
private fun KycHistoryCard(event: KycStatusEvent) {
    Card(
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                text = event.toStatus.toString(),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = "Actor: ${event.actorType}",
                style = MaterialTheme.typography.bodySmall,
            )
            Text(
                text = event.createdAt,
                style = MaterialTheme.typography.bodySmall,
            )
            if (!event.reason.isNullOrBlank()) {
                Text(
                    text = event.reason,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}
