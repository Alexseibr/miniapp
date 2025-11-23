package com.kufarcode.app.presentation.city

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kufarcode.app.core.util.Result
import com.kufarcode.app.domain.usecase.GetAllCitiesUseCase
import com.kufarcode.app.domain.usecase.SetSelectedCityUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

@HiltViewModel
class CitySelectorViewModel @Inject constructor(
    private val getAllCitiesUseCase: GetAllCitiesUseCase,
    private val setSelectedCityUseCase: SetSelectedCityUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(CitySelectorUiState())
    val uiState: StateFlow<CitySelectorUiState> = _uiState

    init {
        loadCities()
    }

    fun loadCities() {
        viewModelScope.launch {
            getAllCitiesUseCase().collect { result ->
                when (result) {
                    is Result.Loading -> _uiState.update { it.copy(isLoading = true, error = null) }
                    is Result.Success -> _uiState.update { it.copy(isLoading = false, cities = result.data) }
                    is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.throwable.message) }
                }
            }
        }
    }

    fun selectCity(cityCode: String, onSelected: () -> Unit) {
        viewModelScope.launch {
            setSelectedCityUseCase(cityCode)
            onSelected()
        }
    }
}
