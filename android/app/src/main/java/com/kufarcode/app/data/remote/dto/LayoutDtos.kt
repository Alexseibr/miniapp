package com.kufarcode.app.data.remote.dto

data class CityLayoutDto(
    val cityCode: String,
    val screen: String,
    val blocks: List<LayoutBlockDto>
)

data class LayoutBlockDto(
    val id: String,
    val type: String,
    val slotId: String?,
    val title: String?,
    val categoryIds: List<String>?,
    val source: String?,
    val limit: Int?,
    val metadata: Map<String, Any?>?
)
