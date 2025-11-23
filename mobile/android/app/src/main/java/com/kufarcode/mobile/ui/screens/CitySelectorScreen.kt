package com.kufarcode.mobile.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Divider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.kufarcode.mobile.ui.viewmodel.CitySelectorViewModel

@Composable
fun CitySelectorScreen(viewModel: CitySelectorViewModel, onCitySelected: () -> Unit) {
    val cities by viewModel.cities.collectAsState()

    LaunchedEffect(Unit) { viewModel.loadCities() }

    Column(modifier = Modifier.padding(16.dp)) {
        Text("Выберите город", style = MaterialTheme.typography.headlineSmall)
        cities.forEach { city ->
            Column(modifier = Modifier
                .fillMaxWidth()
                .clickable {
                    viewModel.selectedCity = city.code
                    onCitySelected()
                }
                .padding(vertical = 12.dp)) {
                Text(city.name, style = MaterialTheme.typography.titleMedium)
                Divider()
            }
        }
    }
}
