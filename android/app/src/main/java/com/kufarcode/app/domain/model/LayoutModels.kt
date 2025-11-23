package com.kufarcode.app.domain.model

data class CityLayout(
    val cityCode: String,
    val screen: String,
    val blocks: List<LayoutBlock>
)

data class LayoutBlock(
    val id: String,
    val type: LayoutBlockType,
    val slotId: String? = null,
    val title: String? = null,
    val categoryIds: List<String> = emptyList(),
    val source: String? = null,
    val limit: Int? = null,
    val metadata: Map<String, Any?> = emptyMap()
)

enum class LayoutBlockType {
    HERO_BANNER,
    CATEGORY_GRID,
    AD_LIST,
    PROMO_BANNER,
    MAP
}
