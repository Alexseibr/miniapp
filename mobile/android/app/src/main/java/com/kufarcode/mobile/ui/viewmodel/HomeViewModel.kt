package com.kufarcode.mobile.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kufarcode.mobile.data.local.PreferenceStorage
import com.kufarcode.mobile.data.models.Ad
import com.kufarcode.mobile.data.models.CityLayout
import com.kufarcode.mobile.domain.LoadHomeLayoutUseCase
import com.kufarcode.mobile.domain.LoadTrendingAdsUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed interface HomeUiState {
    data object Loading : HomeUiState
    data class Loaded(val layout: CityLayout, val trending: List<Ad>) : HomeUiState
    data class Error(val message: String) : HomeUiState
}

class HomeViewModel(
    private val loadHomeLayout: LoadHomeLayoutUseCase,
    private val loadTrendingAds: LoadTrendingAdsUseCase
) : ViewModel() {

    private val _state = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val state: StateFlow<HomeUiState> = _state

    fun load() {
        val cityCode = PreferenceStorage.cityCode
        viewModelScope.launch {
            _state.value = HomeUiState.Loading
            runCatching {
                val layout = loadHomeLayout(cityCode)
                val trending = loadTrendingAds(cityCode)
                HomeUiState.Loaded(layout, trending)
            }.onSuccess { _state.value = it }
                .onFailure { _state.value = HomeUiState.Error(it.message ?: "Ошибка загрузки") }
        }
    }
}
