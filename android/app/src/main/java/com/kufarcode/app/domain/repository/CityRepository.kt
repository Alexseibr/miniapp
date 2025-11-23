package com.kufarcode.app.domain.repository

import com.kufarcode.app.core.util.Result
import com.kufarcode.app.domain.model.City
import kotlinx.coroutines.flow.Flow

interface CityRepository {
    fun getCity(code: String): Flow<Result<City>>
    fun getCities(): Flow<Result<List<City>>>
}
