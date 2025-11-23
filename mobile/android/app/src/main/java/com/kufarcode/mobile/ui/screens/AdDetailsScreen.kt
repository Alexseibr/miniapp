package com.kufarcode.mobile.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.kufarcode.mobile.ui.viewmodel.AdDetailsViewModel

@Composable
fun AdDetailsScreen(viewModel: AdDetailsViewModel, adId: String) {
    val ad by viewModel.ad.collectAsState()

    LaunchedEffect(adId) { viewModel.loadAd(adId) }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        if (ad == null) {
            Text("Загрузка...", style = MaterialTheme.typography.bodyLarge)
        } else {
            Text(ad!!.title, style = MaterialTheme.typography.headlineSmall)
            ad!!.price?.let { Text(it, style = MaterialTheme.typography.titleMedium) }
            ad!!.description?.let { Text(it, modifier = Modifier.padding(top = 8.dp)) }
        }
    }
}
