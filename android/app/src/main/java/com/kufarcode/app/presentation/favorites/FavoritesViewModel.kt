package com.kufarcode.app.presentation.favorites

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kufarcode.app.domain.repository.PreferencesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn

@HiltViewModel
class FavoritesViewModel @Inject constructor(preferencesRepository: PreferencesRepository) : ViewModel() {
    val favoriteIds: StateFlow<Set<String>> = preferencesRepository.favoriteIds.stateIn(
        scope = viewModelScope,
        started = SharingStarted.Eagerly,
        initialValue = emptySet()
    )
}
