package com.kufarcode.mobile.data.models

data class CityLayout(
    val screen: String,
    val blocks: List<LayoutBlock>
)

data class LayoutBlock(
    val id: String,
    val type: String,
    val title: String? = null,
    val subtitle: String? = null,
    val contentSlotId: String? = null,
    val ads: List<Ad>? = null,
    val categories: List<Category>? = null
)

data class Category(
    val id: String,
    val title: String,
    val iconUrl: String?
)
