package com.kufarcode.app.data.local

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.preferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.kufarcode.app.domain.repository.PreferencesRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "kufar_prefs")

class PreferencesRepositoryImpl(private val context: Context) : PreferencesRepository {
    private val CITY_KEY = stringPreferencesKey("city_code")
    private val FAVORITES_KEY = stringSetPreferencesKey("favorite_ids")

    override val selectedCityCode: Flow<String?> = context.dataStore.data.map { it[CITY_KEY] }

    override val favoriteIds: Flow<Set<String>> = context.dataStore.data.map { prefs ->
        prefs[FAVORITES_KEY] ?: emptySet()
    }

    override suspend fun setSelectedCityCode(cityCode: String) {
        context.dataStore.edit { prefs ->
            prefs[CITY_KEY] = cityCode
        }
    }

    override suspend fun toggleFavorite(adId: String) {
        context.dataStore.edit { prefs ->
            val current = prefs[FAVORITES_KEY] ?: emptySet()
            prefs[FAVORITES_KEY] = if (current.contains(adId)) {
                current - adId
            } else {
                current + adId
            }
        }
    }
}
