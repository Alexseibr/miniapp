package com.kufarcode.app.core.di

import com.kufarcode.app.domain.repository.AdsRepository
import com.kufarcode.app.domain.repository.CityRepository
import com.kufarcode.app.domain.repository.ContentRepository
import com.kufarcode.app.domain.repository.LayoutRepository
import com.kufarcode.app.domain.repository.PreferencesRepository
import com.kufarcode.app.domain.usecase.GetAllCitiesUseCase
import com.kufarcode.app.domain.usecase.GetCityByCodeUseCase
import com.kufarcode.app.domain.usecase.GetContentSlotUseCase
import com.kufarcode.app.domain.usecase.GetHomeLayoutUseCase
import com.kufarcode.app.domain.usecase.GetNearbyAdsUseCase
import com.kufarcode.app.domain.usecase.GetSeasonAdsUseCase
import com.kufarcode.app.domain.usecase.GetTrendingAdsUseCase
import com.kufarcode.app.domain.usecase.SetSelectedCityUseCase
import com.kufarcode.app.domain.usecase.ToggleFavoriteUseCase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@Module
@InstallIn(SingletonComponent::class)
object UseCaseModule {

    @Provides
    fun provideGetHomeLayoutUseCase(repository: LayoutRepository) = GetHomeLayoutUseCase(repository)

    @Provides
    fun provideGetTrendingAdsUseCase(repository: AdsRepository) = GetTrendingAdsUseCase(repository)

    @Provides
    fun provideGetNearbyAdsUseCase(repository: AdsRepository) = GetNearbyAdsUseCase(repository)

    @Provides
    fun provideGetSeasonAdsUseCase(repository: AdsRepository) = GetSeasonAdsUseCase(repository)

    @Provides
    fun provideGetCityByCodeUseCase(repository: CityRepository) = GetCityByCodeUseCase(repository)

    @Provides
    fun provideGetAllCitiesUseCase(repository: CityRepository) = GetAllCitiesUseCase(repository)

    @Provides
    fun provideGetContentSlotUseCase(repository: ContentRepository) = GetContentSlotUseCase(repository)

    @Provides
    fun provideSetSelectedCityUseCase(repository: PreferencesRepository) = SetSelectedCityUseCase(repository)

    @Provides
    fun provideToggleFavoriteUseCase(repository: PreferencesRepository) = ToggleFavoriteUseCase(repository)
}
