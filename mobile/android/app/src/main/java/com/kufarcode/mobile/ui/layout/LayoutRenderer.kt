package com.kufarcode.mobile.ui.layout

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.kufarcode.mobile.data.models.LayoutBlock
import com.kufarcode.mobile.ui.layout.blocks.AdListBlock
import com.kufarcode.mobile.ui.layout.blocks.CategoryGridBlock
import com.kufarcode.mobile.ui.layout.blocks.HeroBannerBlock
import com.kufarcode.mobile.ui.layout.blocks.MapBlock
import com.kufarcode.mobile.ui.layout.blocks.PromoBannerBlock

@Composable
fun LayoutRenderer(blocks: List<LayoutBlock>) {
    Column(modifier = Modifier.padding(16.dp)) {
        blocks.forEach { block ->
            when (block.type) {
                "hero_banner" -> HeroBannerBlock(block)
                "category_grid" -> CategoryGridBlock(block)
                "ad_list" -> AdListBlock(block)
                "banner" -> PromoBannerBlock(block)
                "map" -> MapBlock(block)
                else -> UnknownBlock(block.type)
            }
        }
    }
}

@Composable
fun UnknownBlock(type: String) {
    Card(modifier = Modifier
        .fillMaxWidth()
        .padding(vertical = 8.dp)) {
        Text(
            text = "Неподдерживаемый блок: $type",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(12.dp)
        )
    }
}
