package com.kufarcode.app.presentation.city

import com.kufarcode.app.domain.model.City

data class CitySelectorUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val cities: List<City> = emptyList()
)
