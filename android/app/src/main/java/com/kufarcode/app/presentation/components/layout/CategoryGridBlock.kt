package com.kufarcode.app.presentation.components.layout

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Card
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.kufarcode.app.domain.model.LayoutBlock

@Composable
fun CategoryGridBlock(block: LayoutBlock) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(block.title ?: "Категории")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            block.categoryIds.forEach { category ->
                Card { Text(category) }
            }
        }
    }
}
