package com.kufarcode.app.domain.usecase

import com.kufarcode.app.domain.repository.AdsRepository

class GetNearbyAdsUseCase(private val repository: AdsRepository) {
    operator fun invoke(lat: Double, lng: Double, radiusKm: Double, categoryId: String? = null) =
        repository.getNearby(lat, lng, radiusKm, categoryId)
}
