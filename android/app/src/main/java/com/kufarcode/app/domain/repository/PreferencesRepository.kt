package com.kufarcode.app.domain.repository

import kotlinx.coroutines.flow.Flow

interface PreferencesRepository {
    val selectedCityCode: Flow<String?>
    val favoriteIds: Flow<Set<String>>

    suspend fun setSelectedCityCode(cityCode: String)
    suspend fun toggleFavorite(adId: String)
}
