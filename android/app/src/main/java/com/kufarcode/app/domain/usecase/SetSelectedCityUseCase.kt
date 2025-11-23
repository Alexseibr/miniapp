package com.kufarcode.app.domain.usecase

import com.kufarcode.app.domain.repository.PreferencesRepository

class SetSelectedCityUseCase(private val repository: PreferencesRepository) {
    suspend operator fun invoke(cityCode: String) = repository.setSelectedCityCode(cityCode)
}
