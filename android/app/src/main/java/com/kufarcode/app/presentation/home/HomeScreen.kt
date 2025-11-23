package com.kufarcode.app.presentation.home

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import com.kufarcode.app.domain.model.Ad
import com.kufarcode.app.presentation.components.layout.LayoutRenderer

@Composable
fun HomeScreen(
    cityCode: String?,
    onAdClick: (Ad) -> Unit,
    onSelectCity: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(cityCode) {
        cityCode?.let { viewModel.loadHome(it) }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        when {
            state.isLoading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            state.error != null -> Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Ошибка: ${state.error}")
                Button(onClick = { cityCode?.let { viewModel.loadHome(it) } ?: onSelectCity() }) {
                    Text("Повторить")
                }
            }
            else -> Column {
                LayoutRenderer(blocks = state.layoutBlocks, onAdClick = onAdClick)
                if (state.trendingAds.isNotEmpty()) {
                    Text("Популярные объявления")
                    state.trendingAds.forEach { ad ->
                        Text(ad.title)
                    }
                }
            }
        }
    }
}
