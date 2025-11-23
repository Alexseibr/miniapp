package com.kufarcode.app.domain.usecase

import com.kufarcode.app.domain.repository.PreferencesRepository

class ToggleFavoriteUseCase(private val repository: PreferencesRepository) {
    suspend operator fun invoke(adId: String) = repository.toggleFavorite(adId)
}
