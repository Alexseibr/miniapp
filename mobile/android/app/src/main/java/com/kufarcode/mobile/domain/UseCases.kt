package com.kufarcode.mobile.domain

import com.kufarcode.mobile.data.models.Ad
import com.kufarcode.mobile.data.models.CityLayout
import com.kufarcode.mobile.data.repository.AdsRepository
import com.kufarcode.mobile.data.repository.CityRepository
import com.kufarcode.mobile.data.repository.LayoutRepository

class LoadHomeLayoutUseCase(private val layoutRepository: LayoutRepository) {
    suspend operator fun invoke(cityCode: String): CityLayout = layoutRepository.getHomeLayout(cityCode)
}

class LoadTrendingAdsUseCase(private val adsRepository: AdsRepository) {
    suspend operator fun invoke(cityCode: String): List<Ad> = adsRepository.getTrending(cityCode)
}

class LoadNearbyAdsUseCase(private val adsRepository: AdsRepository) {
    suspend operator fun invoke(lat: Double, lng: Double, radiusKm: Double): List<Ad> =
        adsRepository.getNearby(lat, lng, radiusKm)
}

class LoadSeasonAdsUseCase(private val adsRepository: AdsRepository) {
    suspend operator fun invoke(seasonCode: String): List<Ad> = adsRepository.getBySeason(seasonCode)
}

class LoadCityThemeUseCase(private val cityRepository: CityRepository) {
    suspend operator fun invoke(cityCode: String) = cityRepository.getCity(cityCode)
}
