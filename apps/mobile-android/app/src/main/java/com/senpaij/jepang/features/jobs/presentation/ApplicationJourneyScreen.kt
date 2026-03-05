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

@Composable
fun ApplicationJourneyScreen(
    state: ApplicationJourneyUiState,
    onRefresh: () -> Unit,
    onBack: () -> Unit,
) {
    Scaffold { innerPadding: PaddingValues ->
        if (state.isLoading && state.journey == null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text("Loading journey...")
                PrimaryButton(text = "Back", onClick = onBack)
            }
            return@Scaffold
        }

        val journey = state.journey
        if (journey == null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(state.errorMessage ?: "Journey unavailable", color = MaterialTheme.colorScheme.error)
                PrimaryButton(text = "Refresh", onClick = onRefresh)
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
                    text = "Application Journey",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                )
            }
            item {
                Text(
                    text = journey.application.job.title,
                    style = MaterialTheme.typography.titleMedium,
                )
            }
            item {
                Text(
                    text = "Current status: ${journey.application.status}",
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
            if (!state.errorMessage.isNullOrBlank()) {
                item {
                    Text(state.errorMessage, color = MaterialTheme.colorScheme.error)
                }
            }
            items(journey.journey, key = { it.id }) { event ->
                Card {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Text(
                            text = event.title,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            text = event.description,
                            style = MaterialTheme.typography.bodyMedium,
                        )
                        Text(
                            text = "${event.status} • ${event.createdAt}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }
            item {
                PrimaryButton(text = "Refresh", onClick = onRefresh)
            }
            item {
                PrimaryButton(text = "Back", onClick = onBack)
            }
        }
    }
}
