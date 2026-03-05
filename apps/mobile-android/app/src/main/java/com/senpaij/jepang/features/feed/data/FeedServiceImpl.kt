package com.senpaij.jepang.features.feed.data

import com.senpaij.jepang.core.network.ApiClient
import com.senpaij.jepang.core.network.ApiErrorMapper
import com.senpaij.jepang.core.network.ApiResult
import com.senpaij.jepang.features.feed.domain.FeedPost
import com.senpaij.jepang.features.feed.domain.FeedService

class FeedServiceImpl(apiClient: ApiClient) : FeedService {
    private val feedApi = apiClient.create(FeedApi::class.java)

    override suspend fun listFeedPosts(query: String?, category: String?): ApiResult<List<FeedPost>> {
        return safeCall {
            feedApi.listFeedPosts(query = query, category = category).items.map { it.toDomain() }
        }
    }

    override suspend fun listSavedPosts(): ApiResult<List<FeedPost>> {
        return safeCall {
            feedApi.listSavedPosts().items.map { it.toDomain() }
        }
    }

    override suspend fun savePost(postId: String): ApiResult<Boolean> {
        return safeCall {
            feedApi.savePost(SavePostRequestDto(postId = postId)).saved
        }
    }

    override suspend fun unsavePost(postId: String): ApiResult<Boolean> {
        return safeCall {
            feedApi.unsavePost(postId = postId).saved
        }
    }

    private suspend fun <T> safeCall(block: suspend () -> T): ApiResult<T> {
        return try {
            ApiResult.Success(block())
        } catch (throwable: Throwable) {
            ApiResult.Failure(ApiErrorMapper.fromThrowable(throwable))
        }
    }
}
