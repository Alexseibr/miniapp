package com.kufarcode.mobile.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.kufarcode.mobile.data.local.PreferenceStorage

@Composable
fun FavoritesScreen() {
    val favorites = PreferenceStorage.favorites
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Избранное", style = MaterialTheme.typography.headlineSmall)
        if (favorites.isEmpty()) {
            Text("Нет избранных объявлений")
        } else {
            favorites.forEach { id ->
                Text("Объявление $id", modifier = Modifier.padding(vertical = 4.dp))
            }
        }
    }
}
