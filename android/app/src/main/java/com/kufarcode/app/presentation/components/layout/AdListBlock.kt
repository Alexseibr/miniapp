package com.kufarcode.app.presentation.components.layout

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Card
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.kufarcode.app.domain.model.Ad
import com.kufarcode.app.domain.model.LayoutBlock

@Composable
fun AdListBlock(block: LayoutBlock, onAdClick: (Ad) -> Unit, ads: List<Ad>? = null) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(block.title ?: "Популярные объявления")
        (ads ?: emptyList()).forEach { ad ->
            Card(modifier = Modifier
                .fillMaxWidth()
                .clickable { onAdClick(ad) }) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text(ad.title)
                    ad.price?.let { Text("$it ${ad.currency ?: ""}") }
                }
            }
        }
        if (ads.isNullOrEmpty()) {
            Text("Загрузка объявлений...")
        }
    }
}
