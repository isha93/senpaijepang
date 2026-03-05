package com.senpaij.jepang.features.jobs.presentation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
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
import com.senpaij.jepang.components.atoms.PrimaryButton
import com.senpaij.jepang.features.jobs.domain.JobSummary

@Composable
fun SavedJobsScreen(
    state: SavedJobsUiState,
    onRefresh: () -> Unit,
    onOpenJob: (String) -> Unit,
    onRemoveSaved: (JobSummary) -> Unit,
    onBack: () -> Unit,
) {
    Scaffold { innerPadding: PaddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "Saved Jobs",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
            )
            if (!state.errorMessage.isNullOrBlank()) {
                Text(
                    text = state.errorMessage,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.error,
                )
            }

            PrimaryButton(
                text = if (state.isLoading) "Loading saved jobs..." else "Refresh Saved Jobs",
                enabled = !state.isLoading,
                onClick = onRefresh,
            )
            PrimaryButton(
                text = "Back",
                onClick = onBack,
            )

            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(state.jobs, key = { it.id }) { job ->
                    SavedJobCard(
                        job = job,
                        isUpdating = state.updatingJobIds.contains(job.id),
                        onOpenJob = { onOpenJob(job.id) },
                        onRemoveSaved = { onRemoveSaved(job) },
                    )
                }
            }
        }
    }
}

@Composable
private fun SavedJobCard(
    job: JobSummary,
    isUpdating: Boolean,
    onOpenJob: () -> Unit,
    onRemoveSaved: () -> Unit,
) {
    Card {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = job.title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = "${job.employer.name} - ${job.location.displayLabel}",
                style = MaterialTheme.typography.bodyMedium,
            )
            PrimaryButton(
                text = "Open Detail",
                onClick = onOpenJob,
            )
            PrimaryButton(
                text = "Remove from Saved",
                loading = isUpdating,
                onClick = onRemoveSaved,
            )
        }
    }
}
