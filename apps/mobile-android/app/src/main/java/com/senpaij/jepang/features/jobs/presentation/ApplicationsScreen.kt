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
import com.senpaij.jepang.features.jobs.domain.JobApplicationSummary

@Composable
fun ApplicationsScreen(
    state: ApplicationsUiState,
    onRefresh: () -> Unit,
    onOpenJourney: (String) -> Unit,
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
                text = "My Applications",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
            )
            if (!state.errorMessage.isNullOrBlank()) {
                Text(
                    text = state.errorMessage,
                    color = MaterialTheme.colorScheme.error,
                )
            }
            PrimaryButton(
                text = if (state.isLoading) "Loading applications..." else "Refresh Applications",
                enabled = !state.isLoading,
                onClick = onRefresh,
            )
            PrimaryButton(
                text = "Back",
                onClick = onBack,
            )

            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(state.applications, key = { it.id }) { application ->
                    ApplicationSummaryCard(
                        application = application,
                        onOpenJourney = { onOpenJourney(application.id) },
                    )
                }
            }
        }
    }
}

@Composable
private fun ApplicationSummaryCard(
    application: JobApplicationSummary,
    onOpenJourney: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onOpenJourney() },
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = application.job.title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = "Status: ${application.status}",
                style = MaterialTheme.typography.bodyMedium,
            )
            Text(
                text = "Applied at: ${application.createdAt}",
                style = MaterialTheme.typography.bodySmall,
            )
            PrimaryButton(
                text = "Open Journey",
                onClick = onOpenJourney,
            )
        }
    }
}
