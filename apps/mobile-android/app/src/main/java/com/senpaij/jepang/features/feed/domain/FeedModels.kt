package com.senpaij.jepang.features.feed.domain

data class FeedViewerState(
    val authenticated: Boolean,
    val saved: Boolean,
)

data class FeedPost(
    val id: String,
    val title: String,
    val excerpt: String,
    val category: String,
    val author: String,
    val imageUrl: String?,
    val publishedAt: String,
    val viewerState: FeedViewerState,
)
