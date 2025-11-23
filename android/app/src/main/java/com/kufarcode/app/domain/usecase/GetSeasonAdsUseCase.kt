package com.kufarcode.app.domain.usecase

import com.kufarcode.app.domain.repository.AdsRepository

class GetSeasonAdsUseCase(private val repository: AdsRepository) {
    operator fun invoke(seasonCode: String) = repository.getBySeason(seasonCode)
}
