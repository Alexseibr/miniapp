package com.kufarcode.app.domain.usecase

import com.kufarcode.app.domain.repository.PreferencesRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertTrue
import org.junit.Test

private class FakePreferencesRepository : PreferencesRepository {
    private val favorites = MutableStateFlow<Set<String>>(emptySet())
    override val selectedCityCode: Flow<String?> = MutableStateFlow(null)
    override val favoriteIds: Flow<Set<String>> = favorites

    override suspend fun setSelectedCityCode(cityCode: String) { /* no-op */ }

    override suspend fun toggleFavorite(adId: String) {
        favorites.value = if (favorites.value.contains(adId)) favorites.value - adId else favorites.value + adId
    }
}

class ToggleFavoriteUseCaseTest {
    @Test
    fun `adds id to favorites`() = runTest {
        val repo = FakePreferencesRepository()
        val useCase = ToggleFavoriteUseCase(repo)

        useCase("123")

        assertTrue(repo.favoriteIds.first().contains("123"))
    }
}
