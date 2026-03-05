package com.senpaij.jepang.features.jobs.presentation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.senpaij.jepang.components.atoms.PrimaryButton

@Composable
fun JobDetailScreen(
    state: JobDetailUiState,
    onToggleSaved: () -> Unit,
    onApply: () -> Unit,
    onBack: () -> Unit,
) {
    Scaffold { innerPadding: PaddingValues ->
        if (state.isLoading && state.jobEnvelope == null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text("Loading job detail...")
                PrimaryButton(text = "Back", onClick = onBack)
            }
            return@Scaffold
        }

        val envelope = state.jobEnvelope
        if (envelope == null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    text = state.errorMessage ?: "Job detail unavailable",
                    color = MaterialTheme.colorScheme.error,
                )
                PrimaryButton(text = "Back", onClick = onBack)
            }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item {
                Text(
                    text = envelope.job.title,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                )
            }
            item {
                Text(
                    text = "${envelope.job.employer.name} - ${envelope.job.location.displayLabel}",
                    style = MaterialTheme.typography.bodyLarge,
                )
            }
            item {
                Text(
                    text = envelope.job.description,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
            item {
                Text(
                    text = "Requirements",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
            }
            items(envelope.job.requirements) { requirement ->
                Text(
                    text = "• $requirement",
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
                PrimaryButton(
                    text = if (envelope.viewerState.saved) "Unsave Job" else "Save Job",
                    loading = state.isSaving,
                    onClick = onToggleSaved,
                )
            }
            item {
                PrimaryButton(
                    text = envelope.viewerState.applyCta.replace('_', ' '),
                    loading = state.isApplying,
                    enabled = envelope.viewerState.canApply,
                    onClick = onApply,
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
