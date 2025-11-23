package com.kufarcode.app.presentation.ad_detail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import com.kufarcode.app.domain.model.Ad
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

@HiltViewModel
class AdDetailViewModel @Inject constructor(savedStateHandle: SavedStateHandle) : ViewModel() {
    private val _adState = MutableStateFlow(
        Ad(
            id = savedStateHandle.get<String>("adId") ?: "",
            title = "Загрузка...",
            description = null,
            price = null,
            currency = null,
            cityCode = null,
            imageUrl = null,
            latitude = null,
            longitude = null,
            seasonCode = null
        )
    )
    val adState: StateFlow<Ad> = _adState
}
