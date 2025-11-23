package com.kufarcode.app.data.remote.api

import com.kufarcode.app.data.remote.dto.CityDto
import retrofit2.http.GET
import retrofit2.http.Path

interface CityApi {
    @GET("/api/city/{code}")
    suspend fun getCity(@Path("code") code: String): CityDto

    @GET("/api/city")
    suspend fun getCities(): List<CityDto>
}
