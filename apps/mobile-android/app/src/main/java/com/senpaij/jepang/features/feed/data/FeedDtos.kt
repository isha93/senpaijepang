package com.senpaij.jepang.features.feed.data

import com.google.gson.annotations.SerializedName
import com.senpaij.jepang.features.feed.domain.FeedPost
import com.senpaij.jepang.features.feed.domain.FeedViewerState

data class FeedViewerStateDto(
    @SerializedName("authenticated")
    val authenticated: Boolean,
    @SerializedName("saved")
    val saved: Boolean,
)

data class FeedPostDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("title")
    val title: String,
    @SerializedName("excerpt")
    val excerpt: String,
    @SerializedName("category")
    val category: String,
    @SerializedName("author")
    val author: String,
    @SerializedName("imageUrl")
    val imageUrl: String?,
    @SerializedName("publishedAt")
    val publishedAt: String,
    @SerializedName("viewerState")
    val viewerState: FeedViewerStateDto,
)

data class FeedListResponseDto(
    @SerializedName("items")
    val items: List<FeedPostDto>,
)

data class SavePostRequestDto(
    @SerializedName("postId")
    val postId: String,
)

data class SavePostResponseDto(
    @SerializedName("saved")
    val saved: Boolean,
)

fun FeedPostDto.toDomain(): FeedPost {
    return FeedPost(
        id = id,
        title = title,
        excerpt = excerpt,
        category = category,
        author = author,
        imageUrl = imageUrl,
        publishedAt = publishedAt,
        viewerState = viewerState.toDomain(),
    )
}

private fun FeedViewerStateDto.toDomain(): FeedViewerState {
    return FeedViewerState(
        authenticated = authenticated,
        saved = saved,
    )
}
