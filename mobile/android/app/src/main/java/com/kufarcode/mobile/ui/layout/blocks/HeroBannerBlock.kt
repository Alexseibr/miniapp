package com.kufarcode.mobile.ui.layout.blocks

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.kufarcode.mobile.data.models.LayoutBlock

@Composable
fun HeroBannerBlock(block: LayoutBlock) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(160.dp)
            .padding(vertical = 8.dp)
            .background(MaterialTheme.colorScheme.primary, RoundedCornerShape(16.dp))
    ) {
        Text(
            text = block.title ?: "",
            style = MaterialTheme.typography.headlineSmall,
            color = Color.White,
            modifier = Modifier.padding(16.dp)
        )
    }
}
