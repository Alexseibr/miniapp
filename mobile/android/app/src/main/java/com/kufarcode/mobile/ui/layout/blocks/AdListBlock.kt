package com.kufarcode.mobile.ui.layout.blocks

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.kufarcode.mobile.data.models.Ad
import com.kufarcode.mobile.data.models.LayoutBlock

@Composable
fun AdListBlock(block: LayoutBlock) {
    val ads = block.ads.orEmpty()
    Column(modifier = Modifier.padding(vertical = 8.dp)) {
        Text(block.title ?: "Популярное", style = MaterialTheme.typography.titleMedium)
        LazyRow {
            items(ads) { ad ->
                AdCard(ad)
            }
        }
    }
}

@Composable
private fun AdCard(ad: Ad) {
    Card(modifier = Modifier
        .padding(8.dp)
        .fillMaxWidth(0.8f)) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(ad.title, style = MaterialTheme.typography.titleMedium)
            if (ad.price != null) {
                Text(ad.price, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}
