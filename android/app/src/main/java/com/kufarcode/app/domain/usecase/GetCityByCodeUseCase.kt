package com.kufarcode.app.domain.usecase

import com.kufarcode.app.domain.repository.CityRepository

class GetCityByCodeUseCase(private val repository: CityRepository) {
    operator fun invoke(code: String) = repository.getCity(code)
}
