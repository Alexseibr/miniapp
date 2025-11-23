package com.kufarcode.app.presentation.favorites

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun FavoritesScreen(viewModel: FavoritesViewModel = hiltViewModel()) {
    val favorites by viewModel.favoriteIds.collectAsState()
    Column(modifier = Modifier.fillMaxSize()) {
        Text("Избранное (${favorites.size})")
        favorites.forEach { id -> Text("Ad: $id") }
    }
}
