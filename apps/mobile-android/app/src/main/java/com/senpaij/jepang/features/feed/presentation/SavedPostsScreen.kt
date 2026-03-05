package com.senpaij.jepang.features.feed.presentation

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
import com.senpaij.jepang.features.feed.domain.FeedPost

@Composable
fun SavedPostsScreen(
    state: SavedPostsUiState,
    onRefresh: () -> Unit,
    onRemoveSaved: (FeedPost) -> Unit,
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
                text = "Saved Posts",
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
                text = if (state.isLoading) "Loading saved posts..." else "Refresh Saved Posts",
                enabled = !state.isLoading,
                onClick = onRefresh,
            )
            PrimaryButton(
                text = "Back",
                onClick = onBack,
            )

            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(state.posts, key = { it.id }) { post ->
                    SavedPostCard(
                        post = post,
                        isUpdating = state.updatingPostIds.contains(post.id),
                        onRemoveSaved = { onRemoveSaved(post) },
                    )
                }
            }
        }
    }
}

@Composable
private fun SavedPostCard(
    post: FeedPost,
    isUpdating: Boolean,
    onRemoveSaved: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = post.title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = "${post.category} • ${post.author}",
                style = MaterialTheme.typography.bodySmall,
            )
            Text(
                text = post.excerpt,
                style = MaterialTheme.typography.bodyMedium,
            )
            PrimaryButton(
                text = "Remove Saved",
                loading = isUpdating,
                onClick = onRemoveSaved,
            )
        }
    }
}
