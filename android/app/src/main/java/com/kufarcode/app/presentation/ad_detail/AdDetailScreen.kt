package com.kufarcode.app.presentation.ad_detail

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun AdDetailScreen(viewModel: AdDetailViewModel = hiltViewModel()) {
    val ad by viewModel.adState.collectAsState()

    Column(modifier = Modifier.fillMaxSize()) {
        Text(ad.title)
        ad.description?.let { Text(it) }
        ad.price?.let { Text("${ad.price} ${ad.currency}") }
    }
}
