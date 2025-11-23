package com.kufarcode.app.presentation.components.layout

import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.Composable
import com.kufarcode.app.domain.model.Ad
import com.kufarcode.app.domain.model.LayoutBlock
import com.kufarcode.app.domain.model.LayoutBlockType

@Composable
fun LayoutRenderer(blocks: List<LayoutBlock>, onAdClick: (Ad) -> Unit) {
    Column {
        blocks.forEach { block ->
            when (block.type) {
                LayoutBlockType.HERO_BANNER -> HeroBannerBlock(block)
                LayoutBlockType.CATEGORY_GRID -> CategoryGridBlock(block)
                LayoutBlockType.AD_LIST -> AdListBlock(block, onAdClick)
                LayoutBlockType.PROMO_BANNER -> PromoBannerBlock(block)
                LayoutBlockType.MAP -> MapBlock(block)
            }
        }
    }
}
