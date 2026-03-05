package com.senpaij.jepang.features.feed.domain

import com.senpaij.jepang.core.network.ApiResult

interface FeedService {
    suspend fun listFeedPosts(query: String? = null, category: String? = null): ApiResult<List<FeedPost>>
    suspend fun listSavedPosts(): ApiResult<List<FeedPost>>
    suspend fun savePost(postId: String): ApiResult<Boolean>
    suspend fun unsavePost(postId: String): ApiResult<Boolean>
}
