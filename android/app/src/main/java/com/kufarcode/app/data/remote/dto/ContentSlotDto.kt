package com.kufarcode.app.data.remote.dto

data class ContentSlotDto(
    val id: String,
    val title: String?,
    val imageUrl: String?,
    val actionUrl: String?,
    val payload: Map<String, Any?>?
)
