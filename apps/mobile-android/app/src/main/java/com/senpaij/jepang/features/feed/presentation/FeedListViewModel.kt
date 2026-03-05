package com.senpaij.jepang.features.feed.presentation

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.senpaij.jepang.core.navigation.NavigationHandler
import com.senpaij.jepang.core.network.ApiResult
import com.senpaij.jepang.features.feed.domain.FeedPost
import com.senpaij.jepang.features.feed.domain.FeedService
import kotlinx.coroutines.launch

class FeedListViewModel(
    private val feedService: FeedService,
    private val navigationHandler: NavigationHandler,
) : ViewModel() {
    private var initialized = false

    var uiState by mutableStateOf(FeedListUiState())
        private set

    fun loadIfNeeded() {
        if (initialized) return
        initialized = true
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            uiState = uiState.copy(isLoading = true, errorMessage = null)
            when (val result = feedService.listFeedPosts()) {
                is ApiResult.Success -> {
                    uiState = uiState.copy(
                        isLoading = false,
                        posts = result.data,
                    )
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

    fun onToggleSaved(post: FeedPost) {
        viewModelScope.launch {
            val updating = uiState.updatingPostIds + post.id
            uiState = uiState.copy(updatingPostIds = updating, errorMessage = null)

            val result = if (post.viewerState.saved) {
                feedService.unsavePost(post.id)
            } else {
                feedService.savePost(post.id)
            }

            when (result) {
                is ApiResult.Success -> {
                    val updatedPosts = uiState.posts.map { item ->
                        if (item.id != post.id) {
                            item
                        } else {
                            item.copy(
                                viewerState = item.viewerState.copy(saved = result.data),
                            )
                        }
                    }
                    uiState = uiState.copy(posts = updatedPosts)
                }

                is ApiResult.Failure -> {
                    uiState = uiState.copy(errorMessage = result.error.message)
                }
            }

            uiState = uiState.copy(updatingPostIds = uiState.updatingPostIds - post.id)
        }
    }

    fun onBackClicked() {
        navigationHandler.back()
    }

    companion object {
        fun factory(
            feedService: FeedService,
            navigationHandler: NavigationHandler,
        ): ViewModelProvider.Factory {
            return viewModelFactory {
                initializer {
                    FeedListViewModel(
                        feedService = feedService,
                        navigationHandler = navigationHandler,
                    )
                }
            }
        }
    }
}

data class FeedListUiState(
    val isLoading: Boolean = false,
    val posts: List<FeedPost> = emptyList(),
    val updatingPostIds: Set<String> = emptySet(),
    val errorMessage: String? = null,
)
