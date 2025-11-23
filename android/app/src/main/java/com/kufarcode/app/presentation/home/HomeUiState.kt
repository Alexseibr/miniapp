package com.kufarcode.app.presentation.home

import com.kufarcode.app.domain.model.Ad
import com.kufarcode.app.domain.model.LayoutBlock

data class HomeUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val layoutBlocks: List<LayoutBlock> = emptyList(),
    val trendingAds: List<Ad> = emptyList(),
    val selectedCityCode: String? = null
)
