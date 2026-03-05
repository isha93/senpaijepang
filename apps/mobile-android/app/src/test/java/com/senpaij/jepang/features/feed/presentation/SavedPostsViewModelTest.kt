package com.senpaij.jepang.features.feed.presentation

import com.senpaij.jepang.core.network.ApiResult
import com.senpaij.jepang.testutil.FakeFeedService
import com.senpaij.jepang.testutil.MainDispatcherRule
import com.senpaij.jepang.testutil.RecordingNavigationHandler
import com.senpaij.jepang.testutil.sampleFeedPost
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SavedPostsViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `load saved posts populates state`() = runTest {
        val feedService = FakeFeedService().apply {
            savedPostsResult = ApiResult.Success(listOf(sampleFeedPost(saved = true)))
        }

        val viewModel = SavedPostsViewModel(
            feedService = feedService,
            navigationHandler = RecordingNavigationHandler(),
        )

        viewModel.loadIfNeeded()
        advanceUntilIdle()

        assertEquals(1, viewModel.uiState.posts.size)
        assertEquals(true, viewModel.uiState.posts.first().viewerState.saved)
    }

    @Test
    fun `remove saved post removes item when response is unsaved`() = runTest {
        val feedService = FakeFeedService().apply {
            savedPostsResult = ApiResult.Success(listOf(sampleFeedPost(saved = true)))
            unsavePostResult = ApiResult.Success(false)
        }

        val viewModel = SavedPostsViewModel(
            feedService = feedService,
            navigationHandler = RecordingNavigationHandler(),
        )

        viewModel.loadIfNeeded()
        advanceUntilIdle()
        viewModel.onRemoveSaved(viewModel.uiState.posts.first())
        advanceUntilIdle()

        assertEquals(0, viewModel.uiState.posts.size)
    }

    @Test
    fun `back click triggers navigation back`() = runTest {
        val navigation = RecordingNavigationHandler()
        val viewModel = SavedPostsViewModel(
            feedService = FakeFeedService(),
            navigationHandler = navigation,
        )

        viewModel.onBackClicked()

        assertEquals(listOf("back"), navigation.events)
    }
}
