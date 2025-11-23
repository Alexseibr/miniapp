package com.kufarcode.app.presentation.city

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun CitySelectorScreen(onCitySelected: () -> Unit, viewModel: CitySelectorViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsState()

    Column(modifier = Modifier.fillMaxSize()) {
        when {
            state.isLoading -> CircularProgressIndicator()
            state.error != null -> Column {
                Text("Ошибка: ${state.error}")
                Button(onClick = { viewModel.loadCities() }) { Text("Повторить") }
            }
            else -> state.cities.forEach { city ->
                Column(modifier = Modifier.clickable { viewModel.selectCity(city.code, onCitySelected) }) {
                    Text(city.name)
                    Text("Код: ${city.code}", fontSize = 12.sp)
                }
            }
        }
    }
}
