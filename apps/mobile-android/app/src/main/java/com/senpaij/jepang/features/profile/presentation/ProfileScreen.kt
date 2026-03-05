package com.senpaij.jepang.features.profile.presentation

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
import com.senpaij.jepang.features.profile.domain.VerificationDocumentItem

@Composable
fun ProfileScreen(
    state: ProfileUiState,
    onRefresh: () -> Unit,
    onFullNameChanged: (String) -> Unit,
    onAvatarUrlChanged: (String) -> Unit,
    onFinalRequestNoteChanged: (String) -> Unit,
    onSaveProfileClicked: () -> Unit,
    onSubmitFinalRequestClicked: () -> Unit,
    onOpenKycClicked: () -> Unit,
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
                    text = "Profile & Verification",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
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
                    text = if (state.isLoading) "Loading profile..." else "Refresh Profile",
                    enabled = !state.isLoading,
                    onClick = onRefresh,
                )
            }

            item {
                val profile = state.profile
                if (profile == null) {
                    Text(
                        text = "Profile data not loaded yet.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = profile.email,
                            style = MaterialTheme.typography.bodyMedium,
                        )
                        Text(
                            text = "Completion: ${profile.profileCompletionPercent}%",
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Text(
                            text = "Trust Label: ${profile.trustScoreLabel}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Text(
                            text = "Verification Status: ${profile.verificationStatus}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }

            item {
                Text(
                    text = "Edit Profile",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
            }

            item {
                AppTextField(
                    value = state.editFullName,
                    onValueChange = onFullNameChanged,
                    label = "Full Name",
                )
            }

            item {
                AppTextField(
                    value = state.editAvatarUrl,
                    onValueChange = onAvatarUrlChanged,
                    label = "Avatar URL (optional)",
                )
            }

            item {
                PrimaryButton(
                    text = "Save Profile",
                    loading = state.isSavingProfile,
                    onClick = onSaveProfileClicked,
                )
            }

            item {
                val verification = state.profile?.verification
                if (verification != null) {
                    Text(
                        text = "Verification Overview",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }

            item {
                val verification = state.profile?.verification
                if (verification != null) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = "Trust Status: ${verification.trustStatus}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Text(
                            text = "Session: ${verification.sessionStatus ?: "NONE"}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Text(
                            text = "Documents Uploaded: ${verification.documentsUploaded}/${verification.requiredDocuments}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Text(
                            text = "Final Request: ${verification.finalRequest?.status ?: "NOT_SUBMITTED"}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }

            item {
                Text(
                    text = "Verification Documents",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
            }

            item {
                val summary = state.documentsState?.summary
                if (summary == null) {
                    Text(
                        text = "No verification checklist available.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                } else {
                    Text(
                        text = "Required uploaded: ${summary.uploadedRequired}/${summary.requiredTotal} • Verified: ${summary.verifiedRequired}",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }

            items(
                items = state.documentsState?.documents.orEmpty(),
                key = { "${it.documentType}-${it.documentId ?: "pending"}" },
            ) { item ->
                VerificationDocumentCard(document = item)
            }

            item {
                AppTextField(
                    value = state.finalRequestNote,
                    onValueChange = onFinalRequestNoteChanged,
                    label = "Final verification note (optional)",
                    singleLine = false,
                )
            }

            item {
                PrimaryButton(
                    text = "Submit Final Verification Request",
                    loading = state.isSubmittingFinalRequest,
                    onClick = onSubmitFinalRequestClicked,
                )
            }

            item {
                PrimaryButton(
                    text = "Open KYC Flow",
                    onClick = onOpenKycClicked,
                )
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
private fun VerificationDocumentCard(document: VerificationDocumentItem) {
    Card(
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                text = document.documentType,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = "Status: ${document.status}",
                style = MaterialTheme.typography.bodySmall,
            )
            Text(
                text = "Required: ${if (document.required) "Yes" else "No"}",
                style = MaterialTheme.typography.bodySmall,
            )
            if (!document.uploadedAt.isNullOrBlank()) {
                Text(
                    text = "Uploaded: ${document.uploadedAt}",
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}
