package com.kufarcode.app.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kufarcode.app.core.util.Result
import com.kufarcode.app.domain.repository.PreferencesRepository
import com.kufarcode.app.domain.usecase.GetHomeLayoutUseCase
import com.kufarcode.app.domain.usecase.GetTrendingAdsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val getHomeLayoutUseCase: GetHomeLayoutUseCase,
    private val getTrendingAdsUseCase: GetTrendingAdsUseCase,
    private val preferencesRepository: PreferencesRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState

    init {
        viewModelScope.launch {
            preferencesRepository.selectedCityCode.collectLatest { cityCode ->
                cityCode?.let { loadHome(it) }
            }
        }
    }

    fun loadHome(cityCode: String) {
        _uiState.update { it.copy(isLoading = true, error = null, selectedCityCode = cityCode) }
        viewModelScope.launch {
            getHomeLayoutUseCase(cityCode).collect { result ->
                when (result) {
                    is Result.Loading -> _uiState.update { it.copy(isLoading = true, error = null) }
                    is Result.Success -> _uiState.update { it.copy(isLoading = false, layoutBlocks = result.data.blocks) }
                    is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.throwable.message) }
                }
            }
        }
        viewModelScope.launch {
            getTrendingAdsUseCase(cityCode).collect { result ->
                when (result) {
                    is Result.Success -> _uiState.update { it.copy(trendingAds = result.data) }
                    is Result.Error -> _uiState.update { it.copy(error = result.throwable.message) }
                    is Result.Loading -> _uiState.update { it.copy(isLoading = true) }
                }
            }
        }
    }
}
