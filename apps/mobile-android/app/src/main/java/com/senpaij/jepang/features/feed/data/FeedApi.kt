package com.senpaij.jepang.features.feed.data

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface FeedApi {
    @GET("feed/posts")
    suspend fun listFeedPosts(
        @Query("q") query: String?,
        @Query("category") category: String?,
        @Query("limit") limit: Int? = 20,
    ): FeedListResponseDto

    @GET("users/me/saved-posts")
    suspend fun listSavedPosts(@Query("limit") limit: Int? = 20): FeedListResponseDto

    @POST("users/me/saved-posts")
    suspend fun savePost(@Body request: SavePostRequestDto): SavePostResponseDto

    @DELETE("users/me/saved-posts/{postId}")
    suspend fun unsavePost(@Path("postId") postId: String): SavePostResponseDto
}
