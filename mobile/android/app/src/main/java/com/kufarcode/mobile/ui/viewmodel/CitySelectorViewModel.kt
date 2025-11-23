package com.kufarcode.mobile.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kufarcode.mobile.data.local.PreferenceStorage
import com.kufarcode.mobile.data.models.City
import com.kufarcode.mobile.data.repository.CityRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class CitySelectorViewModel(private val cityRepository: CityRepository) : ViewModel() {
    private val _cities = MutableStateFlow<List<City>>(emptyList())
    val cities: StateFlow<List<City>> = _cities

    var selectedCity: String
        get() = PreferenceStorage.cityCode
        set(value) { PreferenceStorage.cityCode = value }

    fun loadCities() {
        viewModelScope.launch {
            runCatching { cityRepository.getAll() }
                .onSuccess { _cities.value = it }
        }
    }
}
