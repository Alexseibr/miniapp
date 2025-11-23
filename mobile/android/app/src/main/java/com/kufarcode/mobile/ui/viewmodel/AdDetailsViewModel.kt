package com.kufarcode.mobile.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kufarcode.mobile.data.models.Ad
import com.kufarcode.mobile.data.repository.AdsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class AdDetailsViewModel(private val adsRepository: AdsRepository) : ViewModel() {
    private val _ad = MutableStateFlow<Ad?>(null)
    val ad: StateFlow<Ad?> = _ad

    fun loadAd(id: String) {
        viewModelScope.launch {
            runCatching { adsRepository.getById(id) }
                .onSuccess { _ad.value = it }
        }
    }
}
