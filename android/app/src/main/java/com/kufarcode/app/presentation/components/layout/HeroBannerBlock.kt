package com.kufarcode.app.presentation.components.layout

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.kufarcode.app.domain.model.LayoutBlock

@Composable
fun HeroBannerBlock(block: LayoutBlock) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(180.dp)
            .background(Color.LightGray),
        contentAlignment = Alignment.Center
    ) {
        Text(block.title ?: "Hero Banner")
    }
}
