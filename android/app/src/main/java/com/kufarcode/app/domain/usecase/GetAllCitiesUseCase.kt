package com.kufarcode.app.domain.usecase

import com.kufarcode.app.domain.repository.CityRepository

class GetAllCitiesUseCase(private val repository: CityRepository) {
    operator fun invoke() = repository.getCities()
}
