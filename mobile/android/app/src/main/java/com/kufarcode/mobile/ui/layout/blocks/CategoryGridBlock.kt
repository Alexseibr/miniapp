package com.kufarcode.mobile.ui.layout.blocks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AssistChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.kufarcode.mobile.data.models.LayoutBlock

@Composable
fun CategoryGridBlock(block: LayoutBlock) {
    val categories = block.categories.orEmpty()
    Text(
        text = block.title ?: "Категории",
        style = MaterialTheme.typography.titleMedium,
        modifier = Modifier.padding(vertical = 8.dp)
    )
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        categories.forEach { category ->
            AssistChip(onClick = { /* TODO: navigate */ }, label = { Text(category.title) })
        }
    }
}
