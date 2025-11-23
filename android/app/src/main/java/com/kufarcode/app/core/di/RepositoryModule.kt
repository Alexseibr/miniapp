package com.kufarcode.app.core.di

import android.content.Context
import com.kufarcode.app.data.local.PreferencesRepositoryImpl
import com.kufarcode.app.data.remote.api.AdsApi
import com.kufarcode.app.data.remote.api.CityApi
import com.kufarcode.app.data.remote.api.ContentApi
import com.kufarcode.app.data.remote.api.LayoutApi
import com.kufarcode.app.data.repository.AdsRepositoryImpl
import com.kufarcode.app.data.repository.CityRepositoryImpl
import com.kufarcode.app.data.repository.ContentRepositoryImpl
import com.kufarcode.app.data.repository.LayoutRepositoryImpl
import com.kufarcode.app.domain.repository.AdsRepository
import com.kufarcode.app.domain.repository.CityRepository
import com.kufarcode.app.domain.repository.ContentRepository
import com.kufarcode.app.domain.repository.LayoutRepository
import com.kufarcode.app.domain.repository.PreferencesRepository
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    abstract fun bindLayoutRepository(impl: LayoutRepositoryImpl): LayoutRepository

    @Binds
    abstract fun bindAdsRepository(impl: AdsRepositoryImpl): AdsRepository

    @Binds
    abstract fun bindCityRepository(impl: CityRepositoryImpl): CityRepository

    @Binds
    abstract fun bindContentRepository(impl: ContentRepositoryImpl): ContentRepository

    companion object {
        @Provides
        @Singleton
        fun providePreferencesRepository(@ApplicationContext context: Context): PreferencesRepository =
            PreferencesRepositoryImpl(context)
    }
}
