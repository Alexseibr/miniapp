package com.kufarcode.app.domain.usecase

import com.kufarcode.app.domain.repository.AdsRepository

class GetTrendingAdsUseCase(private val repository: AdsRepository) {
    operator fun invoke(cityCode: String) = repository.getTrending(cityCode)
}
