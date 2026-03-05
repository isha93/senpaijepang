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

class SavedPostsViewModel(
    private val feedService: FeedService,
    private val navigationHandler: NavigationHandler,
) : ViewModel() {
    private var initialized = false

    var uiState by mutableStateOf(SavedPostsUiState())
        private set

    fun loadIfNeeded() {
        if (initialized) return
        initialized = true
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            uiState = uiState.copy(isLoading = true, errorMessage = null)
            when (val result = feedService.listSavedPosts()) {
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

    fun onRemoveSaved(post: FeedPost) {
        viewModelScope.launch {
            val updating = uiState.updatingPostIds + post.id
            uiState = uiState.copy(updatingPostIds = updating, errorMessage = null)

            when (val result = feedService.unsavePost(post.id)) {
                is ApiResult.Success -> {
                    uiState = if (result.data) {
                        uiState.copy(
                            posts = uiState.posts.map { item ->
                                if (item.id == post.id) {
                                    item.copy(viewerState = item.viewerState.copy(saved = true))
                                } else {
                                    item
                                }
                            },
                        )
                    } else {
                        uiState.copy(
                            posts = uiState.posts.filterNot { it.id == post.id },
                        )
                    }
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
                    SavedPostsViewModel(
                        feedService = feedService,
                        navigationHandler = navigationHandler,
                    )
                }
            }
        }
    }
}

data class SavedPostsUiState(
    val isLoading: Boolean = false,
    val posts: List<FeedPost> = emptyList(),
    val updatingPostIds: Set<String> = emptySet(),
    val errorMessage: String? = null,
)
