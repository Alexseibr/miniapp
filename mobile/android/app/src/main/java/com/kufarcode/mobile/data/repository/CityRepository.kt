package com.kufarcode.mobile.data.repository

import com.kufarcode.mobile.data.api.CityApi
import com.kufarcode.mobile.data.models.City

class CityRepository(private val api: CityApi) {
    suspend fun getCity(code: String): City = api.getCity(code)
    suspend fun getAll(): List<City> = api.getAll()
}
