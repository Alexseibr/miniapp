package com.kufarcode.mobile.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.kufarcode.mobile.ui.layout.LayoutRenderer
import com.kufarcode.mobile.ui.viewmodel.HomeUiState
import com.kufarcode.mobile.ui.viewmodel.HomeViewModel

@Composable
fun HomeScreen(viewModel: HomeViewModel) {
    val state by viewModel.state.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) { viewModel.load() }

    Scaffold(snackbarHost = { SnackbarHost(hostState = snackbarHostState) }) { padding ->
        when (state) {
            is HomeUiState.Loading -> LoadingState(modifier = Modifier.padding(padding))
            is HomeUiState.Error -> ErrorState((state as HomeUiState.Error).message, modifier = Modifier.padding(padding))
            is HomeUiState.Loaded -> {
                val data = state as HomeUiState.Loaded
                Column(modifier = Modifier.padding(padding)) {
                    LayoutRenderer(blocks = data.layout.blocks)
                    Text(
                        text = "Популярное",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )
                    LayoutRenderer(blocks = listOf(com.kufarcode.mobile.data.models.LayoutBlock(
                        id = "trending",
                        type = "ad_list",
                        title = "Популярное в городе",
                        ads = data.trending
                    )))
                }
            }
        }
    }
}

@Composable
fun LoadingState(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxSize(),
        verticalArrangement = androidx.compose.foundation.layout.Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        CircularProgressIndicator()
        Text("Загрузка...", modifier = Modifier.padding(top = 8.dp))
    }
}

@Composable
fun ErrorState(message: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxSize(),
        verticalArrangement = androidx.compose.foundation.layout.Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Ошибка: $message")
    }
}
