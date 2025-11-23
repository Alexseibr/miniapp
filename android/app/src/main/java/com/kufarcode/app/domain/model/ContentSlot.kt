package com.kufarcode.app.domain.model

data class ContentSlot(
    val id: String,
    val title: String?,
    val imageUrl: String?,
    val actionUrl: String?,
    val payload: Map<String, Any?> = emptyMap()
)
