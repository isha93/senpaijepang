package com.senpaij.jepang.features.jobs.presentation

import androidx.compose.foundation.clickable
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
import com.senpaij.jepang.components.atoms.PrimaryButton
import com.senpaij.jepang.features.jobs.domain.JobSummary

@Composable
fun JobsListScreen(
    state: JobsListUiState,
    onRefresh: () -> Unit,
    onJobTapped: (String) -> Unit,
    onToggleSaved: (JobSummary) -> Unit,
    onApplicationsTapped: () -> Unit,
    onSavedJobsTapped: () -> Unit,
    onProfileTapped: () -> Unit,
    onLogoutTapped: () -> Unit,
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
                text = "Jobs",
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
                text = if (state.isLoading) "Loading jobs..." else "Refresh Jobs",
                enabled = !state.isLoading,
                onClick = onRefresh,
            )
            PrimaryButton(
                text = "Open Saved Jobs",
                onClick = onSavedJobsTapped,
            )
            PrimaryButton(
                text = "Open Applications",
                onClick = onApplicationsTapped,
            )
            PrimaryButton(
                text = "Open Profile",
                onClick = onProfileTapped,
            )
            PrimaryButton(
                text = "Logout",
                loading = state.isLoggingOut,
                onClick = onLogoutTapped,
            )

            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(state.jobs, key = { it.id }) { job ->
                    JobSummaryCard(
                        job = job,
                        isUpdating = state.updatingJobIds.contains(job.id),
                        onOpen = { onJobTapped(job.id) },
                        onToggleSaved = { onToggleSaved(job) },
                    )
                }
            }
        }
    }
}

@Composable
private fun JobSummaryCard(
    job: JobSummary,
    isUpdating: Boolean,
    onOpen: () -> Unit,
    onToggleSaved: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onOpen() },
    ) {
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
            Text(
                text = "${job.employmentType} • Visa: ${if (job.visaSponsorship) "Sponsored" else "Not Sponsored"}",
                style = MaterialTheme.typography.bodySmall,
            )

            PrimaryButton(
                text = if (job.viewerState.saved) "Unsave" else "Save",
                loading = isUpdating,
                onClick = onToggleSaved,
            )
        }
    }
}
