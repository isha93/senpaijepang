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
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class FeedListViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `load feed posts populates state`() = runTest {
        val feedService = FakeFeedService().apply {
            feedPostsResult = ApiResult.Success(listOf(sampleFeedPost(saved = false)))
        }

        val viewModel = FeedListViewModel(
            feedService = feedService,
            navigationHandler = RecordingNavigationHandler(),
        )

        viewModel.loadIfNeeded()
        advanceUntilIdle()

        assertEquals(1, viewModel.uiState.posts.size)
        assertEquals("Cara Adaptasi Kerja di Jepang", viewModel.uiState.posts.first().title)
    }

    @Test
    fun `toggle save updates post state`() = runTest {
        val feedService = FakeFeedService().apply {
            feedPostsResult = ApiResult.Success(listOf(sampleFeedPost(saved = false)))
            savePostResult = ApiResult.Success(true)
        }

        val viewModel = FeedListViewModel(
            feedService = feedService,
            navigationHandler = RecordingNavigationHandler(),
        )

        viewModel.loadIfNeeded()
        advanceUntilIdle()
        viewModel.onToggleSaved(viewModel.uiState.posts.first())
        advanceUntilIdle()

        assertTrue(viewModel.uiState.posts.first().viewerState.saved)
    }

    @Test
    fun `back click triggers navigation back`() = runTest {
        val navigation = RecordingNavigationHandler()
        val viewModel = FeedListViewModel(
            feedService = FakeFeedService(),
            navigationHandler = navigation,
        )

        viewModel.onBackClicked()

        assertEquals(listOf("back"), navigation.events)
    }
}
